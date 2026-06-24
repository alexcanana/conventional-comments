import { test, expect } from '@playwright/test';
import { loadFixture } from '../helpers';

test('matchTrigger returns the query after a standalone cc, or null', async ({ page }) => {
  await loadFixture(page, 'github.html');

  const result = await page.evaluate(() => ({
    bare: window.__cc.matchTrigger('cc', 2),
    afterSpace: window.__cc.matchTrigger('hello cc', 8),
    prefix: window.__cc.matchTrigger('cct', 3),
    longerPrefix: window.__cc.matchTrigger('hello ccto', 10),
    soccer: window.__cc.matchTrigger('soccer', 6),
    midword: window.__cc.matchTrigger('acc', 3),
    empty: window.__cc.matchTrigger('', 0),
  }));

  expect(result.bare).toEqual({ query: '', length: 2 });
  expect(result.afterSpace).toEqual({ query: '', length: 2 });
  expect(result.prefix).toEqual({ query: 't', length: 3 });
  expect(result.longerPrefix).toEqual({ query: 'to', length: 4 });
  expect(result.soccer).toBeNull();
  expect(result.midword).toBeNull();
  expect(result.empty).toBeNull();
});

test('matchTrigger is case-insensitive on the cc keyword', async ({ page }) => {
  await loadFixture(page, 'github.html');

  const result = await page.evaluate(() => ({
    upper: window.__cc.matchTrigger('CC', 2),
    mixed: window.__cc.matchTrigger('Cc', 2),
    upperPrefix: window.__cc.matchTrigger('CCto', 4),
  }));

  expect(result.upper).toEqual({ query: '', length: 2 });
  expect(result.mixed).toEqual({ query: '', length: 2 });
  expect(result.upperPrefix).toEqual({ query: 'to', length: 4 });
});
