import { test, expect } from '@playwright/test';
import { setDropdownSource, getDropdownLabels } from '../../src/core/dropdown';

test('setDropdownSource overrides the labels used by the dropdown', () => {
  setDropdownSource({
    labels: [{ label: 'risk', description: 'A risk.' }],
    decorations: [],
    showLabelDescriptions: true,
    showDecorationDescriptions: true,
  });
  expect(getDropdownLabels().map((entry) => entry.label)).toEqual(['risk']);
});
