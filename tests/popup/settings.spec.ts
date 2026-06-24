import { test, expect } from '@playwright/test';
import { startOptionsServer, popupUrl, installPopupChrome, type OptionsServer } from './helpers';
import { DEFAULT_OPTIONS } from '../../src/lib/options';

let server: OptionsServer;
test.beforeAll(async () => {
  server = await startOptionsServer();
});
test.afterAll(async () => {
  await server.close();
});

test('the settings button opens the options page', async ({ page }) => {
  await installPopupChrome(page, { url: 'https://github.com/x', options: DEFAULT_OPTIONS });
  await page.goto(popupUrl(server));

  await page.getByTestId('popup-open-settings').click();
  expect(await page.evaluate(() => window.__popup.openOptionsPage)).toBe(1);
});
