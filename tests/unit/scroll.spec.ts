import { test, expect } from '@playwright/test';
import { loadFixture } from '../helpers';

// The dropdown should stay glued to the caret as a scrollable ancestor scrolls,
// i.e. its offset from the textarea must stay constant.
test('dropdown follows the caret when an ancestor scrolls', async ({ page }) => {
  await loadFixture(page, 'scroll.html');

  const offsetBefore = await page.evaluate(() => {
    const textarea = document.querySelector('textarea')!;
    textarea.value = 'cc';
    textarea.selectionStart = textarea.selectionEnd = 2;
    window.__cc.showDropdown(textarea);
    const dropdownRect = document.getElementById('cc-dropdown')!.getBoundingClientRect();

    return dropdownRect.top - textarea.getBoundingClientRect().top;
  });

  await page.evaluate(() => {
    document.getElementById('scroller')!.scrollTop = 50;
  });
  await page.waitForTimeout(50);

  const offsetAfter = await page.evaluate(() => {
    const dropdownRect = document.getElementById('cc-dropdown')!.getBoundingClientRect();
    const textareaRect = document.querySelector('textarea')!.getBoundingClientRect();

    return dropdownRect.top - textareaRect.top;
  });

  expect(Math.abs(offsetAfter - offsetBefore)).toBeLessThan(2);
});
