# Color Block Worker

This Worker exposes color block presets from Neon Postgres.

## Local setup

1. Put the Neon URL in a local shell variable, not in source:
   `DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require`
2. Run `npm run db:migrate:color-blocks`.
3. Run `npm run db:seed:color-blocks`.
4. Run `npm run worker:dev`.
5. Run `npm run dev`; Vite proxies `/api/color-block-presets` to the local Worker.

## Cloudflare setup

Create a Hyperdrive config that points at the Neon database, then replace
`REPLACE_WITH_HYPERDRIVE_ID` in `wrangler.jsonc` with the Hyperdrive ID.

The Worker reads from `env.HYPERDRIVE.connectionString`; the Neon password should
stay in Cloudflare Hyperdrive, not in this repository.
