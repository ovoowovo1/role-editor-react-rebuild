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

CREATE INDEX IF NOT EXISTS color_block_presets_camp_idx ON color_block_presets (camp);
