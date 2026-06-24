import { test, expect } from '@playwright/test';
import { getActiveTriggerKeyword, setActiveTriggerKeyword } from '../../src/content';

test('the active trigger keyword defaults to cc and can be updated', () => {
  expect(getActiveTriggerKeyword()).toBe('cc');
  setActiveTriggerKeyword('qq');
  expect(getActiveTriggerKeyword()).toBe('qq');
  setActiveTriggerKeyword('cc');
});
