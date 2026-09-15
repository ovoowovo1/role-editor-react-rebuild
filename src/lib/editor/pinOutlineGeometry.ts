import type { PinOutlineMaterial, PinOutlinePoint, PinOutlineSegment, PinOutlineSegmentType } from '../../types/pinOutline';

export interface Point {
  x: number;
  y: number;
}

export interface Bounds {
  halfWidth: number;
  halfHeight: number;
  rotation?: number;
}

export interface PinOutlinePlacement {
  materialId: string;
  assetId: string;
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  /** Arc-length position used to derive the tangent and inward normal. */
  pathDistance: number;
  /** Exact sampled boundary point used for final visual alignment. */
  boundaryPoint: Point;
  inwardNormal: Point;
  /** Bounds of visible (alpha) pixels in the decoration local space. */
  visibleBounds: PinOutlineLocalBounds;
}

export interface PinOutlineMaterialMetrics {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PinOutlinePlacementOptions {
  samplesPerSegment?: number;
  minScale?: number;
  spacingFactor?: number;
}

const FUNCTIONS: Record<string, (...args: number[]) => number> = {
  abs: Math.abs,
  ceil: Math.ceil,
  cos: Math.cos,
  floor: Math.floor,
  max: Math.max,
  min: Math.min,
  pow: Math.pow,
  sin: Math.sin,
  sqrt: Math.sqrt,
  tan: Math.tan
};

type Token = { kind: 'number' | 'name' | 'operator' | 'paren' | 'comma'; value: string };

function tokenize(source: string): Token[] {
  if (source.length > 256) throw new Error('Formula is too long.');
  const tokens: Token[] = [];
  let index = 0;
  while (index < source.length) {
    const char = source[index];
    if (/\s/.test(char)) {
      index += 1;
      continue;
    }
    if (/[0-9.]/.test(char)) {
      const match = source.slice(index).match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/);
      if (!match) throw new Error('Invalid number in formula.');
      tokens.push({ kind: 'number', value: match[0] });
      if (tokens.length > 128) throw new Error('Formula has too many tokens.');
      index += match[0].length;
      continue;
    }
    if (/[A-Za-z_]/.test(char)) {
      const match = source.slice(index).match(/^[A-Za-z_][A-Za-z0-9_]*/);
      if (!match) throw new Error('Invalid name in formula.');
      tokens.push({ kind: 'name', value: match[0] });
      if (tokens.length > 128) throw new Error('Formula has too many tokens.');
      index += match[0].length;
      continue;
    }
    if ('+-*/^'.includes(char)) {
      tokens.push({ kind: 'operator', value: char });
      if (tokens.length > 128) throw new Error('Formula has too many tokens.');
      index += 1;
      continue;
    }
    if (char === '(' || char === ')') {
      tokens.push({ kind: 'paren', value: char });
      if (tokens.length > 128) throw new Error('Formula has too many tokens.');
      index += 1;
      continue;
    }
    if (char === ',') {
      tokens.push({ kind: 'comma', value: char });
      if (tokens.length > 128) throw new Error('Formula has too many tokens.');
      index += 1;
      continue;
    }
    throw new Error(`Unsupported formula character: ${char}`);
  }
  return tokens;
}

