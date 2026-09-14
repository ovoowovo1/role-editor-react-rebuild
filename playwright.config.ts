import fs from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

// Some managed Windows environments prevent Playwright's downloaded
// headless-shell from being spawned (`spawn EPERM`).  Prefer the installed
// Chrome binary there; CI on Linux continues to use the browser installed by
// `playwright install --with-deps chromium`.
const systemChromePath =
  process.platform === 'win32'
    ? [
        `${process.env.ProgramFiles ?? 'C:\\Program Files'}\\Google\\Chrome\\Application\\chrome.exe`,
        `${process.env['ProgramFiles(x86)'] ?? 'C:\\Program Files (x86)'}\\Google\\Chrome\\Application\\chrome.exe`,
        `${process.env.LOCALAPPDATA ?? ''}\\Google\\Chrome\\Application\\chrome.exe`
      ].find((candidate) => candidate && fs.existsSync(candidate))
    : undefined;

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  outputDir: './test-results/playwright',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['github'], ['list']] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:5174',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // The managed Windows runner blocks Playwright's ffmpeg child process,
    // which otherwise surfaces as `browserContext.close: spawn EPERM` after a
    // test has completed. CI keeps video artefacts for failed runs.
    video: process.env.CI ? 'retain-on-failure' : 'off'
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        ...(systemChromePath
          ? { launchOptions: { executablePath: systemChromePath } }
          : {})
      }
    }
  ],
  webServer: {
    command: 'npx vite --host 127.0.0.1 --port 5174',
    url: 'http://127.0.0.1:5174',
    // A local Vite server may already be running from `npm run dev`. Reuse it
    // for local E2E runs, while CI always starts and owns a clean server.
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  }
});
