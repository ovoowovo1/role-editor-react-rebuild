import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const colorBlockApiProxyTarget = process.env.COLOR_BLOCK_API_PROXY_TARGET ?? 'http://127.0.0.1:8787';

/** A URL stub may ship with the loader, but the actual timelines must not. */
function guardWeaponRuntimeBoundary(): Plugin {
  const dataName = 'gafWeaponRuntimeManifest.json';
  return {
    name: 'guard-weapon-runtime-boundary',
    apply: 'build',
    generateBundle: {
      order: 'post',
      handler(_options, bundle) {
        const weaponAsset = Object.values(bundle).find((entry) =>
          entry.type === 'asset' && /(?:^|\/)gafWeaponRuntimeManifest-[\w-]+\.json$/.test(entry.fileName)
        );
        if (!weaponAsset) this.error('Expected a separate hashed GAF weapon JSON asset.');
        const assetBaseName = weaponAsset.fileName.split('/').pop()!;
        for (const entry of Object.values(bundle)) {
          if (entry.type !== 'chunk') continue;
          const modules = Object.keys(entry.modules).map((id) => id.replace(/\\/g, '/'));
          for (const id of modules) {
            const [source, query = ''] = id.split('?');
            if (source.endsWith(`/generated/${dataName}`) && !new URLSearchParams(query).has('url')) {
              this.error(`Weapon runtime data is embedded in ${entry.fileName}; use the on-demand URL loader.`);
            }
          }
          if (entry.code.includes(assetBaseName) && !modules.some((id) => id.endsWith('/weaponRuntimeManifest.ts'))) {
            this.error(`Only the deferred weapon runtime loader may reference the JSON asset (${entry.fileName}).`);
          }
        }
      }
    }
  };
}

function guardRoleImportClientBoundary(): Plugin {
  return {
    name: 'guard-role-import-client-boundary',
    apply: 'build',
    generateBundle: {
      order: 'post',
      handler(_options, bundle) {
        const visited = new Set<string>();
        const visit = (fileName: string): void => {
          if (visited.has(fileName)) return;
          visited.add(fileName);
          const entry = bundle[fileName];
          if (!entry || entry.type !== 'chunk') return;
          const ids = Object.keys(entry.modules).map((id) => id.replace(/\\/g, '/'));
          if (ids.some((id) => id.endsWith('/roleSerializationImport.ts') ||
                              id.endsWith('/rolePayloadDecoder.ts') ||
                              id.includes('/node_modules/pako/'))) {
            this.error(`Worker import success must not statically load the main-thread role parser (${fileName}).`);
          }
          for (const dependency of entry.imports) visit(dependency);
        };
        const client = Object.values(bundle).find((entry) => entry.type === 'chunk' &&
          Object.keys(entry.modules).some((id) => id.replace(/\\/g, '/').endsWith('/roleImportClient.ts')));
        if (!client) this.error('Expected a role import Worker client chunk.');
        visit(client.fileName);
      }
    }
  };
}

export default defineConfig({
  plugins: [react(), guardWeaponRuntimeBoundary(), guardRoleImportClientBoundary()],
  build: {
    chunkSizeWarningLimit: 5000,
    rollupOptions: {
      input: {
        index: fileURLToPath(new URL('./index.html', import.meta.url)),
        batchRender: fileURLToPath(new URL('./batch-render.html', import.meta.url))
      },
      output: {
        manualChunks(id) {
          if (id.indexOf('src/generated/gafRuntimeManifest.json') >= 0 || id.indexOf('src\\generated\\gafRuntimeManifest.json') >= 0) {
            return 'gaf-runtime';
          }
          if (id.indexOf('src/generated/gafManifest.json') >= 0 || id.indexOf('src\\generated\\gafManifest.json') >= 0) {
            return 'gaf-metadata';
          }
          if (id.indexOf('node_modules') < 0) return;
          if (/[\\/]node_modules[\\/]chart\.js[\\/]/.test(id)) return 'chart-vendor';
          if (id.indexOf('node_modules/react/') >= 0 || id.indexOf('node_modules/react-dom/') >= 0) return 'react-vendor';
          if (id.indexOf('node_modules/pixi.js/') >= 0) return 'pixi-vendor';
          if (id.indexOf('node_modules/pako/') >= 0) return 'codec-vendor';
        }
      }
    }
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api/color-block-presets': {
        target: colorBlockApiProxyTarget,
        changeOrigin: true
      }
    }
  }
});
