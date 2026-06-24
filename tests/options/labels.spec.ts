import { test, expect } from '@playwright/test';
import { startOptionsServer, installPageChrome, type OptionsServer } from './helpers';

let server: OptionsServer;
test.beforeAll(async () => {
  server = await startOptionsServer();
});
test.afterAll(async () => {
  await server.close();
});

test('toggling a label eye hides/dims its row', async ({ page }) => {
  await installPageChrome(page);
  await page.goto(server.url);
  const labels = page.getByTestId('section-labels');
  const firstRow = labels.getByTestId('row').first();
  await firstRow.getByTestId('row-visibility').click();
  await expect(firstRow).toHaveAttribute('data-enabled', 'false');
});

test('deleting a label asks for confirmation, then removes it with a toast', async ({ page }) => {
  await installPageChrome(page);
  await page.goto(server.url);
  const labels = page.getByTestId('section-labels');
  const rows = labels.getByTestId('row');
  const before = await rows.count();
  const firstName = (await rows.first().getByTestId('row-name').innerText()).trim();

  await rows.first().getByTestId('row-remove').click();
  const modal = page.getByTestId('confirm-dialog');
  await expect(modal).toBeVisible();
  await expect(modal).toContainText('Remove this label?');

  await page.getByTestId('confirm-accept').click();
  await expect(page.getByTestId('toasts')).toContainText('removed');
  await expect(rows).toHaveCount(before - 1);
  await expect(labels.getByTestId('row-name').filter({ hasText: firstName })).toHaveCount(0);
});

test('canceling a label delete keeps the row', async ({ page }) => {
  await installPageChrome(page);
  await page.goto(server.url);
  const labels = page.getByTestId('section-labels');
  const rows = labels.getByTestId('row');
  const before = await rows.count();
  await rows.first().getByTestId('row-remove').click();
  await page.getByTestId('confirm-cancel').click();
  await expect(page.getByTestId('confirm-dialog')).toHaveCount(0);
  await expect(rows).toHaveCount(before);
});

test('saving a label edit shows a toast', async ({ page }) => {
  await installPageChrome(page);
  await page.goto(server.url);
  const labels = page.getByTestId('section-labels');
  await labels.getByTestId('row-edit').first().click();
  await labels.getByTestId('row-edit-title').fill('praise-renamed');
  await labels.getByTestId('row-confirm').click();
  await expect(page.getByTestId('toasts')).toContainText('updated');
});

test('adding a label shows a success toast', async ({ page }) => {
  await installPageChrome(page);
  await page.goto(server.url);
  await page.getByTestId('add-label').click();
  await page.getByTestId('add-form-title').fill('risk');
  await page.getByTestId('add-form-submit').click();
  await expect(page.getByTestId('toasts')).toContainText('Label added');
});

test('pressing Escape cancels the add form', async ({ page }) => {
  await page.goto(server.url);
  await page.getByTestId('add-label').click();
  const form = page.getByTestId('add-form');
  await expect(form).toBeVisible();
  await page.getByTestId('add-form-title').press('Escape');
  await expect(form).toHaveCount(0);
});

test('resetting usage counts asks for confirmation', async ({ page }) => {
  await installPageChrome(page);
  await page.goto(server.url);
  await page.getByTestId('reset-counts').click();
  const modal = page.getByTestId('confirm-dialog');
  await expect(modal).toBeVisible();
  await expect(modal).toContainText('Reset usage counts?');
  await page.getByTestId('confirm-accept').click();
  await expect(page.getByTestId('toasts')).toContainText('Usage counts reset');
});
