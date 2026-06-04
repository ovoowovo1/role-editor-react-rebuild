import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRendererApp, DEFAULT_BODY_LIMIT } from './serverCore.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const distDir = path.join(repoRoot, 'dist');
const PORT = Number(process.env.RENDERER_PORT ?? process.env.PORT ?? 9321);
const BODY_LIMIT = process.env.RENDERER_BODY_LIMIT ?? DEFAULT_BODY_LIMIT;
function getCommit() {
    try {
        return execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
            cwd: repoRoot,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore']
        }).trim();
    }
    catch {
        return process.env.RENDERER_COMMIT ?? 'unknown';
    }
}
function defaultAppUrl() {
    return process.env.RENDERER_APP_URL ?? `http://127.0.0.1:${PORT}/batch-render`;
}
function errorMessage(error) {
    return error instanceof Error ? error.message : String(error);
}
class BrowserRenderer {
    browser = null;
    page = null;
    booting = null;
    async getPage() {
        if (this.page && !this.page.isClosed())
            return this.page;
        if (this.booting)
            return this.booting;
        this.booting = this.boot();
        try {
            return await this.booting;
        }
        finally {
            this.booting = null;
        }
    }
    async restart() {
        await this.close();
        return this.getPage();
    }
    async close() {
        const browser = this.browser;
        this.page = null;
        this.browser = null;
        if (browser) {
            await browser.close().catch(() => undefined);
        }
    }
    async call(method, payload, retry = true) {
        try {
            const page = await this.getPage();
            return await page.evaluate(({ methodName, arg }) => {
                const renderer = window.__TWROLE_RENDER_TO_DATA_URL__;
                if (!renderer?.ready)
                    throw new Error('Browser renderer is not ready.');
                const fn = renderer[methodName];
                if (typeof fn !== 'function')
                    throw new Error(`Renderer method ${methodName} is not available.`);
                return fn(arg);
            }, { methodName: method, arg: payload });
        }
        catch (error) {
            if (!retry)
                throw error;
            await this.restart();
            return this.call(method, payload, false);
        }
    }
    async boot() {
        const browser = await chromium.launch({
            headless: true,
            args: ['--disable-dev-shm-usage']
        });
        const page = await browser.newPage({
            viewport: { width: 512, height: 512 },
            deviceScaleFactor: 1
        });
        page.on('close', () => {
            if (this.page === page)
                this.page = null;
        });
        browser.on('disconnected', () => {
            if (this.browser === browser) {
                this.browser = null;
                this.page = null;
            }
        });
        await page.goto(defaultAppUrl(), { waitUntil: 'domcontentloaded', timeout: 60_000 });
        await page.waitForFunction(() => window.__TWROLE_RENDER_TO_DATA_URL__?.ready === true, null, { timeout: 60_000 });
        this.browser = browser;
        this.page = page;
        return page;
    }
}
const renderer = new BrowserRenderer();
const app = createRendererApp({
    renderer,
    commit: getCommit(),
    bodyLimit: BODY_LIMIT,
    staticDir: distDir
});
const server = app.listen(PORT, () => {
    console.log(`Renderer service listening on http://127.0.0.1:${PORT}`);
    console.log(`Renderer app URL: ${defaultAppUrl()}`);
    void renderer.getPage().catch((error) => {
        console.error(`Renderer boot failed: ${errorMessage(error)}`);
    });
});
function shutdown() {
    server.close(() => {
        void renderer.close().finally(() => process.exit(0));
    });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
