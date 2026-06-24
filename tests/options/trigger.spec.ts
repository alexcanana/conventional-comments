import { test, expect } from '@playwright/test';
import { startOptionsServer, installPageChrome, type OptionsServer } from './helpers';
import { DEFAULT_OPTIONS } from '../../src/lib/options';

let server: OptionsServer;
test.beforeAll(async () => {
  server = await startOptionsServer();
});
test.afterAll(async () => {
  await server.close();
});

test('trigger Save is disabled for an invalid keyword and enabled for a valid one', async ({
  page,
}) => {
  await page.goto(server.url);
  const input = page.getByTestId('trigger-input');
  const save = page.getByTestId('trigger-save');
  await input.fill('c1');
  await expect(save).toBeDisabled();
  await input.fill('cc');
  await expect(save).toBeDisabled();
  await input.fill('qq');
  await expect(save).toBeEnabled();
});

test('the default keyword in the hint renders as styled code', async ({ page }) => {
  await page.goto(server.url);
  const code = page.getByTestId('trigger-hint-code');
  await expect(code).toHaveText('cc');
  const borderWidth = await code.evaluate((node) => getComputedStyle(node).borderTopWidth);
  expect(borderWidth).not.toBe('0px');
});

test('pressing Escape reverts the trigger edit', async ({ page }) => {
  await page.goto(server.url);
  const input = page.getByTestId('trigger-input');
  await input.fill('zz');
  await input.press('Escape');
  await expect(input).toHaveValue('cc');
});

test('an external trigger change does not overwrite an in-progress edit', async ({ page }) => {
  await installPageChrome(page);
  await page.goto(server.url);
  const input = page.getByTestId('trigger-input');
  await input.fill('xx');

  // Another surface (the popup or service worker) writes a new trigger while the
  // user is mid-edit — the unsaved draft must survive.
  await page.evaluate((options) => chrome.storage.sync.set({ options }), {
    ...DEFAULT_OPTIONS,
    triggerKeyword: 'zz',
  });

  await expect(input).toHaveValue('xx');
});
