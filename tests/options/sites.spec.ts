import { test, expect } from '@playwright/test';
import { startOptionsServer, installPageChrome, type OptionsServer } from './helpers';

type Perms = { granted: string[]; removed: string[] };
const readPerms = (page: import('@playwright/test').Page) =>
  page.evaluate(() => (window as unknown as { __perms: Perms }).__perms);

const storedOptions = (page: import('@playwright/test').Page) =>
  page.evaluate(async () => {
    const result = (await chrome.storage.sync.get('options')) as {
      options?: { allowedOrigins?: string[]; disabledOrigins?: string[] };
    };

    return result.options ?? {};
  });

let server: OptionsServer;
test.beforeAll(async () => {
  server = await startOptionsServer();
});
test.afterAll(async () => {
  await server.close();
});

async function addSite(page: import('@playwright/test').Page, value: string): Promise<void> {
  await page.getByTestId('add-site').click();
  await page.getByTestId('add-form-title').fill(value);
  await page.getByTestId('add-form-submit').click();
}

test('default sites cannot be edited or removed but can be toggled', async ({ page }) => {
  await installPageChrome(page);
  await page.goto(server.url);
  const sites = page.getByTestId('section-sites');
  const githubRow = sites.getByTestId('row').first();

  await expect(githubRow.getByTestId('row-edit')).toBeDisabled();
  await expect(githubRow.getByTestId('row-remove')).toBeDisabled();
  await expect(sites.getByTestId('row-toggle-0')).toBeEnabled();
});

test('toggling a site off keeps it listed and moves it to disabledOrigins', async ({ page }) => {
  await installPageChrome(page);
  await page.goto(server.url);
  const sites = page.getByTestId('section-sites');

  await sites.getByTestId('row-toggle-0').click();

  await expect(sites.getByTestId('row')).toHaveCount(2);
  await expect
    .poll(async () => (await storedOptions(page)).disabledOrigins)
    .toContain('https://github.com/*');
  expect((await storedOptions(page)).allowedOrigins).not.toContain('https://github.com/*');
});

test('editing a custom site grants the new origin and removes the old', async ({ page }) => {
  await installPageChrome(page);
  await page.goto(server.url);
  const sites = page.getByTestId('section-sites');

  await addSite(page, 'gitlab.example.com');
  await expect(sites.getByTestId('row')).toHaveCount(3);

  const customRow = sites.getByTestId('row').nth(2);
  await customRow.getByTestId('row-edit').click();
  await sites.getByTestId('row-edit-title').fill('https://example.com');
  await sites.getByTestId('row-confirm').click();

  await expect(customRow.getByTestId('row-name')).toHaveText('https://example.com');

  const perms = await readPerms(page);
  expect(perms.granted).toContain('https://example.com/*');
  expect(perms.removed).toContain('https://gitlab.example.com/*');
});

test('adding a duplicate site is rejected', async ({ page }) => {
  await installPageChrome(page);
  await page.goto(server.url);
  const sites = page.getByTestId('section-sites');

  await addSite(page, 'https://github.com/*');

  await expect(sites.getByTestId('row')).toHaveCount(2);
});

test('the same host in a different spelling is still a duplicate', async ({ page }) => {
  await installPageChrome(page);
  await page.goto(server.url);
  const sites = page.getByTestId('section-sites');

  await addSite(page, 'github.com');

  await expect(sites.getByTestId('row')).toHaveCount(2);
});

test('a site added without scheme or glob is stored and shown cleanly', async ({ page }) => {
  await installPageChrome(page);
  await page.goto(server.url);
  const sites = page.getByTestId('section-sites');

  await addSite(page, 'gitlab.example.com');

  await expect(sites.getByTestId('row')).toHaveCount(3);
  await expect(sites.getByTestId('row-name')).toContainText(['https://gitlab.example.com']);

  const perms = await readPerms(page);
  expect(perms.granted).toContain('https://gitlab.example.com/*');
});
