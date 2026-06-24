import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { loadFixture } from '../helpers';

const items = (page: Page) => page.locator('#cc-dropdown .cc-item');

test.describe('escape between stages', () => {
  test('Escape on the decorations returns to the labels', async ({ page }) => {
    await loadFixture(page, 'github.html');
    const textarea = page.locator('textarea');
    await textarea.click();
    await textarea.fill('cc');
    await textarea.press('Enter'); // labels -> decorations
    await expect(items(page)).toHaveCount(7);

    await textarea.press('Escape');
    await expect(page.locator('#cc-dropdown')).toBeVisible();
    await expect(items(page)).toHaveCount(12); // back to the label list
  });

  test('Escape on the labels closes the dropdown', async ({ page }) => {
    await loadFixture(page, 'github.html');
    const textarea = page.locator('textarea');
    await textarea.click();
    await textarea.fill('cc');
    await expect(page.locator('#cc-dropdown')).toBeVisible();

    await textarea.press('Escape');
    await expect(page.locator('#cc-dropdown')).toHaveCount(0);
  });

  test('returning to labels keeps the active query filter', async ({ page }) => {
    await loadFixture(page, 'github.html');
    const textarea = page.locator('textarea');
    await textarea.click();
    await textarea.fill('cct'); // todo, thought, typo
    await textarea.press('Enter'); // -> decorations
    await textarea.press('Escape'); // back to labels
    await expect(items(page).locator('.cc-label')).toHaveText(['todo', 'thought', 'typo']);
  });
});
