import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { loadFixture } from '../helpers';

const items = (page: Page) => page.locator('#cc-dropdown .cc-item');

test.describe('keyboard navigation', () => {
  test('first label is active when the dropdown opens', async ({ page }) => {
    await loadFixture(page, 'github.html');
    const textarea = page.locator('textarea');
    await textarea.click();
    await textarea.fill('cc');
    await expect(items(page).nth(0)).toHaveClass(/cc-active/);
  });

  test('ArrowDown / ArrowUp move the active label', async ({ page }) => {
    await loadFixture(page, 'github.html');
    const textarea = page.locator('textarea');
    await textarea.click();
    await textarea.fill('cc');

    await textarea.press('ArrowDown');
    await expect(items(page).nth(1)).toHaveClass(/cc-active/);
    await expect(items(page).nth(0)).not.toHaveClass(/cc-active/);

    await textarea.press('ArrowDown');
    await expect(items(page).nth(2)).toHaveClass(/cc-active/);

    await textarea.press('ArrowUp');
    await expect(items(page).nth(1)).toHaveClass(/cc-active/);
  });

  test('navigation wraps around at both ends', async ({ page }) => {
    await loadFixture(page, 'github.html');
    const textarea = page.locator('textarea');
    await textarea.click();
    await textarea.fill('cc');

    // up from the first item wraps to the last (12 labels)
    await textarea.press('ArrowUp');
    await expect(items(page).nth(11)).toHaveClass(/cc-active/);

    // down from the last item wraps back to the first
    await textarea.press('ArrowDown');
    await expect(items(page).nth(0)).toHaveClass(/cc-active/);
  });

  test('exactly one label is active at a time', async ({ page }) => {
    await loadFixture(page, 'github.html');
    const textarea = page.locator('textarea');
    await textarea.click();
    await textarea.fill('cc');
    await textarea.press('ArrowDown');
    await textarea.press('ArrowDown');
    await expect(page.locator('#cc-dropdown .cc-item.cc-active')).toHaveCount(1);
  });
});
