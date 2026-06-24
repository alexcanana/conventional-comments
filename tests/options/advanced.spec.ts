import { test, expect } from '@playwright/test';
import { startOptionsServer, installPageChrome, type OptionsServer } from './helpers';

let server: OptionsServer;
test.beforeAll(async () => {
  server = await startOptionsServer();
});
test.afterAll(async () => {
  await server.close();
});

test('resetting all options also clears label usage counts', async ({ page }) => {
  await installPageChrome(page);
  await page.goto(server.url);

  // Seed a usage count in local storage (where it lives, separate from options).
  await page.evaluate(() => chrome.storage.local.set({ labelUsageCounts: { praise: 3 } }));

  await page.getByTestId('reset-all').click();
  const modal = page.getByTestId('confirm-dialog');
  await expect(modal).toContainText('Reset all settings?');
  await page.getByTestId('confirm-accept').click();
  await expect(page.getByTestId('toasts')).toContainText('Settings reset to defaults');

  const counts = await page.evaluate(() => chrome.storage.local.get('labelUsageCounts'));
  expect(counts.labelUsageCounts ?? {}).toEqual({});
});
