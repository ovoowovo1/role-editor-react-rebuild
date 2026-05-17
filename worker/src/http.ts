export interface CorsEnv {
  ALLOWED_ORIGINS?: string;
}

export const DEFAULT_ALLOWED_ORIGINS = [
  'https://role-editor-react-rebuild.ovoowovo.workers.dev',
  'https://twilightwarscloudflarereact.pages.dev',
  'https://twilightwars.ovoowovo.com',
  'http://localhost:5173',
  'http://127.0.0.1:5173'
];

export function getAllowedOrigins(env: CorsEnv): string[] {
  return (env.ALLOWED_ORIGINS ?? DEFAULT_ALLOWED_ORIGINS.join(','))
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function getCorsHeaders(request: Request, env: CorsEnv): HeadersInit | null {
  const origin = request.headers.get('Origin');
  if (!origin || !getAllowedOrigins(env).includes(origin)) return null;

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin'
  };
}

export function jsonResponse(request: Request, env: CorsEnv, body: unknown, init: ResponseInit = {}): Response {
  const corsHeaders = getCorsHeaders(request, env);
  return Response.json(body, {
    ...init,
    headers: {
      ...(corsHeaders ?? {}),
      ...init.headers
    }
  });
}
