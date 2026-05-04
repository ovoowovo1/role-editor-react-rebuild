import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 5000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.indexOf('src/generated/gafManifest.json') >= 0 || id.indexOf('src\\generated\\gafManifest.json') >= 0) {
            return 'gaf-manifest';
          }
          if (id.indexOf('node_modules') < 0) return;
          if (id.indexOf('node_modules/react/') >= 0 || id.indexOf('node_modules/react-dom/') >= 0) return 'react-vendor';
          if (id.indexOf('node_modules/pixi.js/') >= 0 || id.indexOf('node_modules/@pixi/filter-glow/') >= 0) return 'pixi-vendor';
          if (id.indexOf('node_modules/@dnd-kit/') >= 0) return 'dnd-vendor';
          if (id.indexOf('node_modules/pako/') >= 0) return 'codec-vendor';
        }
      }
    }
  },
  server: {
    host: '0.0.0.0',
    port: 5173
  }
});
