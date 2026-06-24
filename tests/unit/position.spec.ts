import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { loadFixture } from '../helpers';

// Position the dropdown for a given textarea value/caret, return the
// dropdown's viewport-relative top/left.
async function showAt(page: Page, value: string) {
  return page.evaluate((value: string) => {
    const textarea = document.querySelector('textarea')!;
    textarea.value = value;
    textarea.selectionStart = textarea.selectionEnd = value.length;
    window.__cc.showDropdown(textarea);
    const rect = document.getElementById('cc-dropdown')!.getBoundingClientRect();

    return { top: rect.top, left: rect.left };
  }, value);
}

test('dropdown follows the caret down as lines are added', async ({ page }) => {
  await loadFixture(page, 'github.html');
  const line1 = await showAt(page, 'cc');
  const line5 = await showAt(page, '\n\n\n\ncc');
  expect(line5.top).toBeGreaterThan(line1.top + 20);
});

test('dropdown follows the caret across the line', async ({ page }) => {
  await loadFixture(page, 'github.html');
  const atStart = await showAt(page, 'cc');
  const indented = await showAt(page, 'hello world cc');
  expect(indented.left).toBeGreaterThan(atStart.left + 10);
});
