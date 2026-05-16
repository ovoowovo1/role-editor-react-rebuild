import { asc, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';
import { colorBlockPresets } from './db/schema';

export interface Env {
  HYPERDRIVE: Hyperdrive;
  ALLOWED_ORIGINS?: string;
}

const ALL_CAMPS = new Set(['civil', 'camp4', '無關陣營']);
const PRESET_CAMPS = new Set(['skydow', 'royal', 'third']);
const DEFAULT_ALLOWED_ORIGINS = [
  'https://twilightwarscloudflarereact.pages.dev',
  'https://twilightwars.ovoowovo.com',
  'http://localhost:5173',
  'http://127.0.0.1:5173'
];

function getAllowedOrigins(env: Env) {
  return (env.ALLOWED_ORIGINS ?? DEFAULT_ALLOWED_ORIGINS.join(','))
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function getCorsHeaders(request: Request, env: Env): HeadersInit | null {
  const origin = request.headers.get('Origin');
  if (!origin || !getAllowedOrigins(env).includes(origin)) return null;

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin'
  };
}

function jsonResponse(request: Request, env: Env, body: unknown, init: ResponseInit = {}) {
  const corsHeaders = getCorsHeaders(request, env);
  return Response.json(body, {
    ...init,
    headers: {
      ...(corsHeaders ?? {}),
      ...init.headers
    }
  });
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

    if (!camp || ALL_CAMPS.has(camp)) {
      const rows = await db.select(columns).from(colorBlockPresets).orderBy(asc(colorBlockPresets.sortOrder), asc(colorBlockPresets.id));
      return jsonResponse(request, env, rows);
    }

    if (!PRESET_CAMPS.has(camp)) {
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
