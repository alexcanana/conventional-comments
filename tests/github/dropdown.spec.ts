import { test, expect } from '@playwright/test';
import { loadFixture } from '../helpers';

test.describe('github integration', () => {
  test('typing cc opens the dropdown', async ({ page }) => {
    await loadFixture(page, 'github.html');
    const textarea = page.locator('textarea');
    await textarea.click();
    await textarea.fill('cc');
    await expect(page.locator('#cc-dropdown')).toBeVisible();
    await expect(page.locator('#cc-dropdown')).toContainText('praise');
  });

  test('unrelated input does not open the dropdown', async ({ page }) => {
    await loadFixture(page, 'github.html');
    const textarea = page.locator('textarea');
    await textarea.click();
    await textarea.fill('soccer');
    await expect(page.locator('#cc-dropdown')).toHaveCount(0);
  });

  test('Escape closes the dropdown', async ({ page }) => {
    await loadFixture(page, 'github.html');
    const textarea = page.locator('textarea');
    await textarea.click();
    await textarea.fill('cc');
    await expect(page.locator('#cc-dropdown')).toBeVisible();
    await textarea.press('Escape');
    await expect(page.locator('#cc-dropdown')).toHaveCount(0);
  });

  test('clicking away closes the dropdown', async ({ page }) => {
    await loadFixture(page, 'github.html');
    const textarea = page.locator('textarea');
    await textarea.click();
    await textarea.fill('cc');
    await expect(page.locator('#cc-dropdown')).toBeVisible();
    await page.locator('body').click({ position: { x: 5, y: 5 } });
    await expect(page.locator('#cc-dropdown')).toHaveCount(0);
  });
});
