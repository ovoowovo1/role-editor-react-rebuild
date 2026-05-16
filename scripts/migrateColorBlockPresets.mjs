import process from 'node:process';
import { Client } from 'pg';

const databaseUrl = process.env.DATABASE_URL ?? process.env.NEON_DATABASE_URL;

if (!databaseUrl) {
  throw new Error('Set DATABASE_URL or NEON_DATABASE_URL before running the color block migration.');
}

const client = new Client({ connectionString: databaseUrl });

await client.connect();

try {
  await client.query(`
    CREATE TABLE IF NOT EXISTS color_block_presets (
      id text PRIMARY KEY,
      camp varchar(32) NOT NULL CHECK (camp IN ('skydow', 'royal', 'third')),
      name text NOT NULL,
      label text NOT NULL,
      color varchar(32) NOT NULL,
      deco jsonb NOT NULL,
      sort_order integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  await client.query('CREATE INDEX IF NOT EXISTS color_block_presets_camp_idx ON color_block_presets (camp);');
  console.log('color_block_presets table is ready.');
} finally {
  await client.end();
}
