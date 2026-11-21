import { defineConfig, devices } from '@playwright/test';

const baseURL = 'http://127.0.0.1:4174';
const executablePath = process.env.EDITOR_BENCH_CHROMIUM;

export default defineConfig({
  testDir: './benchmarks',
  testMatch: '**/*.bench.ts',
  outputDir: './test-results/editor-benchmark',
  timeout: 180_000,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    ...(executablePath ? { launchOptions: { executablePath } } : {})
  },
  webServer: {
    // Run npm run build first so cold load measures deployed-style chunks.
    command: 'node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4174 --strictPort',
    url: baseURL,
    reuseExistingServer: false,
    timeout: 15_000
  }
});
