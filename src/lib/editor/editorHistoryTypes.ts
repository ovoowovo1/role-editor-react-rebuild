import type {
  DecorationGroup,
  DecorationLayer,
  HeadLayerTransform,
  RoleDocument,
  RolePartFrames,
  RolePartScales,
  RoleParts
} from '../../types/role';
import { EDITOR_LOCAL_HISTORY_LIMIT } from '../../constants/editor';

export const LOCAL_HISTORY_LIMIT = EDITOR_LOCAL_HISTORY_LIMIT;

export interface HistoryValueChange<T> {
  before: T;
  after: T;
}

export interface HistoryIdPool {
  ids: string[];
  indexById: Map<string, number>;
}

export interface DecorationLayerFieldPatch {
  index: number;
  before: Partial<Omit<DecorationLayer, 'id' | 'visible'>>;
  after: Partial<Omit<DecorationLayer, 'id' | 'visible'>>;
}

export interface DecorationPresencePatch {
  index: number;
  before: DecorationLayer | null;
  after: DecorationLayer | null;
}

export interface CompactVisibilityPatch {
  indices: Uint32Array;
  before: Uint8Array;
  after: Uint8Array;
}

export interface GroupFieldPatch {
  index: number;
  before: Partial<Omit<DecorationGroup, 'id'>>;
  after: Partial<Omit<DecorationGroup, 'id'>>;
}

export interface GroupPresencePatch {
  index: number;
  before: DecorationGroup | null;
  after: DecorationGroup | null;
}

export interface RoleHistoryPatch {
  idPool: HistoryIdPool;
  schemaVersion?: HistoryValueChange<number>;
  name?: HistoryValueChange<string>;
  camp?: HistoryValueChange<string>;
  gender?: HistoryValueChange<RoleDocument['gender']>;
  positionRange?: HistoryValueChange<RoleDocument['positionRange']>;
  parts?: HistoryValueChange<RoleParts>;
  partFrames?: HistoryValueChange<RolePartFrames>;
  partScales?: HistoryValueChange<RolePartScales>;
  headLayerIndex?: HistoryValueChange<number>;
  updatedAt?: HistoryValueChange<string>;
  headLayer: Partial<{
    [K in keyof HeadLayerTransform]: HistoryValueChange<HeadLayerTransform[K]>;
  }>;
  decorations: {
    fields: DecorationLayerFieldPatch[];
    presence: DecorationPresencePatch[];
    visibility: CompactVisibilityPatch | null;
    order: { before: Uint32Array; after: Uint32Array } | null;
  };
  groups: {
    fields: GroupFieldPatch[];
    presence: GroupPresencePatch[];
    order: { before: Uint32Array; after: Uint32Array } | null;
  };
}

export interface RoleHistoryBaseEntry {
  kind: 'patch';
  patch: RoleHistoryPatch;
}

export interface DecorationTransformTarget {
  id: string;
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
}

export type LocalHistoryEntry =
  | { kind: 'patch'; patch: RoleHistoryPatch; selectionIds: string[]; inverseSelectionIds: string[] }
  | { kind: 'translate'; ids: string[]; dx: number; dy: number; selectionIds: string[] }
  | { kind: 'transform'; target: DecorationTransformTarget[]; selectionIds: string[] };

function sameStringArray(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function sameRecord<T, K extends keyof T>(a: T, b: T, keys: readonly K[]): boolean {
  return keys.every((key) => a[key] === b[key]);
}

function sameMembers(a: DecorationGroup['members'], b: DecorationGroup['members']): boolean {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  return a.every((member, index) => member.type === b[index].type && member.id === b[index].id);
}

function sameDecoration(a: DecorationLayer, b: DecorationLayer): boolean {
  return sameRecord(a, b, ['id', 'code', 'assetId', 'name', 'x', 'y', 'scaleX', 'scaleY', 'rotation', 'visible', 'opacity']);
}

function sameGroup(a: DecorationGroup, b: DecorationGroup): boolean {
  return a.id === b.id && a.name === b.name && a.visible === b.visible && a.collapsed === b.collapsed
    && sameStringArray(a.itemIds, b.itemIds) && sameMembers(a.members, b.members);
}

function sameHead(a: RoleDocument['headLayer'], b: RoleDocument['headLayer']): boolean {
  return sameRecord(a, b, ['x', 'y', 'scaleX', 'scaleY', 'rotation', 'visible', 'opacity']);
}

function sameParts(a: RoleDocument['parts'], b: RoleDocument['parts']): boolean {
  return sameRecord(a, b, ['head', 'hand', 'foot', 'cape']);
}

function sameFrames(a: RoleDocument['partFrames'], b: RoleDocument['partFrames']): boolean {
  return sameRecord(a, b, ['head', 'hand', 'foot', 'cape']);
}

function sameScales(a: RoleDocument['partScales'], b: RoleDocument['partScales']): boolean {
  return sameRecord(a, b, ['head', 'hand', 'foot', 'cape']);
}

/** Compares persisted role fields while intentionally ignoring updatedAt. */
export function sameRole(a: RoleDocument, b: RoleDocument): boolean {
  if (a === b) return true;
  if (a.schemaVersion !== b.schemaVersion || a.name !== b.name || a.camp !== b.camp || a.gender !== b.gender) return false;
  if (a.positionRange !== b.positionRange || a.headLayerIndex !== b.headLayerIndex) return false;
  if (!sameParts(a.parts, b.parts) || !sameFrames(a.partFrames, b.partFrames) || !sameScales(a.partScales, b.partScales)) return false;
  if (!sameHead(a.headLayer, b.headLayer)) return false;
  if (a.decorations.length !== b.decorations.length || !a.decorations.every((item, index) => sameDecoration(item, b.decorations[index]))) return false;
  const aGroups = a.groups ?? [];
  const bGroups = b.groups ?? [];
  return aGroups.length === bGroups.length && aGroups.every((group, index) => sameGroup(group, bGroups[index]));
}
