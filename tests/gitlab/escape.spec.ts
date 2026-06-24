import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { loadFixture } from '../helpers';

// GitLab listens for Escape to prompt "Are you sure you want to cancel...".
// Its handler sits on the comment textarea/form and is registered before ours,
// so when the dropdown is open Escape must be intercepted before it ever
// reaches that handler. Spy with a listener registered on the textarea up front
// to mirror that ordering.
async function trackEscapes(page: Page) {
  await page.evaluate(() => {
    window.__escapes = 0;
    document.querySelector('textarea')!.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        window.__escapes += 1;
      }
    });
  });
}

test.describe('escape on gitlab', () => {
  test('Escape closes the dropdown without propagating to the page', async ({ page }) => {
    await loadFixture(page, 'gitlab.html');
    await trackEscapes(page);
    const textarea = page.locator('textarea[name="note[note]"]');
    await textarea.click();
    await textarea.fill('cc');
    await expect(page.locator('#cc-dropdown')).toBeVisible();

    await textarea.press('Escape');
    await expect(page.locator('#cc-dropdown')).toHaveCount(0);
    expect(await page.evaluate(() => window.__escapes)).toBe(0);
  });

  test('Escape propagates normally when the dropdown is closed', async ({ page }) => {
    await loadFixture(page, 'gitlab.html');
    await trackEscapes(page);
    const textarea = page.locator('textarea[name="note[note]"]');
    await textarea.click();
    await textarea.press('Escape');
    expect(await page.evaluate(() => window.__escapes)).toBe(1);
  });
});
