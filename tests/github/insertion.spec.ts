import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { loadFixture } from '../helpers';

const items = (page: Page) => page.locator('#cc-dropdown .cc-item');

// Open the label dropdown, then click a label to reach the decorations stage.
async function openDecorations(page: Page, labelIndex: number) {
  await loadFixture(page, 'github.html');
  const textarea = page.locator('textarea');
  await textarea.click();
  await textarea.fill('cc');
  await items(page).nth(labelIndex).click();
  await expect(items(page)).toHaveCount(7);

  return textarea;
}

test.describe('insertion', () => {
  test('each decoration row has a checkbox', async ({ page }) => {
    await openDecorations(page, 2);
    await expect(page.locator('#cc-dropdown .cc-item .cc-checkbox')).toHaveCount(7);
  });

  test('Enter with no decoration writes the bare label and drops the trigger', async ({ page }) => {
    const textarea = await openDecorations(page, 2); // suggestion
    await textarea.press('Enter');
    await expect(textarea).toHaveValue('**suggestion:** ');
    await expect(page.locator('#cc-dropdown')).toHaveCount(0);
  });

  test('clicking a decoration toggles it without committing', async ({ page }) => {
    const textarea = await openDecorations(page, 2);
    await items(page).nth(0).click(); // non-blocking
    await expect(page.locator('#cc-dropdown')).toBeVisible();
    await textarea.press('Enter');
    await expect(textarea).toHaveValue('**suggestion (non-blocking):** ');
  });

  test('spacebar toggles the highlighted decoration', async ({ page }) => {
    const textarea = await openDecorations(page, 2);
    await textarea.press(' '); // toggle active (non-blocking, index 0)
    await textarea.press('Enter');
    await expect(textarea).toHaveValue('**suggestion (non-blocking):** ');
  });

  test('multiple decorations are joined in order', async ({ page }) => {
    const textarea = await openDecorations(page, 2);
    await items(page).nth(0).click(); // non-blocking
    await items(page).nth(2).click(); // if-minor
    await textarea.press('Enter');
    await expect(textarea).toHaveValue('**suggestion (non-blocking, if-minor):** ');
  });

  test('the inserted comment keeps surrounding text', async ({ page }) => {
    await loadFixture(page, 'github.html');
    const textarea = page.locator('textarea');
    await textarea.click();
    await textarea.fill('hello cc');
    await items(page).nth(0).click(); // praise -> decorations
    await textarea.press('Enter');
    await expect(textarea).toHaveValue('hello **praise:** ');
  });

  test('editing the trigger away after picking a label keeps the decorations open', async ({
    page,
  }) => {
    const textarea = await openDecorations(page, 2); // suggestion
    // Backspace passes through to the textarea (Space would toggle a decoration),
    // leaving 'c' — the trigger no longer matches. The decorations must survive.
    await textarea.press('Backspace');
    await expect(page.locator('#cc-dropdown')).toBeVisible();
    await expect(items(page)).toHaveCount(7);
  });

  test('inserts using a custom trigger keyword', async ({ page }) => {
    await loadFixture(page, 'github.html');
    await page.evaluate(() => window.__cc.setActiveTriggerKeyword('qq'));
    const textarea = page.locator('textarea');
    await textarea.click();
    await textarea.fill('qq');
    await items(page).nth(2).click(); // suggestion -> decorations
    await expect(items(page)).toHaveCount(7);
    await textarea.press('Enter');
    await expect(textarea).toHaveValue('**suggestion:** ');
  });

  test('inserts using the live trigger even if it changed while open', async ({ page }) => {
    await loadFixture(page, 'github.html');
    const textarea = page.locator('textarea');
    await textarea.click();
    await textarea.fill('cc');
    await items(page).nth(2).click(); // suggestion -> decorations
    await textarea.press('x'); // an extra char reaches the textarea: 'ccx'
    await textarea.press('Enter');
    await expect(textarea).toHaveValue('**suggestion:** ');
  });
});
