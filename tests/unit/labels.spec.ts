import { test, expect } from '@playwright/test';
import { loadFixture } from '../helpers';

test('renders all conventional comment labels in order', async ({ page }) => {
  await loadFixture(page, 'github.html');
  const { names, data } = await page.evaluate(() => {
    const textarea = document.querySelector('textarea')!;
    window.__cc.showDropdown(textarea);
    const items = [...document.querySelectorAll('#cc-dropdown .cc-item .cc-label')];

    return {
      names: items.map((labelElement) => labelElement.textContent),
      data: window.__cc.labels.map((entry) => entry.label),
    };
  });
  expect(names).toEqual(data);
  expect(names).toHaveLength(12);
  expect(names[0]).toBe('praise');
  expect(names).toContain('quibble');
});

test('each label has a description shown next to it', async ({ page }) => {
  await loadFixture(page, 'github.html');
  const ok = await page.evaluate(() => {
    const textarea = document.querySelector('textarea')!;
    window.__cc.showDropdown(textarea);
    const descriptionElements = [...document.querySelectorAll('#cc-dropdown .cc-item .cc-desc')];

    return (
      descriptionElements.length === window.__cc.labels.length &&
      descriptionElements.every((element) => element.textContent.trim().length > 0)
    );
  });
  expect(ok).toBe(true);
});
