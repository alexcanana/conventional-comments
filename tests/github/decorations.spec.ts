import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { loadFixture } from '../helpers';

const items = (page: Page) => page.locator('#cc-dropdown .cc-item');

async function openLabels(page: Page) {
  await loadFixture(page, 'github.html');
  const textarea = page.locator('textarea');
  await textarea.click();
  await textarea.fill('cc');
  await expect(items(page)).toHaveCount(12);

  return textarea;
}

test.describe('decorations stage', () => {
  test('pressing Enter on a label shows the decorations', async ({ page }) => {
    const textarea = await openLabels(page);
    await textarea.press('Enter');
    await expect(items(page)).toHaveCount(7);
    await expect(page.locator('#cc-dropdown')).toContainText('non-blocking');
    await expect(page.locator('#cc-dropdown')).toContainText('blocking');
    await expect(page.locator('#cc-dropdown')).toContainText('if-minor');
  });

  test('clicking a label shows the decorations', async ({ page }) => {
    await openLabels(page);
    await items(page).nth(2).click();
    await expect(items(page)).toHaveCount(7);
    await expect(page.locator('#cc-dropdown')).toContainText('non-blocking');
  });

  test('first decoration is active and arrows navigate it', async ({ page }) => {
    const textarea = await openLabels(page);
    await textarea.press('Enter');
    await expect(items(page).nth(0)).toHaveClass(/cc-active/);
    await textarea.press('ArrowDown');
    await expect(items(page).nth(1)).toHaveClass(/cc-active/);
  });
});
