import { test, expect } from '@playwright/test';
import { addGrantedOrigins } from '../../src/background/service-worker';
import { DEFAULT_OPTIONS } from '../../src/lib/options';

test('addGrantedOrigins adds new canonical https origins', () => {
  const result = addGrantedOrigins(DEFAULT_OPTIONS, ['https://www.youtube.com/*']);

  expect(result.allowedOrigins).toContain('https://www.youtube.com/*');
});

test('addGrantedOrigins ignores already-present and non-canonical origins', () => {
  const result = addGrantedOrigins(DEFAULT_OPTIONS, [
    'https://github.com/*',
    'https://bad-no-glob',
    'http://insecure.com/*',
  ]);

  expect(result.allowedOrigins.filter((origin) => origin === 'https://github.com/*')).toHaveLength(
    1,
  );
  expect(result.allowedOrigins).not.toContain('https://bad-no-glob');
  expect(result.allowedOrigins).not.toContain('http://insecure.com/*');
});

test('addGrantedOrigins returns the same object when nothing is added', () => {
  expect(addGrantedOrigins(DEFAULT_OPTIONS, ['https://github.com/*'])).toBe(DEFAULT_OPTIONS);
});

test('addGrantedOrigins rejects wildcard hosts', () => {
  const result = addGrantedOrigins(DEFAULT_OPTIONS, ['https://*/*', 'https://*.evil.com/*']);

  expect(result).toBe(DEFAULT_OPTIONS);
  expect(result.allowedOrigins).not.toContain('https://*/*');
  expect(result.allowedOrigins).not.toContain('https://*.evil.com/*');
});
