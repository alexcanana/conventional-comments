import { test, expect } from '@playwright/test';
import { startOptionsServer, type OptionsServer } from './helpers';

let server: OptionsServer;
test.beforeAll(async () => {
  server = await startOptionsServer();
});
test.afterAll(async () => {
  await server.close();
});

test('Options page renders all five sections', async ({ page }) => {
  await page.goto(server.url);
  for (const id of [
    'section-trigger',
    'section-sites',
    'section-labels',
    'section-decorations',
    'section-advanced',
  ]) {
    await expect(page.getByTestId(id)).toBeVisible();
  }
});
