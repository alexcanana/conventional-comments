import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { loadFixture } from '../helpers';

const items = (page: Page) => page.locator('#cc-dropdown .cc-item');

test('selecting a label and decoration inserts on gitlab', async ({ page }) => {
  await loadFixture(page, 'gitlab.html');
  const textarea = page.locator('textarea[name="note[note]"]');
  await textarea.click();
  await textarea.fill('cc');
  await items(page).nth(2).click(); // suggestion -> decorations
  await items(page).nth(0).click(); // non-blocking
  await textarea.press('Enter');
  await expect(textarea).toHaveValue('**suggestion (non-blocking):** ');
});
