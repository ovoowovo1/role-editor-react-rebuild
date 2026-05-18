import { asc, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';
import { colorBlockPresets } from './db/schema';
import { getCorsHeaders, jsonResponse } from './http';
import { COLOR_BLOCK_ALL_CAMPS, COLOR_BLOCK_SPECIFIC_CAMPS } from '../../src/constants/colorBlocks';

export interface Env {
  HYPERDRIVE: Hyperdrive;
  ALLOWED_ORIGINS?: string;
}

async function listColorBlockPresets(request: Request, env: Env) {
  const url = new URL(request.url);
  const camp = url.searchParams.get('camp')?.trim();
  const client = new Client({ connectionString: env.HYPERDRIVE.connectionString });

  try {
    await client.connect();
    const db = drizzle(client);
    const columns = {
      id: colorBlockPresets.id,
      camp: colorBlockPresets.camp,
      name: colorBlockPresets.name,
      label: colorBlockPresets.label,
      color: colorBlockPresets.color,
      deco: colorBlockPresets.deco
    };

    if (!camp || COLOR_BLOCK_ALL_CAMPS.has(camp)) {
      const rows = await db.select(columns).from(colorBlockPresets).orderBy(asc(colorBlockPresets.sortOrder), asc(colorBlockPresets.id));
      return jsonResponse(request, env, rows);
    }

    if (!COLOR_BLOCK_SPECIFIC_CAMPS.has(camp)) {
      return jsonResponse(request, env, []);
    }

    const rows = await db
      .select(columns)
      .from(colorBlockPresets)
      .where(eq(colorBlockPresets.camp, camp))
      .orderBy(asc(colorBlockPresets.sortOrder), asc(colorBlockPresets.id));
    return jsonResponse(request, env, rows);
  } finally {
    await client.end().catch(() => undefined);
  }
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      const corsHeaders = getCorsHeaders(request, env);
      return corsHeaders ? new Response(null, { status: 204, headers: corsHeaders }) : new Response(null, { status: 403 });
    }

    if (!getCorsHeaders(request, env)) {
      return Response.json({ error: 'Origin not allowed' }, { status: 403 });
    }

    if (request.method !== 'GET') {
      return jsonResponse(request, env, { error: 'Method not allowed' }, { status: 405 });
    }

    try {
      if (url.pathname === '/api/color-block-presets' || url.pathname === '/color-block-presets') {
        return await listColorBlockPresets(request, env);
      }

      return jsonResponse(request, env, { error: 'Not found' }, { status: 404 });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return jsonResponse(request, env, { error: message }, { status: 500 });
    }
  }
} satisfies ExportedHandler<Env>;
