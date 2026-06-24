import { test, expect } from '@playwright/test';
import { installChromeMock } from './helpers/chrome-mock';
import { DEFAULT_OPTIONS } from '../../src/lib/options';
import {
  readOptions,
  writeOptions,
  subscribeToOptionsChanges,
  incrementLabelUsage,
  readLabelUsageCounts,
} from '../../src/lib/options-storage';

test('readOptions returns defaults when storage is empty', async () => {
  installChromeMock();
  expect(await readOptions()).toEqual(DEFAULT_OPTIONS);
});

test('writeOptions then readOptions round-trips and merges over defaults', async () => {
  installChromeMock();
  await writeOptions({ ...DEFAULT_OPTIONS, triggerKeyword: 'qq' });
  const options = await readOptions();
  expect(options.triggerKeyword).toBe('qq');
  expect(options.allowedOrigins).toEqual(DEFAULT_OPTIONS.allowedOrigins);
});

test('readOptions heals list fields corrupted into non-arrays', async () => {
  const stores = installChromeMock();
  // Storage written by an older build that mangled arrays into objects.
  stores.sync['options'] = {
    ...DEFAULT_OPTIONS,
    allowedOrigins: { 0: 'https://github.com/*' },
    decorations: {},
  };

  const options = await readOptions();
  expect(Array.isArray(options.allowedOrigins)).toBe(true);
  expect(Array.isArray(options.decorations)).toBe(true);
  expect(options.allowedOrigins).toEqual(DEFAULT_OPTIONS.allowedOrigins);
});

test('subscribeToOptionsChanges fires on sync writes', async () => {
  installChromeMock();
  let received = '';
  subscribeToOptionsChanges((next) => {
    received = next.triggerKeyword;
  });
  await writeOptions({ ...DEFAULT_OPTIONS, triggerKeyword: 'zz' });
  expect(received).toBe('zz');
});

test('a written value echoes back byte-identical through onChanged', async () => {
  // The options store identifies its own writes by matching the onChanged echo
  // against what it wrote, so withDefaults must round-trip a complete value
  // unchanged (same keys, same order) — assert that invariant here.
  installChromeMock();
  const written = { ...DEFAULT_OPTIONS, triggerKeyword: 'qq' };
  let echoed: unknown;
  subscribeToOptionsChanges((next) => {
    echoed = next;
  });

  await writeOptions(written);

  expect(JSON.stringify(echoed)).toBe(JSON.stringify(written));
});

test('incrementLabelUsage accumulates counts in local storage', async () => {
  installChromeMock();
  await incrementLabelUsage('praise');
  await incrementLabelUsage('praise');
  await incrementLabelUsage('issue');
  expect(await readLabelUsageCounts()).toEqual({ praise: 2, issue: 1 });
});

test('readLabelUsageCounts heals a corrupted non-object store', async () => {
  const stores = installChromeMock();
  stores.local['labelUsageCounts'] = ['not', 'an', 'object'];
  expect(await readLabelUsageCounts()).toEqual({});
});

test('incrementLabelUsage coerces a corrupted non-numeric count', async () => {
  const stores = installChromeMock();
  // An older build (or a sync glitch) left a string where a number belongs;
  // adding 1 must arithmetic to 6, not concatenate to '51'.
  stores.local['labelUsageCounts'] = { praise: '5' };
  await incrementLabelUsage('praise');
  expect(await readLabelUsageCounts()).toEqual({ praise: 6 });
});

test('withDefaults coerces non-boolean flag values back to their defaults', async () => {
  const stores = installChromeMock();
  stores.sync['options'] = {
    ...DEFAULT_OPTIONS,
    sortLabelsByUsage: 'false',
    showLabelDescriptionsInDropdown: null,
    showDecorationDescriptions: 1,
  };

  const options = await readOptions();

  expect(options.sortLabelsByUsage).toBe(DEFAULT_OPTIONS.sortLabelsByUsage);
  expect(options.showLabelDescriptionsInDropdown).toBe(
    DEFAULT_OPTIONS.showLabelDescriptionsInDropdown,
  );
  expect(options.showDecorationDescriptions).toBe(DEFAULT_OPTIONS.showDecorationDescriptions);
});

test('withDefaults preserves a valid false flag', async () => {
  const stores = installChromeMock();
  stores.sync['options'] = { ...DEFAULT_OPTIONS, sortLabelsByUsage: false };
  const options = await readOptions();
  expect(options.sortLabelsByUsage).toBe(false);
});

test('withDefaults heals entries missing isEnabled and sortOrder', async () => {
  const stores = installChromeMock();
  stores.sync['options'] = {
    ...DEFAULT_OPTIONS,
    labels: [
      { key: 'praise', description: 'Something positive.' }, // no isEnabled / sortOrder
      { key: 'nitpick', description: 'A trivial preference.' },
    ],
  };

  const options = await readOptions();

  expect(options.labels.map((label) => label.isEnabled)).toEqual([true, true]);
  expect(options.labels.map((label) => label.sortOrder)).toEqual([0, 1]);
});
