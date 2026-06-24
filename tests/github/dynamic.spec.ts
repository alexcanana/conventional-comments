import { test, expect } from '@playwright/test';
import { loadFixture } from '../helpers';

// Regression: GitHub renders the comment editor only when you click a line, so
// the textarea often appears AFTER the content script runs. attach() must bind
// textareas added later (via MutationObserver), not just those present at load.
test('binds a textarea added to the DOM after attach', async ({ page }) => {
  await loadFixture(page, 'github.html');

  await page.evaluate(() => {
    const textarea = document.createElement('textarea');
    textarea.id = 'late';
    textarea.setAttribute('aria-label', 'Markdown value'); // a real comment-box signal
    document.body.appendChild(textarea);
  });

  const late = page.locator('#late');
  await late.click();
  await late.fill('cc');

  await expect(page.locator('#cc-dropdown')).toBeVisible();
});
