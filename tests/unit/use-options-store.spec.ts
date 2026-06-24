import { test, expect } from '@playwright/test';
import { installChromeMock } from './helpers/chrome-mock';
import { createOptionsStore } from '../../src/options/composables/useOptionsStore';
import { DEFAULT_OPTIONS } from '../../src/lib/options';

test('store loads defaults then persists patches', async () => {
  installChromeMock();
  const store = createOptionsStore();
  await store.load();
  expect(store.options.triggerKeyword).toBe('cc');

  await store.update({ triggerKeyword: 'qq' });
  expect(store.options.triggerKeyword).toBe('qq');

  // Re-create from storage to prove it persisted.
  const reloaded = createOptionsStore();
  await reloaded.load();
  expect(reloaded.options.triggerKeyword).toBe('qq');
  expect(reloaded.options.allowedOrigins).toEqual(DEFAULT_OPTIONS.allowedOrigins);
});

test('persists list options as plain, serializable arrays', async () => {
  const stores = installChromeMock();
  const store = createOptionsStore();
  await store.load();

  await store.update({
    allowedOrigins: [...store.options.allowedOrigins, 'https://example.com/*'],
  });
  await store.update({
    decorations: store.options.decorations.filter((_, index) => index !== 0),
  });

  // chrome.storage serializes its payload, so what we persist must be plain
  // structured-cloneable data — Vue reactive proxies do not survive the
  // round-trip and come back as non-arrays, breaking .map/.filter renders.
  const persisted = stores.sync['options'];
  expect(() => structuredClone(persisted)).not.toThrow();
  expect(Array.isArray((persisted as { allowedOrigins: unknown }).allowedOrigins)).toBe(true);
  expect(Array.isArray((persisted as { decorations: unknown }).decorations)).toBe(true);

  const reloaded = createOptionsStore();
  await reloaded.load();
  expect(reloaded.options.allowedOrigins).toContain('https://example.com/*');
});

test('external storage changes apply, but a self-write echo does not over-suppress', async () => {
  const stores = installChromeMock();
  const store = createOptionsStore();
  await store.load();

  // A self-write: its synchronous onChanged echo must be ignored.
  await store.update({ triggerKeyword: 'qq' });
  expect(store.options.triggerKeyword).toBe('qq');

  // A genuine external change (another tab) still applies.
  stores.emit('sync', { options: { newValue: { ...DEFAULT_OPTIONS, triggerKeyword: 'ext' } } });
  expect(store.options.triggerKeyword).toBe('ext');
});

test('a no-op self-write does not swallow a later external change', async () => {
  const stores = installChromeMock();
  const store = createOptionsStore();
  await store.load();

  // Seed storage, then write the SAME value again. Real chrome.storage fires no
  // onChanged for an unchanged value, so a count-based echo guard would be left
  // expecting an echo that never comes and would wrongly suppress the next change.
  await store.update({ triggerKeyword: 'qq' });
  await store.update({ triggerKeyword: 'qq' });

  stores.emit('sync', { options: { newValue: { ...DEFAULT_OPTIONS, triggerKeyword: 'ext' } } });
  expect(store.options.triggerKeyword).toBe('ext');
});

test('load() is idempotent and dispose() stops listening', async () => {
  const stores = installChromeMock();
  const store = createOptionsStore();
  await store.load();
  await store.load(); // must NOT register a second listener

  store.dispose();
  stores.emit('sync', {
    options: { newValue: { ...DEFAULT_OPTIONS, triggerKeyword: 'after-dispose' } },
  });

  // If load() had stacked a duplicate listener, one would survive a single
  // dispose() and apply this change.
  expect(store.options.triggerKeyword).not.toBe('after-dispose');
});
