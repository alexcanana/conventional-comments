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

test('shows active status on an enabled built-in site', async ({ page }) => {
  await installPopupChrome(page, {
    url: 'https://github.com/owner/repo/pull/1',
    options: DEFAULT_OPTIONS,
    granted: ['https://github.com/*'],
  });
  await page.goto(popupUrl(server));
  await expect(page.getByTestId('popup-status')).toHaveText(/Active on github\.com/);
});

test('shows off status when the site is not in allowedOrigins', async ({ page }) => {
  await installPopupChrome(page, {
    url: 'https://example.com/page',
    options: DEFAULT_OPTIONS,
  });
  await page.goto(popupUrl(server));
  await expect(page.getByTestId('popup-status')).toHaveText(/Off on example\.com/);
});

test('shows not-available status on a browser-internal page', async ({ page }) => {
  await installPopupChrome(page, {
    url: 'chrome://extensions',
    options: DEFAULT_OPTIONS,
  });
  await page.goto(popupUrl(server));
  await expect(page.getByTestId('popup-status')).toHaveText(/Not available on this page/);
});
