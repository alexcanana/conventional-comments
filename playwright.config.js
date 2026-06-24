const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  projects: [
    {
      name: 'unit',
      testDir: './tests',
      testIgnore: ['**/e2e/**'],
      use: { headless: true },
    },
    {
      name: 'e2e-setup',
      testDir: './tests/e2e',
      testMatch: /setup\.ts$/,
    },
    {
      name: 'e2e',
      testDir: './tests/e2e',
      testMatch: /\.spec\.ts$/,
      dependencies: ['e2e-setup'],
    },
  ],
});
