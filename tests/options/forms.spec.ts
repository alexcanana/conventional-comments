import { test, expect } from '@playwright/test';
import { startOptionsServer, installPageChrome, type OptionsServer } from './helpers';

type StoredOptions = { labels: { key: string; description: string }[] };

let server: OptionsServer;
test.beforeAll(async () => {
  server = await startOptionsServer();
});
test.afterAll(async () => {
  await server.close();
});

test('the add form trims the description before saving', async ({ page }) => {
  await installPageChrome(page);
  await page.goto(server.url);

  await page.getByTestId('add-label').click();
  await page.getByTestId('add-form-title').fill('risk');
  await page.getByTestId('add-form-description').fill('  danger  ');
  await page.getByTestId('add-form-submit').click();

  const description = await page.evaluate(async () => {
    type SyncStorage = { get: (key: string) => Promise<{ options: StoredOptions }> };
    const storage = (globalThis as unknown as { chrome: { storage: { sync: SyncStorage } } }).chrome
      .storage.sync;
    const result = await storage.get('options');

    return result.options.labels.find((label) => label.key === 'risk')?.description;
  });

  expect(description).toBe('danger');
});
