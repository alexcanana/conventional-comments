import { test, expect } from '@playwright/test';
import { loadFixture } from '../helpers';

test('activates on a page that exposes a known comment editor', async ({ page }) => {
  await loadFixture(page, 'github.html');
  const textarea = page.locator('textarea');
  await textarea.click();
  await textarea.fill('cc');
  await expect(page.locator('#cc-dropdown')).toBeVisible();
});

test('stays dormant when no known comment editor is present', async ({ page }) => {
  await loadFixture(page, 'neutral.html');
  const textarea = page.locator('textarea');
  await textarea.click();
  await textarea.fill('cc');
  await expect(page.locator('#cc-dropdown')).toHaveCount(0);
});
