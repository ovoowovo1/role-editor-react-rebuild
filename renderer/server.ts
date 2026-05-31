import express, { type Request, type Response } from 'express';
import { chromium, type Browser, type Page } from 'playwright';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const distDir = path.join(repoRoot, 'dist');

const PORT = Number(process.env.RENDERER_PORT ?? process.env.PORT ?? 9321);
const BODY_LIMIT = process.env.RENDERER_BODY_LIMIT ?? '25mb';
const RENDERER_NAME = 'role-editor-react-rebuild';
const RENDERER_VERSION = 'v1';
const RENDERER_BACKEND = 'node-express-playwright-chromium';

type EvaluateMethod = 'renderRole' | 'renderRoleBatch' | 'scoreRole' | 'renderAblation' | 'getRendererInfo';

interface RendererInfo {
  ok: true;
  renderer: string;
  version: string;
  pixiReady: boolean;
  assetsReady: boolean;
  assetManifestHash: string;
  canvasSize: { width: number; height: number };
  renderMode: string;
}

interface QueuedTask<T> {
  run(): Promise<T>;
}

let chain: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: QueuedTask<T>): Promise<T> {
  const next = chain.then(task.run, task.run);
  chain = next.catch(() => undefined);
  return next;
}

function getCommit(): string {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
  } catch {
    return process.env.RENDERER_COMMIT ?? 'unknown';
  }
}

