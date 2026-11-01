import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:5199' },
  webServer: {
    command: 'bun build/index.js',
    url: 'http://127.0.0.1:5199',
    env: {
      PORT: '5199',
      HOST: '127.0.0.1',
      ORIGIN: 'http://127.0.0.1:5199',
      DATABASE_PATH: ':memory:',
    },
  },
});
