import { defineConfig, devices } from '@playwright/test';

// The installable web app (`make build-webapp`) on a static server with its host headers: no
// scoring server exists, so the phoneme model is downloaded into the browser and every take is
// scored on the device. Heavy (357 MB model), so it runs on its own: `make e2e-webapp`.
const fakeMedia = [
  '--use-fake-device-for-media-stream',
  '--use-fake-ui-for-media-stream',
  '--use-file-for-fake-audio-capture=e2e/fixtures/think.wav',
];
const port = Number(process.env.WEBAPP_PORT ?? 3300);

export default defineConfig({
  testDir: './e2e/webapp',
  globalSetup: './e2e/global-setup.ts',
  timeout: 600_000,
  expect: { timeout: 15_000 },
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${String(port)}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    permissions: ['camera', 'microphone'],
  },
  webServer: {
    command: `node scripts/serve-webapp.mjs ${String(port)}`,
    url: `http://127.0.0.1:${String(port)}/`,
    reuseExistingServer: true,
  },
  projects: [
    {
      name: 'webapp-mobile',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        launchOptions: { args: fakeMedia },
      },
    },
  ],
});
