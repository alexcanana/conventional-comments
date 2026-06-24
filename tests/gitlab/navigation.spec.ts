import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { loadFixture } from '../helpers';

const items = (page: Page) => page.locator('#cc-dropdown .cc-item');

test('arrow keys move the active label on gitlab', async ({ page }) => {
  await loadFixture(page, 'gitlab.html');
  const textarea = page.locator('textarea[name="note[note]"]');
  await textarea.click();
  await textarea.fill('cc');
  await expect(items(page).nth(0)).toHaveClass(/cc-active/);
  await textarea.press('ArrowDown');
  await expect(items(page).nth(1)).toHaveClass(/cc-active/);
});