function defaultAppUrl(): string {
  return process.env.RENDERER_APP_URL ?? `http://127.0.0.1:${PORT}/batch-render`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireObject(value: unknown, label: string): Record<string, unknown> {
  if (!isObject(value)) throw new Error(`${label} must be an object.`);
  return value;
}

function numberOrDefault(value: unknown, fallback: number): number {
  const numeric = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(numeric) && numeric > 0 ? Math.round(numeric) : fallback;
}

function validateRenderRoleRequest(body: unknown): Record<string, unknown> {
  const request = requireObject(body, 'Request body');
  if (!Object.prototype.hasOwnProperty.call(request, 'payload')) throw new Error('payload is required.');
  return {
    ...request,
    width: numberOrDefault(request.width, 128),
    height: numberOrDefault(request.height, numberOrDefault(request.width, 128)),
    background: request.background ?? 'transparent'
  };
}

function validateBatchRequest(body: unknown): Record<string, unknown> {
  const request = requireObject(body, 'Request body');
  if (!Array.isArray(request.items)) throw new Error('items must be an array.');
  return {
    ...request,
    width: numberOrDefault(request.width, 128),
    height: numberOrDefault(request.height, numberOrDefault(request.width, 128)),
    background: request.background ?? 'transparent'
  };
}

function validateScoreRequest(body: unknown): Record<string, unknown> {
  const request = requireObject(body, 'Request body');
  if (typeof request.targetPngBase64 !== 'string' || !request.targetPngBase64) {
    throw new Error('targetPngBase64 is required.');
  }
  if (!Object.prototype.hasOwnProperty.call(request, 'candidate')) throw new Error('candidate is required.');
  if (!Array.isArray(request.metrics)) throw new Error('metrics must be an array.');
  return {
    ...request,
    background: request.background ?? 'transparent'
  };
}

function validateAblationRequest(body: unknown): Record<string, unknown> {
  const request = requireObject(body, 'Request body');
  if (!Object.prototype.hasOwnProperty.call(request, 'payload')) throw new Error('payload is required.');
  if (!Array.isArray(request.modes)) throw new Error('modes must be an array.');
  return {
    ...request,
    width: numberOrDefault(request.width, 128),
    height: numberOrDefault(request.height, numberOrDefault(request.width, 128)),
    background: request.background ?? 'transparent'
  };
}

class BrowserRenderer {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private booting: Promise<Page> | null = null;

  async getPage(): Promise<Page> {
    if (this.page && !this.page.isClosed()) return this.page;
    if (this.booting) return this.booting;
    this.booting = this.boot();
    try {
      return await this.booting;
    } finally {
      this.booting = null;
    }
  }

  async restart(): Promise<Page> {
    await this.close();
    return this.getPage();
  }

  async close(): Promise<void> {
    const browser = this.browser;
    this.page = null;
    this.browser = null;
    if (browser) {
      await browser.close().catch(() => undefined);
    }
  }

  async call<T>(method: EvaluateMethod, payload?: unknown, retry = true): Promise<T> {
    try {
      const page = await this.getPage();
      return await page.evaluate(
        ({ methodName, arg }) => {
          const renderer = (window as any).__TWROLE_RENDER_TO_DATA_URL__;
          if (!renderer?.ready) throw new Error('Browser renderer is not ready.');
          const fn = renderer[methodName as keyof typeof renderer];
          if (typeof fn !== 'function') throw new Error(`Renderer method ${methodName} is not available.`);
          return (fn as (value?: unknown) => unknown)(arg);
        },
        { methodName: method, arg: payload }
      ) as T;
    } catch (error) {
      if (!retry) throw error;
      await this.restart();
      return this.call<T>(method, payload, false);
    }
  }

  private async boot(): Promise<Page> {
    const browser = await chromium.launch({
      headless: true,
      args: ['--disable-dev-shm-usage']
    });
    const page = await browser.newPage({
      viewport: { width: 512, height: 512 },
      deviceScaleFactor: 1
    });
    page.on('close', () => {
      if (this.page === page) this.page = null;
    });
    browser.on('disconnected', () => {
      if (this.browser === browser) {
        this.browser = null;
        this.page = null;
      }
    });

    await page.goto(defaultAppUrl(), { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForFunction(() => (window as any).__TWROLE_RENDER_TO_DATA_URL__?.ready === true, null, { timeout: 60_000 });
    this.browser = browser;
    this.page = page;
    return page;
  }
}

const renderer = new BrowserRenderer();
const commit = getCommit();

async function healthPayload(): Promise<Record<string, unknown>> {
  const info = await renderer.call<RendererInfo>('getRendererInfo');
  return {
    ok: true,
    renderer: RENDERER_NAME,
    commit,
    pixiReady: info.pixiReady,
    assetsReady: info.assetsReady,
    version: RENDERER_VERSION,
    rendererBackend: RENDERER_BACKEND,
    roleEditorCommit: commit,
    assetManifestHash: info.assetManifestHash,
    canvasSize: info.canvasSize,
    renderMode: info.renderMode
  };
}

function sendError(response: Response, status: number, error: unknown): void {
  response.status(status).json({ ok: false, error: errorMessage(error) });
}

async function handleJson<T>(
  response: Response,
  action: () => Promise<T>
): Promise<void> {
  try {
    response.json(await action());
  } catch (error) {
    sendError(response, 500, error);
  }
}

const app = express();
app.use(express.json({ limit: BODY_LIMIT }));

app.get('/health', (_request, response) => {
  void handleJson(response, () => enqueue({ run: healthPayload }));
});

app.post('/render-role', (request: Request, response: Response) => {
  let payload: Record<string, unknown>;
  try {
    payload = validateRenderRoleRequest(request.body);
  } catch (error) {
    sendError(response, 400, error);
    return;
  }
  void handleJson(response, () => enqueue({ run: () => renderer.call('renderRole', payload) }));
});

app.post('/render-role-batch', (request: Request, response: Response) => {
  let payload: Record<string, unknown>;
  try {
    payload = validateBatchRequest(request.body);
  } catch (error) {
    sendError(response, 400, error);
    return;
  }
  void handleJson(response, () => enqueue({ run: () => renderer.call('renderRoleBatch', payload) }));
});

app.post('/score-role', (request: Request, response: Response) => {
  let payload: Record<string, unknown>;
  try {
    payload = validateScoreRequest(request.body);
  } catch (error) {
    sendError(response, 400, error);
    return;
  }
  void handleJson(response, () => enqueue({ run: () => renderer.call('scoreRole', payload) }));
});

app.post('/render-ablation', (request: Request, response: Response) => {
  let payload: Record<string, unknown>;
  try {
    payload = validateAblationRequest(request.body);
  } catch (error) {
    sendError(response, 400, error);
    return;
  }
  void handleJson(response, () => enqueue({ run: () => renderer.call('renderAblation', payload) }));
});

if (existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get(/.*/, (_request, response) => {
    response.sendFile(path.join(distDir, 'index.html'));
  });
}

const server = app.listen(PORT, () => {
  console.log(`Renderer service listening on http://127.0.0.1:${PORT}`);
  console.log(`Renderer app URL: ${defaultAppUrl()}`);
  void renderer.getPage().catch((error) => {
    console.error(`Renderer boot failed: ${errorMessage(error)}`);
  });
});

function shutdown(): void {
  server.close(() => {
    void renderer.close().finally(() => process.exit(0));
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
