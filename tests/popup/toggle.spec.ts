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

const storedOrigins = (page: import('@playwright/test').Page) =>
  page.evaluate(async () => {
    const result = (await chrome.storage.sync.get('options')) as {
      options?: { allowedOrigins?: string[] };
    };

    return result.options?.allowedOrigins ?? [];
  });

const storedDisabledOrigins = (page: import('@playwright/test').Page) =>
  page.evaluate(async () => {
    const result = (await chrome.storage.sync.get('options')) as {
      options?: { disabledOrigins?: string[] };
    };

    return result.options?.disabledOrigins ?? [];
  });

test('enabling a new site requests permission and stores the origin', async ({ page }) => {
  await installPopupChrome(page, {
    url: 'https://example.com/page',
    options: DEFAULT_OPTIONS,
    grantRequests: true,
  });
  await page.goto(popupUrl(server));

  const toggle = page.getByTestId('popup-enabled');
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'true');

  expect(await page.evaluate(() => window.__popup.requested)).toContain('https://example.com/*');
  expect(await storedOrigins(page)).toContain('https://example.com/*');
});

test('denied permission leaves the toggle off and stores nothing', async ({ page }) => {
  await installPopupChrome(page, {
    url: 'https://example.com/page',
    options: DEFAULT_OPTIONS,
    grantRequests: false,
  });
  await page.goto(popupUrl(server));

  const toggle = page.getByTestId('popup-enabled');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  await expect(page.getByTestId('popup-status')).not.toHaveClass(/is-on/);
  expect(await storedOrigins(page)).not.toContain('https://example.com/*');
});

test('enabling a built-in site stores it without a permission prompt', async ({ page }) => {
  await installPopupChrome(page, {
    url: 'https://github.com/owner/repo',
    options: { ...DEFAULT_OPTIONS, allowedOrigins: ['https://gitlab.com/*'] },
    granted: ['https://github.com/*'],
  });
  await page.goto(popupUrl(server));

  const toggle = page.getByTestId('popup-enabled');
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'true');

  expect(await page.evaluate(() => window.__popup.requested)).toHaveLength(0);
  expect(await storedOrigins(page)).toContain('https://github.com/*');
});

test('disabling a site moves it to disabledOrigins and keeps it off', async ({ page }) => {
  await installPopupChrome(page, {
    url: 'https://github.com/owner/repo',
    options: DEFAULT_OPTIONS,
    granted: ['https://github.com/*'],
  });
  await page.goto(popupUrl(server));

  const toggle = page.getByTestId('popup-enabled');
  await expect(toggle).toHaveAttribute('aria-checked', 'true');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  expect(await storedOrigins(page)).not.toContain('https://github.com/*');
  expect(await storedDisabledOrigins(page)).toContain('https://github.com/*');
});
