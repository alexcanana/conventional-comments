import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { loadFixture } from '../helpers';

const items = (page: Page) => page.locator('#cc-dropdown .cc-item');
const dropdownLeft = (page: Page) =>
  page.evaluate(() => document.getElementById('cc-dropdown')!.getBoundingClientRect().left);

test('the open dropdown stays anchored to its own textarea', async ({ page }) => {
  await loadFixture(page, 'multi.html');
  const first = page.locator('#first');
  await first.click();
  await first.fill('cc');
  await items(page).nth(0).click(); // praise -> decorations, anchored to #first
  const before = await dropdownLeft(page);

  // Simulate the second textarea receiving input while decorations are open.
  await page.evaluate(() =>
    window.__cc.showDropdown(document.getElementById('second') as HTMLTextAreaElement),
  );
  const after = await dropdownLeft(page);

  expect(after).toBe(before);
});

test('opening the dropdown on another textarea clears the previous combobox role', async ({
  page,
}) => {
  await loadFixture(page, 'multi.html');
  const first = page.locator('#first');
  await first.click();
  await first.fill('cc');
  await expect(first).toHaveAttribute('role', 'combobox');

  // The label stage tracks the trigger of whichever textarea last fired input;
  // moving the dropdown to #second must not leave stale ARIA on #first.
  await page.evaluate(() =>
    window.__cc.showDropdown(document.getElementById('second') as HTMLTextAreaElement),
  );

  await expect(page.locator('#second')).toHaveAttribute('role', 'combobox');
  await expect(first).not.toHaveAttribute('role', 'combobox');
});

test('typing cc again after an insert reopens at the label stage', async ({ page }) => {
  await loadFixture(page, 'github.html');
  const textarea = page.locator('textarea');
  await textarea.click();
  await textarea.fill('cc');
  await items(page).nth(0).click(); // praise -> decorations
  await textarea.press('Enter'); // insert '**praise:** '
  await expect(textarea).toHaveValue('**praise:** ');

  await textarea.pressSequentially('cc'); // reopen
  await expect(items(page)).toHaveCount(12); // full label list, not decorations
});