function compileFormula(source: string): (t: number) => number {
  const tokens = tokenize(source);
  let index = 0;
  const peek = () => tokens[index];
  const consume = () => tokens[index++];

  const parseExpression = (): ((t: number) => number) => {
    let left = parseTerm();
    while (peek()?.kind === 'operator' && (peek()?.value === '+' || peek()?.value === '-')) {
      const op = consume().value;
      const right = parseTerm();
      const previous = left;
      left = op === '+' ? (t) => previous(t) + right(t) : (t) => previous(t) - right(t);
    }
    return left;
  };

  const parseTerm = (): ((t: number) => number) => {
    let left = parsePower();
    while (peek()?.kind === 'operator' && (peek()?.value === '*' || peek()?.value === '/')) {
      const op = consume().value;
      const right = parsePower();
      const previous = left;
      left = op === '*' ? (t) => previous(t) * right(t) : (t) => previous(t) / right(t);
    }
    return left;
  };

  const parsePower = (): ((t: number) => number) => {
    const left = parseUnary();
    if (peek()?.kind === 'operator' && peek()?.value === '^') {
      consume();
      const right = parsePower();
      return (t) => left(t) ** right(t);
    }
    return left;
  };

  const parseUnary = (): ((t: number) => number) => {
    if (peek()?.kind === 'operator' && (peek()?.value === '+' || peek()?.value === '-')) {
      const op = consume().value;
      const value = parseUnary();
      return op === '+' ? value : (t) => -value(t);
    }
    return parsePrimary();
  };

  const parsePrimary = (): ((t: number) => number) => {
    const token = consume();
    if (!token) throw new Error('Formula is incomplete.');
    if (token.kind === 'number') {
      const value = Number(token.value);
      return () => value;
    }
    if (token.kind === 'paren' && token.value === '(') {
      const value = parseExpression();
      const close = consume();
      if (!close || close.kind !== 'paren' || close.value !== ')') throw new Error('Formula parentheses are unbalanced.');
      return value;
    }
    if (token.kind !== 'name') throw new Error('Formula expects a value.');
    if (token.value === 't') return (t) => t;
    if (token.value === 'pi') return () => Math.PI;
    const fn = FUNCTIONS[token.value];
    if (!fn) throw new Error(`Unsupported formula name: ${token.value}`);
    const open = consume();
    if (!open || open.kind !== 'paren' || open.value !== '(') throw new Error(`Function ${token.value} needs parentheses.`);
    const args: Array<(t: number) => number> = [];
    if (peek()?.kind !== 'paren' || peek()?.value !== ')') {
      args.push(parseExpression());
      while (peek()?.kind === 'comma') {
        consume();
        args.push(parseExpression());
      }
    }
    const close = consume();
    if (!close || close.kind !== 'paren' || close.value !== ')') throw new Error('Formula parentheses are unbalanced.');
    return (t) => fn(...args.map((arg) => arg(t)));
  };

  const result = parseExpression();
  if (index !== tokens.length) throw new Error('Unexpected formula token.');
  return (t) => {
    const value = result(t);
    if (!Number.isFinite(value)) throw new Error('Formula returned a non-finite value.');
    return value;
  };
}

export function safeFormula(source: string): ((t: number) => number) | null {
  try {
    const compiled = compileFormula(source.trim() || '0');
    // Validate the complete supported parameter range up front. This keeps
    // malformed or explosive formulas from producing unbounded geometry.
    for (let index = 0; index <= 100; index += 1) {
      const t = index / 100;
      const value = compiled(t);
      if (!Number.isFinite(value) || Math.abs(value) > 1_000) return null;
    }
    return compiled;
  } catch {
    return null;
  }
}

export function segmentTypeForIndex(segments: readonly PinOutlineSegment[], index: number): PinOutlineSegmentType {
  return segments[index]?.type ?? 'line';
}

export function samplePinSegment(
  from: Point,
  to: Point,
  segment: PinOutlineSegment,
  count = 24
): Point[] {
  const samples = Math.max(2, Math.floor(count));
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length;
  const ny = dx / length;
  const formula = segment.type === 'formula' ? safeFormula(segment.formula) : null;
  const result: Point[] = [];
  for (let index = 0; index < samples; index += 1) {
    const t = index / (samples - 1);
    const baseX = from.x + dx * t;
    const baseY = from.y + dy * t;
    const bend = segment.type === 'quadratic'
      ? segment.curvature * length * 4 * t * (1 - t)
      : segment.type === 'formula' && formula
        ? formula(t) * t * (1 - t)
        : 0;
    result.push({ x: baseX + nx * bend, y: baseY + ny * bend });
  }
  return result;
}

