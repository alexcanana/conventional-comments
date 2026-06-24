import { test, expect } from '@playwright/test';
import { loadFixture } from '../helpers';

test('showDropdown renders the label list; hideDropdown removes it', async ({ page }) => {
  await loadFixture(page, 'github.html');
  await page.evaluate(() => {
    const textarea = document.querySelector('textarea')!;
    window.__cc.showDropdown(textarea);
  });
  await expect(page.locator('#cc-dropdown')).toBeVisible();
  await expect(page.locator('#cc-dropdown .cc-item')).toHaveCount(12);
  await expect(page.locator('#cc-dropdown')).toContainText('praise');

  await page.evaluate(() => window.__cc.hideDropdown());
  await expect(page.locator('#cc-dropdown')).toHaveCount(0);
});
