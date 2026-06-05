import { expect, type Download, type Page, type TestInfo } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ungzip } from 'pako';
import type { DecorationLayer, RoleDocument } from '../src/types/role';

interface LegacyDecoEntry {
  c: string;
  x: number;
  y: number;
  sx: number;
  sy: number;
  r: number;
}

interface LegacyPayload {
  data: {
    cr: {
      deco: LegacyDecoEntry[];
    };
  };
  decoGroups?: Array<{ name?: string; visible?: boolean; collapsed?: boolean; itemIndexes?: number[] }>;
}

export interface PageErrorMonitor {
  errors: string[];
}

export function makeEditorSmokeRole(decoCount: number, options: { grouped?: boolean } = {}): RoleDocument {
  const decoCodes = readFixtureDecoCodes(decoCount);
  const decorations: DecorationLayer[] = decoCodes.map((code, index) => ({
    id: `e2e-deco-${index + 1}`,
    code,
    assetId: decoAssetIdFromCode(code),
    name: `E2E Layer ${index + 1}`,
    x: index * 8,
    y: index * -6,
    scaleX: 1,
    scaleY: 1,
    rotation: index * 7,
    visible: true,
    opacity: 1
  }));

  return {
    schemaVersion: 1,
    name: 'E2E Smoke Role',
    camp: 'royal',
    gender: 'male',
    positionRange: 60,
    parts: { head: '1', hand: '1', foot: '1', cape: '1' },
    partFrames: { head: 1, hand: 1, foot: 1, cape: 1 },
    partScales: { head: 1, hand: 1, foot: 1, cape: 1 },
    headLayerIndex: decorations.length,
    headLayer: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, visible: true, opacity: 1 },
    decorations,
    groups: options.grouped
      ? [
          {
            id: 'e2e-group-1',
            name: 'E2E Group',
            itemIds: decorations.slice(0, 2).map((deco) => deco.id),
            members: decorations.slice(0, 2).map((deco) => ({ type: 'layer', id: deco.id })),
            visible: true,
            collapsed: false
          }
        ]
      : [],
    updatedAt: '2026-01-01T00:00:00.000Z'
  };
}

function readFixtureDecoCodes(count: number): string[] {
  const manifestPath = path.resolve(process.cwd(), 'src/generated/gafManifest.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { decorationGafSymbols?: string[] };
  const codes = manifest.decorationGafSymbols ?? [];
  if (codes.length < count) {
    throw new Error(`Need ${count} deco symbols for E2E fixtures, found ${codes.length}.`);
  }
  return codes.slice(0, count);
}

function decoAssetIdFromCode(code: string): string {
  return `deco-${code.replace(/[^a-z0-9_-]/gi, '-')}`;
}

export async function writeRoleFixture(testInfo: TestInfo, name: string, role: RoleDocument): Promise<string> {
  const filePath = testInfo.outputPath(`${name}.json`);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(role, null, 2), 'utf8');
  return filePath;
}

export async function writeTextFixture(testInfo: TestInfo, name: string, text: string): Promise<string> {
  const filePath = testInfo.outputPath(name);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, text, 'utf8');
  return filePath;
}

export async function importRoleFile(page: Page, filePath: string, expectedDecoCount?: number): Promise<void> {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('import-file-input')).toBeAttached();
  await page.getByTestId('import-file-input').setInputFiles(filePath);
  if (expectedDecoCount != null) {
    await expect
      .poll(async () => visibleLayerIds(page), { timeout: 20_000 })
      .toHaveLength(expectedDecoCount + 1);
    return;
  }
  await expect(page.locator('[data-layer-id]').first()).toBeVisible({ timeout: 20_000 });
}

export function watchPageErrors(page: Page): PageErrorMonitor {
  const monitor: PageErrorMonitor = { errors: [] };
  page.on('pageerror', (error) => {
    monitor.errors.push(`pageerror: ${error.message}`);
  });
  page.on('console', (message) => {
    if (message.type() === 'error') {
      const text = message.text();
      if (!isIgnorableConsoleError(text)) {
        monitor.errors.push(`console: ${text}`);
      }
    }
  });
  return monitor;
}

function isIgnorableConsoleError(text: string): boolean {
  return (
    text.includes('cloudflareinsights.com') ||
    text.includes('/cdn-cgi/rum') ||
    text.includes('/api/color-block-presets') ||
    text.includes('Failed to load resource: net::ERR_FAILED') ||
    text.includes('Failed to load resource: the server responded with a status of 502') ||
    text.includes('Access to XMLHttpRequest') && text.includes('cloudflareinsights.com')
  );
}

export function expectNoPageErrors(monitor: PageErrorMonitor): void {
  expect(monitor.errors).toEqual([]);
}

export async function saveDownload(download: Download, testInfo: TestInfo, name: string): Promise<string> {
  const filePath = testInfo.outputPath('downloads', name);
  await mkdir(path.dirname(filePath), { recursive: true });
  await download.saveAs(filePath);
  return filePath;
}

export async function downloadJsonExport(page: Page, testInfo: TestInfo, name = 'role.json'): Promise<string> {
  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('export-json-button').click();
  return saveDownload(await downloadPromise, testInfo, name);
}

export async function downloadTwrole(page: Page, testInfo: TestInfo, name = 'role.twrole'): Promise<string> {
  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('download-twrole-button').click();
  return saveDownload(await downloadPromise, testInfo, name);
}

export async function setNumberInput(page: Page, testId: string, value: number): Promise<void> {
  const input = page.getByTestId(testId);
  await input.fill(String(value));
  await input.blur();
}

export async function readLegacyPayload(filePath: string): Promise<LegacyPayload> {
  const bytes = await readFile(filePath);
  if (bytes[0] === 0 && bytes[1] === 1) {
    return JSON.parse(ungzip(bytes.subarray(2), { to: 'string' }) as string) as LegacyPayload;
  }
  return JSON.parse(bytes.toString('utf8')) as LegacyPayload;
}

export async function firstGroupId(page: Page): Promise<string> {
  const groupId = await page.locator('[data-group-id]').first().getAttribute('data-group-id');
  if (!groupId) throw new Error('Expected at least one group row.');
  return groupId;
}

export function nonHeadDecoCodes(payload: LegacyPayload): string[] {
  return payload.data.cr.deco.filter((deco) => deco.c !== 'head').map((deco) => deco.c);
}

export function nonHeadDecoEntries(payload: LegacyPayload): LegacyDecoEntry[] {
  return payload.data.cr.deco.filter((deco) => deco.c !== 'head');
}

export function findDecoEntry(payload: LegacyPayload, code: string): LegacyDecoEntry {
  const entry = nonHeadDecoEntries(payload).find((deco) => deco.c === code);
  if (!entry) throw new Error(`Expected exported deco code ${code}`);
  return entry;
}

export async function visibleLayerIds(page: Page): Promise<string[]> {
  return page.locator('[data-testid^="layer-row-"]').evaluateAll((nodes) =>
    nodes
      .map((node) => node.getAttribute('data-testid')?.replace(/^layer-row-/, ''))
      .filter((id): id is string => Boolean(id))
  );
}
