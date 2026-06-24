import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { loadFixture } from '../helpers';

const items = (page: Page) => page.locator('#cc-dropdown .cc-item');

async function openLabels(page: Page) {
  await loadFixture(page, 'github.html');
  const textarea = page.locator('textarea');
  await textarea.click();
  await textarea.fill('cc');

  return textarea;
}

test.describe('accessibility', () => {
  test('the label dropdown is a listbox with option roles', async ({ page }) => {
    await openLabels(page);
    const dropdown = page.locator('#cc-dropdown');
    await expect(dropdown).toHaveAttribute('role', 'listbox');
    await expect(dropdown).toHaveAttribute('aria-label', /labels/i);
    await expect(items(page).first()).toHaveAttribute('role', 'option');
  });

  test('the focused textarea is the combobox that owns the listbox', async ({ page }) => {
    const textarea = await openLabels(page);
    await expect(textarea).toHaveAttribute('role', 'combobox');
    await expect(textarea).toHaveAttribute('aria-expanded', 'true');
    await expect(textarea).toHaveAttribute('aria-controls', 'cc-dropdown');
    await expect(textarea).toHaveAttribute('aria-autocomplete', 'list');
  });

  test('closing the dropdown strips the combobox attributes from the textarea', async ({
    page,
  }) => {
    const textarea = await openLabels(page);
    await textarea.press('Escape');
    await expect(page.locator('#cc-dropdown')).toHaveCount(0);
    await expect(textarea).not.toHaveAttribute('role', 'combobox');
    await expect(textarea).not.toHaveAttribute('aria-expanded', /.*/);
    await expect(textarea).not.toHaveAttribute('aria-activedescendant', /.*/);
  });

  test('the active label is aria-selected and tracked by aria-activedescendant', async ({
    page,
  }) => {
    const textarea = await openLabels(page);
    const first = items(page).nth(0);
    const second = items(page).nth(1);

    await expect(first).toHaveAttribute('aria-selected', 'true');
    const firstId = await first.getAttribute('id');
    // aria-activedescendant lives on the focused textarea, not the listbox div.
    await expect(textarea).toHaveAttribute('aria-activedescendant', firstId!);

    await textarea.press('ArrowDown');
    await expect(second).toHaveAttribute('aria-selected', 'true');
    await expect(first).toHaveAttribute('aria-selected', 'false');
    const secondId = await second.getAttribute('id');
    await expect(textarea).toHaveAttribute('aria-activedescendant', secondId!);
  });

  test('the decoration list is multiselectable and toggling sets aria-selected', async ({
    page,
  }) => {
    const textarea = await openLabels(page);
    await textarea.press('Enter'); // labels -> decorations

    const dropdown = page.locator('#cc-dropdown');
    await expect(dropdown).toHaveAttribute('aria-multiselectable', 'true');

    const first = items(page).nth(0);
    await expect(first).toHaveAttribute('aria-selected', 'false');
    await first.click(); // toggle the first decoration
    await expect(first).toHaveAttribute('aria-selected', 'true');
  });
});
