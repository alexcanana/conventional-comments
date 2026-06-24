import { test, expect } from '@playwright/test';
import { startOptionsServer, installPageChrome, type OptionsServer } from './helpers';

let server: OptionsServer;
test.beforeAll(async () => {
  server = await startOptionsServer();
});
test.afterAll(async () => {
  await server.close();
});

test('deleting a decoration asks for confirmation, then removes it with a toast', async ({
  page,
}) => {
  await installPageChrome(page);
  await page.goto(server.url);
  const decorations = page.getByTestId('section-decorations');
  const rows = decorations.getByTestId('row');
  const before = await rows.count();

  await rows.first().getByTestId('row-remove').click();
  const modal = page.getByTestId('confirm-dialog');
  await expect(modal).toBeVisible();
  await expect(modal).toContainText('Remove this decoration?');

  await page.getByTestId('confirm-accept').click();
  await expect(page.getByTestId('toasts')).toContainText('removed');
  await expect(rows).toHaveCount(before - 1);
});

test('adding a decoration shows a success toast', async ({ page }) => {
  await installPageChrome(page);
  await page.goto(server.url);
  await page.getByTestId('add-decoration').click();
  await page.getByTestId('add-form-title').fill('workflow');
  await page.getByTestId('add-form-submit').click();
  await expect(page.getByTestId('toasts')).toContainText('Decoration added');
});
