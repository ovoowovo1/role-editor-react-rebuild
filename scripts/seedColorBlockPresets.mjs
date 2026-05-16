import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';

const databaseUrl = process.env.DATABASE_URL ?? process.env.NEON_DATABASE_URL;

if (!databaseUrl) {
  throw new Error('Set DATABASE_URL or NEON_DATABASE_URL before seeding color block presets.');
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const seedPath = path.join(__dirname, 'colorBlockPresets.seed.json');
const presets = JSON.parse(await fs.readFile(seedPath, 'utf8'));

if (!Array.isArray(presets)) {
  throw new Error('Color block seed data must be an array.');
}

const client = new Client({ connectionString: databaseUrl });

await client.connect();

try {
  await client.query('BEGIN');

  for (const [index, preset] of presets.entries()) {
    await client.query(
      `
        INSERT INTO color_block_presets (id, camp, name, label, color, deco, sort_order, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, now())
        ON CONFLICT (id) DO UPDATE SET
          camp = EXCLUDED.camp,
          name = EXCLUDED.name,
          label = EXCLUDED.label,
          color = EXCLUDED.color,
          deco = EXCLUDED.deco,
          sort_order = EXCLUDED.sort_order,
          updated_at = now();
      `,
      [preset.id, preset.camp, preset.name, preset.label, preset.color, JSON.stringify(preset.deco), index]
    );
  }

  await client.query('COMMIT');
  console.log(`Seeded ${presets.length} color block presets.`);
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  await client.end();
}
