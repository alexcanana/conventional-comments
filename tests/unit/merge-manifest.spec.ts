import { test, expect } from '@playwright/test';
import { deepMerge } from '../../scripts/merge-manifest.mjs';

test('recursively merges nested objects', () => {
  const merged = deepMerge({ a: 1, nested: { x: 1, y: 2 } }, { nested: { y: 9, z: 3 } });
  expect(merged).toEqual({ a: 1, nested: { x: 1, y: 9, z: 3 } });
});

test('a null override deletes the key', () => {
  const merged = deepMerge(
    { background: { service_worker: 'background.js' } },
    { background: { service_worker: null, scripts: ['background.js'] } },
  );
  expect(merged).toEqual({ background: { scripts: ['background.js'] } });
});

test('arrays and scalars from the override replace the base', () => {
  const merged = deepMerge({ list: [1, 2], scalar: 'old' }, { list: [9], scalar: 'new' });
  expect(merged).toEqual({ list: [9], scalar: 'new' });
});

test('does not mutate the base object', () => {
  const base = { nested: { x: 1 } };
  deepMerge(base, { nested: { y: 2 } });
  expect(base).toEqual({ nested: { x: 1 } });
});