export function closePinPath(
  pins: readonly PinOutlinePoint[],
  segments: readonly PinOutlineSegment[],
  samplesPerSegment = 24
): Point[] {
  if (pins.length < 2) return pins.map(({ x, y }) => ({ x, y }));
  const result: Point[] = [];
  for (let index = 0; index < pins.length; index += 1) {
    const from = pins[index];
    const to = pins[(index + 1) % pins.length];
    const segment = segments[index] ?? { type: 'line', curvature: 0.25, formula: '1' };
    const samples = samplePinSegment(from, to, segment, samplesPerSegment);
    result.push(...(index === 0 ? samples : samples.slice(1)));
  }
  return result;
}

export function pointInPolygon(point: Point, polygon: readonly Point[]): boolean {
  if (polygon.length < 3) return false;
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const current = polygon[index];
    const prior = polygon[previous];
    const segmentX = current.x - prior.x;
    const segmentY = current.y - prior.y;
    const pointX = point.x - prior.x;
    const pointY = point.y - prior.y;
    const cross = segmentX * pointY - segmentY * pointX;
    const segmentLength = Math.hypot(segmentX, segmentY) || 1;
    const epsilon = 0.25;
    if (
      Math.abs(cross) / segmentLength <= epsilon &&
      pointX >= Math.min(0, segmentX) - epsilon &&
      pointX <= Math.max(0, segmentX) + epsilon &&
      pointY >= Math.min(0, segmentY) - epsilon &&
      pointY <= Math.max(0, segmentY) + epsilon
    ) return true;
    const intersects = ((current.y > point.y) !== (prior.y > point.y)) &&
      point.x < ((prior.x - current.x) * (point.y - current.y)) / (prior.y - current.y || Number.EPSILON) + current.x;
    if (intersects) inside = !inside;
  }
  return inside;
}

export function orientedBoundsCorners(center: Point, bounds: Bounds): Point[] {
  const rotation = bounds.rotation ?? 0;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  return [
    { x: -bounds.halfWidth, y: -bounds.halfHeight },
    { x: bounds.halfWidth, y: -bounds.halfHeight },
    { x: bounds.halfWidth, y: bounds.halfHeight },
    { x: -bounds.halfWidth, y: bounds.halfHeight }
  ].map((corner) => ({
    x: center.x + corner.x * cos - corner.y * sin,
    y: center.y + corner.x * sin + corner.y * cos
  }));
}

export function boundsInsidePolygon(center: Point, bounds: Bounds, polygon: readonly Point[]): boolean {
  if (polygon.length < 3) return false;
  const corners = orientedBoundsCorners(center, bounds);
  if (!corners.every((corner) => pointInPolygon(corner, polygon))) return false;
  // Checking the edges as well as the corners prevents a rotated footprint
  // from crossing a concave boundary between two corners.
  for (let index = 0; index < corners.length; index += 1) {
    const from = corners[index];
    const to = corners[(index + 1) % corners.length];
    for (let step = 1; step < 8; step += 1) {
      const ratio = step / 8;
      const sample = {
        x: from.x + (to.x - from.x) * ratio,
        y: from.y + (to.y - from.y) * ratio
      };
      if (!pointInPolygon(sample, polygon)) return false;
    }
  }
  return true;
}

export function roundPoint(point: Point, decimals = 2): Point {
  const factor = 10 ** decimals;
  return { x: Math.round(point.x * factor) / factor, y: Math.round(point.y * factor) / factor };
}

