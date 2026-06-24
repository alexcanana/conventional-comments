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

const storedTrigger = (page: import('@playwright/test').Page) =>
  page.evaluate(async () => {
    const result = (await chrome.storage.sync.get('options')) as {
      options?: { triggerKeyword?: string };
    };

    return result.options?.triggerKeyword;
  });

test('Save is disabled until the trigger changes', async ({ page }) => {
  await installPopupChrome(page, { url: 'https://github.com/x', options: DEFAULT_OPTIONS });
  await page.goto(popupUrl(server));

  await expect(page.getByTestId('popup-trigger-save')).toBeDisabled();

  await page.getByTestId('popup-trigger-input').fill('todo');
  await expect(page.getByTestId('popup-trigger-save')).toBeEnabled();
});

test('saving a valid trigger persists it and shows the saved message', async ({ page }) => {
  await installPopupChrome(page, { url: 'https://github.com/x', options: DEFAULT_OPTIONS });
  await page.goto(popupUrl(server));

  await page.getByTestId('popup-trigger-input').fill('todo');
  await page.getByTestId('popup-trigger-save').click();

  await expect(page.getByTestId('popup-trigger-saved')).toBeVisible();
  await expect.poll(() => storedTrigger(page)).toBe('todo');
});

test('an invalid trigger shows an error, disables Save, and persists nothing', async ({ page }) => {
  await installPopupChrome(page, { url: 'https://github.com/x', options: DEFAULT_OPTIONS });
  await page.goto(popupUrl(server));

  await page.getByTestId('popup-trigger-input').fill('cc1');

  await expect(page.getByTestId('popup-trigger-error')).toBeVisible();
  await expect(page.getByTestId('popup-trigger-save')).toBeDisabled();
  expect(await storedTrigger(page)).toBe('cc');
});

test('saving the trigger preserves option changes made after the popup opened', async ({
  page,
}) => {
  await installPopupChrome(page, { url: 'https://github.com/x', options: DEFAULT_OPTIONS });
  await page.goto(popupUrl(server));

  // The options page edits the label list after the popup has snapshotted options.
  await page.evaluate((options) => chrome.storage.sync.set({ options }), {
    ...DEFAULT_OPTIONS,
    labels: [{ key: 'custom', description: 'only one', isEnabled: true, sortOrder: 0 }],
  });

  await page.getByTestId('popup-trigger-input').fill('todo');
  await page.getByTestId('popup-trigger-save').click();
  await expect(page.getByTestId('popup-trigger-saved')).toBeVisible();

  const storedLabels = await page.evaluate(async () => {
    const result = (await chrome.storage.sync.get('options')) as {
      options?: { labels?: { key: string }[] };
    };

    return (result.options?.labels ?? []).map((label) => label.key);
  });

  expect(storedLabels).toEqual(['custom']);
  expect(await storedTrigger(page)).toBe('todo');
});
