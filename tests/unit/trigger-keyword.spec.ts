import { test, expect } from '@playwright/test';
import { matchTrigger } from '../../src/core/trigger';

test('matchTrigger defaults to the cc keyword, case-insensitively', () => {
  expect(matchTrigger('cc', 2)).toEqual({ query: '', length: 2 });
  expect(matchTrigger('CC', 2)).toEqual({ query: '', length: 2 });
  expect(matchTrigger('ccsug', 5)).toEqual({ query: 'sug', length: 5 });
  expect(matchTrigger('hello', 5)).toBeNull();
});

test('matchTrigger honours a custom keyword', () => {
  expect(matchTrigger('qq', 2, 'qq')).toEqual({ query: '', length: 2 });
  expect(matchTrigger('qqfix', 5, 'qq')).toEqual({ query: 'fix', length: 5 });
  expect(matchTrigger('cc', 2, 'qq')).toBeNull();
});
