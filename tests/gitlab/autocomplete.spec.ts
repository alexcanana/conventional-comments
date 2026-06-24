import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { loadFixture } from '../helpers';

const labelTexts = (page: Page) => page.locator('#cc-dropdown .cc-item .cc-label');

test('typing cct narrows to labels starting with t on gitlab', async ({ page }) => {
  await loadFixture(page, 'gitlab.html');
  const textarea = page.locator('textarea[name="note[note]"]');
  await textarea.click();
  await textarea.fill('cct');
  await expect(labelTexts(page)).toHaveText(['todo', 'thought', 'typo']);
});
