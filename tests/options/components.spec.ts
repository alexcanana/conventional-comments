import { test, expect } from '@playwright/test';
import { startOptionsServer, installPageChrome, type OptionsServer } from './helpers';

let server: OptionsServer;
test.beforeAll(async () => {
  server = await startOptionsServer();
});
test.afterAll(async () => {
  await server.close();
});

test('toggling a switch flips its on state', async ({ page }) => {
  await installPageChrome(page);
  await page.goto(server.url);
  const toggle = page.getByTestId('toggle-label-descriptions');
  await expect(toggle).toHaveAttribute('aria-checked', 'true');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
});

test('inline edit confirm is disabled until a value changes', async ({ page }) => {
  await page.goto(server.url);
  const labels = page.getByTestId('section-labels');
  await labels.getByTestId('row-edit').first().click();
  const confirm = labels.getByTestId('row-confirm');
  await expect(confirm).toBeDisabled();
  const keyInput = labels.getByTestId('row-edit-title');
  await keyInput.fill('praise-renamed');
  await expect(confirm).toBeEnabled();
  await keyInput.fill('praise');
  await expect(confirm).toBeDisabled();
});

test('clicking the edit pencil focuses the title field with the caret at the end', async ({
  page,
}) => {
  await page.goto(server.url);
  const labels = page.getByTestId('section-labels');
  await labels.getByTestId('row-edit').first().click();
  const input = labels.getByTestId('row-edit-title');
  await expect(input).toBeFocused();
  const caretAtEnd = await input.evaluate((node) => {
    const field = node as HTMLInputElement;

    return field.selectionStart === field.value.length && field.selectionEnd === field.value.length;
  });
  expect(caretAtEnd).toBe(true);
});

test('switching the edit to an earlier row still focuses its title field', async ({ page }) => {
  await page.goto(server.url);
  const labels = page.getByTestId('section-labels');
  const rows = labels.getByTestId('row');
  // Edit a later row, then an earlier one: the shared editor ref must not be
  // cleared by the later row's unmount when the earlier row's editor mounts.
  await rows.nth(3).getByTestId('row-edit').click();
  await expect(labels.getByTestId('row-edit-title')).toBeFocused();
  await rows.nth(1).getByTestId('row-edit').click();
  await expect(labels.getByTestId('row-edit-title')).toBeFocused();
});

test('only one inline edit is open across tables at a time', async ({ page }) => {
  await page.goto(server.url);
  const labels = page.getByTestId('section-labels');
  const decorations = page.getByTestId('section-decorations');
  await labels.getByTestId('row-edit').first().click();
  await expect(labels.getByTestId('row-confirm')).toHaveCount(1);
  // Editing a row in another table closes the open edit in the first.
  await decorations.getByTestId('row-edit').first().click();
  await expect(labels.getByTestId('row-confirm')).toHaveCount(0);
  await expect(decorations.getByTestId('row-confirm')).toHaveCount(1);
});

test('clicking outside an inline edit cancels it', async ({ page }) => {
  await page.goto(server.url);
  const labels = page.getByTestId('section-labels');
  await labels.getByTestId('row-edit').first().click();
  await expect(labels.getByTestId('row-confirm')).toHaveCount(1);
  // Clicking a control outside the edited row cancels the edit.
  await page.getByTestId('add-label').click();
  await expect(labels.getByTestId('row-confirm')).toHaveCount(0);
});

test('pressing Escape cancels an inline edit', async ({ page }) => {
  await page.goto(server.url);
  const labels = page.getByTestId('section-labels');
  await labels.getByTestId('row-edit').first().click();
  const input = labels.getByTestId('row-edit-title');
  await input.fill('praise-renamed');
  await input.press('Escape');
  await expect(labels.getByTestId('row-confirm')).toHaveCount(0);
  await expect(labels.getByTestId('row-name').first()).toHaveText('praise');
});

test('other rows mutating actions are disabled while a row is being edited', async ({ page }) => {
  await page.goto(server.url);
  const labels = page.getByTestId('section-labels');
  const rows = labels.getByTestId('row');

  await rows.nth(0).getByTestId('row-edit').click();
  // Remove and visibility apply by a stale index mid-edit, so they're locked...
  await expect(rows.nth(1).getByTestId('row-remove')).toBeDisabled();
  await expect(rows.nth(1).getByTestId('row-visibility')).toBeDisabled();
  // ...but the edit pencil stays live so you can switch the edit to another row.
  await expect(rows.nth(1).getByTestId('row-edit')).toBeEnabled();
});