export interface PinOutlineLocalBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function localBoundsCorners(bounds: PinOutlineLocalBounds): Point[] {
  return [
    { x: bounds.x, y: bounds.y },
    { x: bounds.x + bounds.width, y: bounds.y },
    { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
    { x: bounds.x, y: bounds.y + bounds.height }
  ];
}

export function transformedLocalBoundsCorners(
  origin: Point,
  bounds: PinOutlineLocalBounds,
  rotation: number,
  scale = 1
): Point[] {
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  return localBoundsCorners(bounds).map((corner) => {
    const x = corner.x * scale;
    const y = corner.y * scale;
    return {
      x: origin.x + x * cos - y * sin,
      y: origin.y + x * sin + y * cos
    };
  });
}

export function localBoundsInsidePolygon(
  origin: Point,
  bounds: PinOutlineLocalBounds,
  rotation: number,
  scale: number,
  polygon: readonly Point[]
): boolean {
  const corners = transformedLocalBoundsCorners(origin, bounds, rotation, scale);
  if (!corners.every((corner) => pointInPolygon(corner, polygon))) return false;
  for (let index = 0; index < corners.length; index += 1) {
    const from = corners[index];
    const to = corners[(index + 1) % corners.length];
    for (let step = 1; step < 8; step += 1) {
      const ratio = step / 8;
      if (!pointInPolygon({
        x: from.x + (to.x - from.x) * ratio,
        y: from.y + (to.y - from.y) * ratio
      }, polygon)) return false;
    }
  }
  return true;
}

function withoutClosingDuplicate(path: readonly Point[]): Point[] {
  if (path.length > 1) {
    const first = path[0];
    const last = path[path.length - 1];
    if (Math.hypot(first.x - last.x, first.y - last.y) < 0.0001) return path.slice(0, -1);
  }
  return [...path];
}

function pathLength(path: readonly Point[]): number {
  let length = 0;
  for (let index = 0; index < path.length; index += 1) {
    const next = path[(index + 1) % path.length];
    length += Math.hypot(next.x - path[index].x, next.y - path[index].y);
  }
  return length;
}

interface PathSampleIndex {
  points: Point[];
  cumulative: number[];
  total: number;
}

function createPathSampleIndex(path: readonly Point[]): PathSampleIndex {
  const points = [...path];
  const cumulative = [0];
  let total = 0;
  for (let index = 0; index < points.length; index += 1) {
    const next = points[(index + 1) % points.length];
    total += Math.hypot(next.x - points[index].x, next.y - points[index].y);
    cumulative.push(total);
  }
  return { points, cumulative, total };
}

function pointAtDistanceFromIndex(index: PathSampleIndex, distance: number): Point {
  if (!index.total || index.points.length === 0) return index.points[0] ?? { x: 0, y: 0 };
  const wrapped = ((distance % index.total) + index.total) % index.total;
  for (let pointIndex = 0; pointIndex < index.points.length; pointIndex += 1) {
    const from = index.points[pointIndex];
    const to = index.points[(pointIndex + 1) % index.points.length];
    const start = index.cumulative[pointIndex];
    const length = index.cumulative[pointIndex + 1] - start;
    if (length <= 0.0001) continue;
    if (wrapped <= start + length) {
      const ratio = Math.max(0, Math.min(1, (wrapped - start) / length));
      return { x: from.x + (to.x - from.x) * ratio, y: from.y + (to.y - from.y) * ratio };
    }
  }
  return { ...index.points[0] };
}

function pointAtDistance(path: readonly Point[], distance: number): Point {
  const total = pathLength(path);
  if (!total || path.length === 0) return path[0] ?? { x: 0, y: 0 };
  let remaining = ((distance % total) + total) % total;
  for (let index = 0; index < path.length; index += 1) {
    const from = path[index];
    const to = path[(index + 1) % path.length];
    const length = Math.hypot(to.x - from.x, to.y - from.y);
    if (length <= 0.0001) continue;
    if (remaining <= length) {
      const ratio = remaining / length;
      return { x: from.x + (to.x - from.x) * ratio, y: from.y + (to.y - from.y) * ratio };
    }
    remaining -= length;
  }
  return { ...path[0] };
}

function polygonSignedArea(polygon: readonly Point[]): number {
  let area = 0;
  for (let index = 0; index < polygon.length; index += 1) {
    const current = polygon[index];
    const next = polygon[(index + 1) % polygon.length];
    area += current.x * next.y - next.x * current.y;
  }
  return area / 2;
}

function inwardNormal(path: readonly Point[], distance: number, polygon: readonly Point[]): Point {
  const total = pathLength(path);
  const delta = Math.max(0.01, Math.min(2, total / Math.max(16, path.length * 2)));
  const before = pointAtDistance(path, distance - delta);
  const after = pointAtDistance(path, distance + delta);
  const tangentX = after.x - before.x;
  const tangentY = after.y - before.y;
  const tangentLength = Math.hypot(tangentX, tangentY) || 1;
  const left = { x: -tangentY / tangentLength, y: tangentX / tangentLength };
  const sign = polygonSignedArea(polygon) >= 0 ? 1 : -1;
  return { x: left.x * sign, y: left.y * sign };
}

function boundaryAlignedOrigin(
  boundaryPoint: Point,
  normal: Point,
  bounds: PinOutlineLocalBounds,
  rotation: number,
  scale: number
): Point {
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const projections = localBoundsCorners(bounds).map((corner) => {
    const x = corner.x * scale;
    const y = corner.y * scale;
    return (x * cos - y * sin) * normal.x + (x * sin + y * cos) * normal.y;
  });
  const outerProjection = Math.min(...projections);
  return {
    x: boundaryPoint.x - normal.x * outerProjection,
    y: boundaryPoint.y - normal.y * outerProjection
  };
}

export function alignLocalBoundsToBoundary(
  boundaryPoint: Point,
  normal: Point,
  bounds: PinOutlineLocalBounds,
  rotation: number,
  scale: number
): Point {
  return boundaryAlignedOrigin(boundaryPoint, normal, bounds, rotation, scale);
}

function tangentExtent(bounds: PinOutlineLocalBounds, rotation: number, tangent: Point, scale: number): number {
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const projections = localBoundsCorners(bounds).map((corner) => {
    const x = corner.x * scale;
    const y = corner.y * scale;
    return (x * cos - y * sin) * tangent.x + (x * sin + y * cos) * tangent.y;
  });
  return Math.max(...projections) - Math.min(...projections);
}

function fitPlacement(
  boundaryPoint: Point,
  normal: Point,
  metrics: PinOutlineMaterialMetrics,
  rotation: number,
  polygon: readonly Point[],
  minScale: number
): { point: Point; scale: number } | null {
  const bounds = {
    x: Number.isFinite(metrics.x) ? metrics.x : -Math.max(1, metrics.width) / 2,
    y: Number.isFinite(metrics.y) ? metrics.y : -Math.max(1, metrics.height) / 2,
    width: Math.max(1, metrics.width),
    height: Math.max(1, metrics.height)
  };
  const fits = (scale: number) => {
    const point = boundaryAlignedOrigin(boundaryPoint, normal, bounds, rotation, scale);
    return {
      point,
      fits: localBoundsInsidePolygon(point, bounds, rotation, scale, polygon)
    };
  };
  const minimum = fits(minScale);
  if (!minimum.fits) return null;
  const maximum = fits(1);
  if (maximum.fits) return { point: maximum.point, scale: 1 };
  let low = minScale;
  let high = 1;
  let best = minimum;
  for (let iteration = 0; iteration < 20; iteration += 1) {
    const mid = (low + high) / 2;
    const candidate = fits(mid);
    if (candidate.fits) {
      low = mid;
      best = candidate;
    } else {
      high = mid;
    }
  }
  return { point: best.point, scale: low };
}

/**
 * Build deterministic, per-instance decoration transforms for a pin outline.
 * The returned positions are runtime-only and never become RoleDocument data.
 */
export function buildPinOutlinePlacements(
  pins: readonly PinOutlinePoint[],
  segments: readonly PinOutlineSegment[],
  materials: readonly PinOutlineMaterial[],
  metricsByAssetId: Readonly<Record<string, PinOutlineMaterialMetrics | undefined>>,
  options: PinOutlinePlacementOptions = {}
): PinOutlinePlacement[] {
  if (pins.length < 3 || materials.length === 0) return [];
  const samplesPerSegment = Math.max(8, Math.floor(options.samplesPerSegment ?? 32));
  const minScale = Math.max(0.01, options.minScale ?? 0.05);
  const spacingFactor = Math.max(0.4, Math.min(1.2, options.spacingFactor ?? 0.82));
  const polygon = withoutClosingDuplicate(closePinPath(pins, segments, samplesPerSegment));
  if (polygon.length < 3) return [];
  const pathIndex = createPathSampleIndex(polygon);
  const total = pathIndex.total;
  if (total <= 0) return [];
  const placements: PinOutlinePlacement[] = [];
  // Keep explicit candidates at every pin corner. Regular arc-length samples
  // alone can leave a visible gap when a corner falls between two samples.
  const vertexDistances = pathIndex.cumulative.slice(0, -1);
  let regularDistance = 0;
  let vertexIndex = 0;
  let materialIndex = 0;
  let guard = 0;
  while ((regularDistance < total || vertexIndex < vertexDistances.length) && guard < 4096) {
    guard += 1;
    const nextVertex = vertexDistances[vertexIndex];
    const useVertex = nextVertex != null && nextVertex <= regularDistance + 0.0001;
    const distance = useVertex ? nextVertex : regularDistance;
    if (useVertex) vertexIndex += 1;
    if (distance >= total) break;
    const material = materials[materialIndex % materials.length];
    materialIndex += 1;
    const metrics = metricsByAssetId[material.assetId];
    if (!metrics || metrics.width <= 0 || metrics.height <= 0) {
      regularDistance = Math.max(regularDistance, distance + 8);
      continue;
    }
    const point = pointAtDistanceFromIndex(pathIndex, distance);
    const normal = inwardNormal(polygon, distance, polygon);
    const before = pointAtDistanceFromIndex(pathIndex, distance - 1);
    const after = pointAtDistanceFromIndex(pathIndex, distance + 1);
    const tangentAngle = Math.atan2(after.y - before.y, after.x - before.x);
    const axisCorrection = metrics.width >= metrics.height ? 0 : Math.PI / 2;
    const rotation = tangentAngle + axisCorrection;
    const fitted = fitPlacement(point, normal, metrics, rotation, polygon, minScale);
    const tangentLength = Math.hypot(after.x - before.x, after.y - before.y) || 1;
    const tangent = { x: (after.x - before.x) / tangentLength, y: (after.y - before.y) / tangentLength };
    const footprintLength = Math.max(1, tangentExtent({
      x: Number.isFinite(metrics.x) ? metrics.x : -metrics.width / 2,
      y: Number.isFinite(metrics.y) ? metrics.y : -metrics.height / 2,
      width: Math.max(1, metrics.width),
      height: Math.max(1, metrics.height)
    }, rotation, tangent, fitted?.scale ?? minScale));
    if (fitted) {
      const visibleBounds = {
        x: Number.isFinite(metrics.x) ? metrics.x : -metrics.width / 2,
        y: Number.isFinite(metrics.y) ? metrics.y : -metrics.height / 2,
        width: Math.max(1, metrics.width),
        height: Math.max(1, metrics.height)
      };
      placements.push({
        materialId: material.id,
        assetId: material.assetId,
        x: fitted.point.x,
        y: fitted.point.y,
        rotation: (rotation * 180) / Math.PI,
        scaleX: fitted.scale,
        scaleY: fitted.scale,
        pathDistance: distance,
        boundaryPoint: point,
        inwardNormal: normal,
        visibleBounds
      });
      const advance = Math.max(4, footprintLength * spacingFactor);
      regularDistance = Math.max(regularDistance, distance + advance);
    } else {
      regularDistance = Math.max(regularDistance, distance + Math.max(4, Math.min(footprintLength, 24)));
    }
  }
  return placements;
}
