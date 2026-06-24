import { test, expect } from '@playwright/test';
import { DEFAULT_OPTIONS } from '../../src/lib/options';
import { LABELS } from '../../src/core/labels';
import { DECORATIONS } from '../../src/core/decorations';

test('default options seed the trigger, origins, labels and decorations', () => {
  expect(DEFAULT_OPTIONS.triggerKeyword).toBe('cc');
  expect(DEFAULT_OPTIONS.allowedOrigins).toEqual(['https://github.com/*', 'https://gitlab.com/*']);
  expect(DEFAULT_OPTIONS.disabledOrigins).toEqual([]);
  expect(DEFAULT_OPTIONS.labels).toHaveLength(LABELS.length);
  expect(DEFAULT_OPTIONS.labels[0]).toEqual({
    key: LABELS[0].label,
    description: LABELS[0].description,
    isEnabled: true,
    sortOrder: 0,
  });
  expect(DEFAULT_OPTIONS.decorations).toHaveLength(DECORATIONS.length);
  expect(DEFAULT_OPTIONS.sortLabelsByUsage).toBe(true);
  expect(DEFAULT_OPTIONS.showLabelDescriptionsInDropdown).toBe(true);
  expect(DEFAULT_OPTIONS.showDecorationDescriptions).toBe(true);
});
