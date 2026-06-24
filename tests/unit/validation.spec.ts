import { test, expect } from '@playwright/test';
import {
  validateTriggerKeyword,
  validateOriginPattern,
  normalizeOriginPattern,
  displayOrigin,
  isDuplicateKey,
  isCanonicalOriginPattern,
} from '../../src/lib/validation';

test('validateTriggerKeyword accepts letters only', () => {
  expect(validateTriggerKeyword('cc')).toBeNull();
  expect(validateTriggerKeyword('')).toBe('Trigger keyword is required.');
  expect(validateTriggerKeyword('c1')).toBe('Use letters only.');
});

test('validateOriginPattern accepts a site with or without scheme and glob', () => {
  expect(validateOriginPattern('https://github.com/*')).toBeNull();
  expect(validateOriginPattern('https://gitlab.example.com')).toBeNull();
  expect(validateOriginPattern('gitlab.example.com')).toBeNull();
  expect(validateOriginPattern('not a site')).toBe('Enter a site, e.g. https://gitlab.example.com');
  // Non-https schemes aren't supported and are rejected, not coerced.
  expect(validateOriginPattern('http://x.com/*')).toBe(
    'Enter a site, e.g. https://gitlab.example.com',
  );
});

test('normalizeOriginPattern canonicalizes any spelling of a host to https://host/*', () => {
  expect(normalizeOriginPattern('gitlab.example.com')).toBe('https://gitlab.example.com/*');
  expect(normalizeOriginPattern('https://gitlab.example.com')).toBe('https://gitlab.example.com/*');
  expect(normalizeOriginPattern('https://gitlab.example.com/')).toBe(
    'https://gitlab.example.com/*',
  );
  expect(normalizeOriginPattern('https://gitlab.example.com/*')).toBe(
    'https://gitlab.example.com/*',
  );
  expect(normalizeOriginPattern('  HTTPS://GitLab.Example.COM/group  ')).toBe(
    'https://gitlab.example.com/*',
  );
  expect(normalizeOriginPattern('localhost')).toBeNull();
  expect(normalizeOriginPattern('http://x.com')).toBeNull();
});

test('normalizeOriginPattern rejects hosts that violate RFC 1123 label rules', () => {
  // Leading/trailing hyphen labels are not valid hostnames.
  expect(normalizeOriginPattern('-leading.example.com')).toBeNull();
  expect(normalizeOriginPattern('trailing-.example.com')).toBeNull();
  // A single label longer than 63 characters is invalid.
  expect(normalizeOriginPattern(`${'a'.repeat(64)}.com`)).toBeNull();
  // A host longer than 253 characters is invalid.
  const longHost = `${Array.from({ length: 5 }, () => 'a'.repeat(50)).join('.')}.com`;
  expect(longHost.length).toBeGreaterThan(253);
  expect(normalizeOriginPattern(longHost)).toBeNull();
  // A boundary-valid 63-character label is still accepted.
  expect(normalizeOriginPattern(`${'a'.repeat(63)}.com`)).toBe(`https://${'a'.repeat(63)}.com/*`);
});

test('displayOrigin strips exactly the canonical match glob', () => {
  expect(displayOrigin('https://gitlab.example.com/*')).toBe('https://gitlab.example.com');
  expect(displayOrigin('https://gitlab.example.com')).toBe('https://gitlab.example.com');
});

test('displayOrigin is the inverse of the canonical pattern', () => {
  for (const input of ['github.com', 'https://gitlab.example.com', 'sub.domain.co.uk']) {
    const pattern = normalizeOriginPattern(input)!;
    expect(normalizeOriginPattern(displayOrigin(pattern))).toBe(pattern);
  }
});

test('isCanonicalOriginPattern accepts only fully canonical https host patterns', () => {
  expect(isCanonicalOriginPattern('https://github.com/*')).toBe(true);
  expect(isCanonicalOriginPattern('https://sub.gitlab.example.com/*')).toBe(true);
  expect(isCanonicalOriginPattern('https://github.com')).toBe(false);
  expect(isCanonicalOriginPattern('https://github.com/')).toBe(false);
  expect(isCanonicalOriginPattern('http://github.com/*')).toBe(false);
  expect(isCanonicalOriginPattern('https://localhost/*')).toBe(false);
  expect(isCanonicalOriginPattern('https://-bad.com/*')).toBe(false);
});

test('isDuplicateKey is case-insensitive and trims', () => {
  expect(isDuplicateKey(' Praise ', ['praise', 'issue'])).toBe(true);
  expect(isDuplicateKey('risk', ['praise', 'issue'])).toBe(false);
});
