import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeImportedRole, isMissingDecoAssetId } from '../src/lib/roleSerialization';
import { optionById } from '../src/mock/options';
import type { RoleDocument } from '../src/types/role';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SAMPLE_DIR = path.resolve(__dirname, '..', '..', 'twroleEditor');

interface SampleReport {
  file: string;
  totalDecos: number;
  missingCodes: string[];
  scaleCheck: {
    totalChecked: number;
    mismatches: Array<{ code: string; sx: number; sy: number; r: number }>;
  };
  cape: { f: number; s: number };
  head: { f: number; s: number };
  warnings: string[];
}

const EPS = 1e-4;

function almostEqual(a: number, b: number, eps = EPS): boolean {
  return Math.abs(a - b) < eps;
}

function normalizeDegForCompare(deg: number): number {
  // match normalizeDegrees behavior (-180, 180]
  let out = deg % 360;
  if (out > 180) out -= 360;
  if (out < -180) out += 360;
  return out;
}

function reportFor(file: string): SampleReport {
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  const { role, warnings } = normalizeImportedRole(raw);
  const decoInput: Array<{ c?: string; x?: number; y?: number; sx?: number; sy?: number; r?: number }> =
    raw?.data?.cr?.deco ?? raw?.data?.deco ?? raw?.cr?.deco ?? raw?.deco ?? [];

  const missingCodes = role.decorations
    .filter((deco) => isMissingDecoAssetId(deco.assetId))
    .map((deco) => deco.code);

  // Compare each non-head input entry against an output decoration matching
  // by exact (code, sx, sy) triple. The output deco list is top-first (old
  // reverse), so index-based comparison is unreliable; match by identity.
  const mismatches: SampleReport['scaleCheck']['mismatches'] = [];
  let checked = 0;
  const availableOutputs = [...role.decorations];
  for (const entry of decoInput) {
    const code = String(entry?.c ?? '');
    if (!code || code === 'head') continue;
    checked += 1;
    const sx = Number(entry.sx ?? 0);
    const sy = Number(entry.sy ?? 0);
    const r = Number(entry.r ?? 0);
    const rDeg = normalizeDegForCompare((r * 180) / Math.PI);
    const idx = availableOutputs.findIndex(
      (d) => d.code === code && almostEqual(d.scaleX, sx) && almostEqual(d.scaleY, sy) && almostEqual(normalizeDegForCompare(d.rotation), rDeg, 0.02)
    );
    if (idx === -1) {
      mismatches.push({ code, sx, sy, r });
    } else {
      availableOutputs.splice(idx, 1);
    }
  }

  const cape = (raw?.data?.cr?.cape ?? { f: 11, s: 1 }) as { f: number; s: number };
  const head = (raw?.data?.cr?.head ?? { f: 1, s: 1 }) as { f: number; s: number };

  return {
    file: path.basename(file),
    totalDecos: role.decorations.length,
    missingCodes: [...new Set(missingCodes)],
    scaleCheck: { totalChecked: checked, mismatches },
    cape,
    head,
    warnings
  };
}

function checkRoleDocument(role: RoleDocument): string[] {
  const issues: string[] = [];
  if (!role.decorations) issues.push('decorations missing');
  for (const deco of role.decorations) {
    if (!Number.isFinite(deco.scaleX) || !Number.isFinite(deco.scaleY)) issues.push(`nonfinite scale on ${deco.code}`);
    if (!Number.isFinite(deco.rotation)) issues.push(`nonfinite rotation on ${deco.code}`);
  }
  // Preserved asset ids must either resolve in optionById or be marked as missing.
  for (const deco of role.decorations) {
    if (!isMissingDecoAssetId(deco.assetId) && !optionById[deco.assetId]) {
      issues.push(`unknown assetId ${deco.assetId} for code ${deco.code}`);
    }
  }
  return issues;
}

function main() {
  const files = fs
    .readdirSync(SAMPLE_DIR)
    .filter((name) => name.toLowerCase().endsWith('.json'))
    .map((name) => path.join(SAMPLE_DIR, name));

  if (!files.length) {
    console.error(`No sample JSON files found in ${SAMPLE_DIR}`);
    process.exit(1);
  }

  for (const file of files) {
    try {
      const report = reportFor(file);
      const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
      const { role } = normalizeImportedRole(raw);
      const issues = checkRoleDocument(role);

      console.log(`\n=== ${report.file} ===`);
      console.log(`  totalDecos=${report.totalDecos} missing=${report.missingCodes.length} warnings=${report.warnings.length}`);
      if (report.missingCodes.length) console.log(`  missingCodes sample: ${report.missingCodes.slice(0, 4).join(', ')}`);
      console.log(`  cape=${JSON.stringify(report.cape)} head=${JSON.stringify(report.head)}`);
      console.log(`  scaleCheck: checked=${report.scaleCheck.totalChecked} mismatches=${report.scaleCheck.mismatches.length}`);
      for (const m of report.scaleCheck.mismatches.slice(0, 3)) {
        console.log(`    mismatch ${m.code} sx=${m.sx} sy=${m.sy} r=${m.r}`);
      }
      for (const issue of issues) console.log(`  ISSUE: ${issue}`);
    } catch (err) {
      console.error(`FAILED ${file}:`, err);
      process.exitCode = 1;
    }
  }
}

main();
