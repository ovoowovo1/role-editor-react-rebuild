import express from 'express';
import { existsSync } from 'node:fs';
import path from 'node:path';
export const DEFAULT_BODY_LIMIT = '25mb';
export const RENDERER_NAME = 'role-editor-react-rebuild';
export const RENDERER_VERSION = 'v1';
export const RENDERER_BACKEND = 'node-express-playwright-chromium';
export function createTaskQueue() {
    let chain = Promise.resolve();
    return {
        enqueue(task) {
            const next = chain.then(task.run, task.run);
            chain = next.catch(() => undefined);
            return next;
        }
    };
}
function errorMessage(error) {
    return error instanceof Error ? error.message : String(error);
}
function isObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function requireObject(value, label) {
    if (!isObject(value))
        throw new Error(`${label} must be an object.`);
    return value;
}
function numberOrDefault(value, fallback) {
    const numeric = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
    return Number.isFinite(numeric) && numeric > 0 ? Math.round(numeric) : fallback;
}
export function validateRenderRoleRequest(body) {
    const request = requireObject(body, 'Request body');
    if (!Object.prototype.hasOwnProperty.call(request, 'payload'))
        throw new Error('payload is required.');
    return {
        ...request,
        width: numberOrDefault(request.width, 128),
        height: numberOrDefault(request.height, numberOrDefault(request.width, 128)),
        background: request.background ?? 'transparent'
    };
}
export function validateBatchRequest(body) {
    const request = requireObject(body, 'Request body');
    if (!Array.isArray(request.items))
        throw new Error('items must be an array.');
    return {
        ...request,
        width: numberOrDefault(request.width, 128),
        height: numberOrDefault(request.height, numberOrDefault(request.width, 128)),
        background: request.background ?? 'transparent'
    };
}
export function validateScoreRequest(body) {
    const request = requireObject(body, 'Request body');
    if (typeof request.targetPngBase64 !== 'string' || !request.targetPngBase64) {
        throw new Error('targetPngBase64 is required.');
    }
    if (!Object.prototype.hasOwnProperty.call(request, 'candidate'))
        throw new Error('candidate is required.');
    if (!Array.isArray(request.metrics))
        throw new Error('metrics must be an array.');
    return {
        ...request,
        background: request.background ?? 'transparent'
    };
}
export function validateAblationRequest(body) {
    const request = requireObject(body, 'Request body');
    if (!Object.prototype.hasOwnProperty.call(request, 'payload'))
        throw new Error('payload is required.');
    if (!Array.isArray(request.modes))
        throw new Error('modes must be an array.');
    return {
        ...request,
        width: numberOrDefault(request.width, 128),
        height: numberOrDefault(request.height, numberOrDefault(request.width, 128)),
        background: request.background ?? 'transparent'
    };
}
export async function healthPayload(renderer, commit) {
    const info = await renderer.call('getRendererInfo');
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
function sendError(response, status, error) {
    response.status(status).json({ ok: false, error: errorMessage(error) });
}
async function handleJson(response, action) {
    try {
        response.json(await action());
    }
    catch (error) {
        sendError(response, 500, error);
    }
}
export function createRendererApp(options) {
    const { renderer, commit, bodyLimit = DEFAULT_BODY_LIMIT, staticDir } = options;
    const queue = options.queue ?? createTaskQueue();
    const app = express();
    app.use(express.json({ limit: bodyLimit }));
    app.get('/health', (_request, response) => {
        void handleJson(response, () => queue.enqueue({ run: () => healthPayload(renderer, commit) }));
    });
    app.post('/render-role', (request, response) => {
        let payload;
        try {
            payload = validateRenderRoleRequest(request.body);
        }
        catch (error) {
            sendError(response, 400, error);
            return;
        }
        void handleJson(response, () => queue.enqueue({ run: () => renderer.call('renderRole', payload) }));
    });
    app.post('/render-role-batch', (request, response) => {
        let payload;
        try {
            payload = validateBatchRequest(request.body);
        }
        catch (error) {
            sendError(response, 400, error);
            return;
        }
        void handleJson(response, () => queue.enqueue({ run: () => renderer.call('renderRoleBatch', payload) }));
    });
    app.post('/score-role', (request, response) => {
        let payload;
        try {
            payload = validateScoreRequest(request.body);
        }
        catch (error) {
            sendError(response, 400, error);
            return;
        }
        void handleJson(response, () => queue.enqueue({ run: () => renderer.call('scoreRole', payload) }));
    });
    app.post('/render-ablation', (request, response) => {
        let payload;
        try {
            payload = validateAblationRequest(request.body);
        }
        catch (error) {
            sendError(response, 400, error);
            return;
        }
        void handleJson(response, () => queue.enqueue({ run: () => renderer.call('renderAblation', payload) }));
    });
    if (staticDir && existsSync(staticDir)) {
        app.use(express.static(staticDir));
        app.get(/.*/, (_request, response) => {
            response.sendFile(path.join(staticDir, 'index.html'));
        });
    }
    return app;
}
