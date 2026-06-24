import { test, expect } from '@playwright/test';
import { loadFixture } from '../helpers';

test.describe('dismissal', () => {
  test('mousedown on the textarea behind the dropdown closes it', async ({ page }) => {
    await loadFixture(page, 'github.html');
    const textarea = page.locator('textarea');
    await textarea.click();
    await textarea.fill('cc');
    await expect(page.locator('#cc-dropdown')).toBeVisible();

    // Clicking the (focused) textarea does not blur it, so it must be closed
    // by an outside-click handler rather than by blur.
    await page.evaluate(() => {
      document
        .querySelector('textarea')!
        .dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });
    await expect(page.locator('#cc-dropdown')).toHaveCount(0);
  });

  test('mousedown inside the dropdown does not close it', async ({ page }) => {
    await loadFixture(page, 'github.html');
    const textarea = page.locator('textarea');
    await textarea.click();
    await textarea.fill('cc');
    await expect(page.locator('#cc-dropdown')).toBeVisible();

    await page.locator('#cc-dropdown .cc-item').first().dispatchEvent('mousedown');
    await expect(page.locator('#cc-dropdown')).toBeVisible();
  });

  test('moving the caret with ArrowLeft closes the dropdown', async ({ page }) => {
    await loadFixture(page, 'github.html');
    const textarea = page.locator('textarea');
    await textarea.click();
    await textarea.fill('cc');
    await expect(page.locator('#cc-dropdown')).toBeVisible();

    await textarea.press('ArrowLeft');
    await expect(page.locator('#cc-dropdown')).toHaveCount(0);
    await expect(textarea).toHaveValue('cc');
  });

  test('caret keys do not close the dropdown during the decorations stage', async ({ page }) => {
    await loadFixture(page, 'github.html');
    const textarea = page.locator('textarea');
    await textarea.click();
    await textarea.fill('cc');
    await page.locator('#cc-dropdown .cc-item').nth(0).click(); // praise -> decorations
    await expect(page.locator('#cc-dropdown .cc-item')).toHaveCount(7);

    // A label is already chosen; caret movement must not discard the decorations.
    await textarea.press('ArrowLeft');
    await expect(page.locator('#cc-dropdown .cc-item')).toHaveCount(7);
  });
});
