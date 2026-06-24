import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { loadFixture } from '../helpers';

const labelTexts = (page: Page) => page.locator('#cc-dropdown .cc-item .cc-label');

test.describe('label autocomplete', () => {
  test('typing cct narrows to labels starting with t', async ({ page }) => {
    await loadFixture(page, 'github.html');
    const textarea = page.locator('textarea');
    await textarea.click();
    await textarea.fill('cct');
    await expect(labelTexts(page)).toHaveText(['todo', 'thought', 'typo']);
  });

  test('typing more characters narrows further', async ({ page }) => {
    await loadFixture(page, 'github.html');
    const textarea = page.locator('textarea');
    await textarea.click();
    await textarea.fill('ccth');
    await expect(labelTexts(page)).toHaveText(['thought']);
  });

  test('a query with no matches closes the dropdown', async ({ page }) => {
    await loadFixture(page, 'github.html');
    const textarea = page.locator('textarea');
    await textarea.click();
    await textarea.fill('ccxyz');
    await expect(page.locator('#cc-dropdown')).toHaveCount(0);
  });

  test('selecting a filtered label inserts it and drops the whole trigger', async ({ page }) => {
    await loadFixture(page, 'github.html');
    const textarea = page.locator('textarea');
    await textarea.click();
    await textarea.fill('cct'); // todo is first
    await textarea.press('Enter'); // choose label -> decorations
    await textarea.press('Enter'); // no decoration -> insert
    await expect(textarea).toHaveValue('**todo:** ');
  });

  test('typing CC (uppercase) opens the dropdown', async ({ page }) => {
    await loadFixture(page, 'github.html');
    const textarea = page.locator('textarea');
    await textarea.click();
    await textarea.fill('CC');
    await expect(page.locator('#cc-dropdown')).toBeVisible();
  });
});
