import { test, expect, enableFixtureOrigin } from './fixtures';

test('the service worker boots when the extension loads', async ({ serviceWorker }) => {
  expect(serviceWorker.url()).toContain('background.js');
});

test('types the trigger, opens the dropdown, and inserts a label', async ({
  page,
  serviceWorker,
  server,
}) => {
  await enableFixtureOrigin(serviceWorker);
  await page.goto(server.url('github.html'));

  const textarea = page.locator('textarea');
  await textarea.click();
  await textarea.fill('cc');

  const items = page.locator('#cc-dropdown .cc-item');
  await expect(page.locator('#cc-dropdown')).toBeVisible();
  await items.nth(2).click(); // suggestion -> decorations
  await expect(items).toHaveCount(7);
  await textarea.press('Enter');
  await expect(textarea).toHaveValue('**suggestion:** ');
});

test('binds a comment editor added to the page after load', async ({
  page,
  serviceWorker,
  server,
}) => {
  await enableFixtureOrigin(serviceWorker);
  await page.goto(server.url('neutral.html'));

  await page.evaluate(() => {
    const textarea = document.createElement('textarea');
    textarea.setAttribute('aria-label', 'Markdown value');
    document.body.appendChild(textarea);
  });

  const textarea = page.locator('textarea[aria-label="Markdown value"]');
  await textarea.click();
  await textarea.fill('cc');
  await expect(page.locator('#cc-dropdown')).toBeVisible();
});
