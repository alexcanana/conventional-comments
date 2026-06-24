import { test, expect } from '@playwright/test';
import {
  originPatternFromUrl,
  isDefaultOrigin,
  isOriginEnabled,
  withOriginEnabled,
  withOriginDisabled,
  listedOrigins,
} from '../../src/lib/origins';
import { DEFAULT_OPTIONS } from '../../src/lib/options';

test('originPatternFromUrl returns a host match pattern for https URLs', () => {
  expect(originPatternFromUrl('https://github.com/owner/repo/pull/1')).toBe('https://github.com/*');
  expect(originPatternFromUrl('https://gitlab.example.com')).toBe('https://gitlab.example.com/*');
});

test('originPatternFromUrl rejects non-https and browser-internal pages', () => {
  expect(originPatternFromUrl('http://example.com')).toBeNull();
  expect(originPatternFromUrl('chrome://extensions')).toBeNull();
  expect(originPatternFromUrl('about:blank')).toBeNull();
  expect(originPatternFromUrl('not a url')).toBeNull();
  expect(originPatternFromUrl('')).toBeNull();
});

test('originPatternFromUrl rejects hosts the options page could never add', () => {
  // A single-label host (no dot) is not a pattern the add-site flow accepts,
  // so the popup must not claim it as a supported origin either.
  expect(originPatternFromUrl('https://localhost')).toBeNull();
  expect(originPatternFromUrl('https://localhost:3000/path')).toBeNull();
});

test('isDefaultOrigin recognises the built-in origins', () => {
  expect(isDefaultOrigin('https://github.com/*')).toBe(true);
  expect(isDefaultOrigin('https://gitlab.com/*')).toBe(true);
  expect(isDefaultOrigin('https://example.com/*')).toBe(false);
});

test('isOriginEnabled reflects presence in allowedOrigins', () => {
  expect(isOriginEnabled(DEFAULT_OPTIONS, 'https://github.com/*')).toBe(true);
  expect(isOriginEnabled(DEFAULT_OPTIONS, 'https://example.com/*')).toBe(false);
});

test('withOriginEnabled adds the pattern and clears it from disabledOrigins', () => {
  const disabled = {
    ...DEFAULT_OPTIONS,
    allowedOrigins: [],
    disabledOrigins: ['https://github.com/*'],
  };
  const enabled = withOriginEnabled(disabled, 'https://github.com/*');

  expect(enabled.allowedOrigins).toContain('https://github.com/*');
  expect(enabled.disabledOrigins).not.toContain('https://github.com/*');

  const again = withOriginEnabled(enabled, 'https://github.com/*');
  expect(again.allowedOrigins.filter((origin) => origin === 'https://github.com/*')).toHaveLength(
    1,
  );
});

test('withOriginDisabled moves the pattern from allowedOrigins to disabledOrigins', () => {
  const disabled = withOriginDisabled(DEFAULT_OPTIONS, 'https://github.com/*');

  expect(disabled.allowedOrigins).not.toContain('https://github.com/*');
  expect(disabled.disabledOrigins).toContain('https://github.com/*');
  expect(DEFAULT_OPTIONS.allowedOrigins).toContain('https://github.com/*');
  expect(DEFAULT_OPTIONS.disabledOrigins).not.toContain('https://github.com/*');
});

test('withOriginDisabled returns the same options when nothing changes', () => {
  const options = {
    ...DEFAULT_OPTIONS,
    allowedOrigins: [],
    disabledOrigins: ['https://github.com/*'],
  };

  // The pattern is absent from allowedOrigins and already in disabledOrigins, so
  // disabling it is a no-op and must preserve referential identity (the service
  // worker skips persistence on `updated === options`).
  expect(withOriginDisabled(options, 'https://github.com/*')).toBe(options);
});

test('listedOrigins always includes both defaults and marks their state', () => {
  const options = {
    ...DEFAULT_OPTIONS,
    allowedOrigins: ['https://github.com/*', 'https://example.com/*'],
    disabledOrigins: ['https://gitlab.com/*'],
  };
  const sites = listedOrigins(options);

  expect(sites).toEqual([
    { pattern: 'https://github.com/*', isEnabled: true, isDefault: true },
    { pattern: 'https://gitlab.com/*', isEnabled: false, isDefault: true },
    { pattern: 'https://example.com/*', isEnabled: true, isDefault: false },
  ]);
});
