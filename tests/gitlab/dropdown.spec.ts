import { test, expect } from '@playwright/test';
import { loadFixture } from '../helpers';

test.describe('gitlab integration', () => {
  test('typing cc opens the dropdown', async ({ page }) => {
    await loadFixture(page, 'gitlab.html');
    const textarea = page.locator('textarea[name="note[note]"]');
    await textarea.click();
    await textarea.fill('cc');
    await expect(page.locator('#cc-dropdown')).toBeVisible();
    await expect(page.locator('#cc-dropdown')).toContainText('praise');
  });

  test('unrelated input does not open the dropdown', async ({ page }) => {
    await loadFixture(page, 'gitlab.html');
    const textarea = page.locator('textarea[name="note[note]"]');
    await textarea.click();
    await textarea.fill('soccer');
    await expect(page.locator('#cc-dropdown')).toHaveCount(0);
  });

  test('Escape closes the dropdown', async ({ page }) => {
    await loadFixture(page, 'gitlab.html');
    const textarea = page.locator('textarea[name="note[note]"]');
    await textarea.click();
    await textarea.fill('cc');
    await expect(page.locator('#cc-dropdown')).toBeVisible();
    await textarea.press('Escape');
    await expect(page.locator('#cc-dropdown')).toHaveCount(0);
  });
});
