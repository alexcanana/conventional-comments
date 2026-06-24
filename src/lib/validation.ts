const ORIGIN_ERROR = 'Enter a site, e.g. https://gitlab.example.com';

export function validateTriggerKeyword(value: string): string | null {
  if (!value.trim()) {
    return 'Trigger keyword is required.';
  }

  if (!/^[a-zA-Z]+$/.test(value.trim())) {
    return 'Use letters only.';
  }

  return null;
}

const MAX_HOSTNAME_LENGTH = 253;

// A dotted host of RFC 1123 labels (letters/digits/hyphens, no leading or
// trailing hyphen, at most 63 characters each) separated by dots, with no
// port or path. This is the single source of truth for what a host may look
// like; isCanonicalOriginPattern wraps it for full match-pattern strings.
const HOST_PATTERN = /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/;

// Reduce anything the user might type for a site — a bare host, an https URL,
// with or without a trailing path/glob — to the canonical host-level match
// pattern Chrome's permissions and content-script registration require
// (https://host/*). Returns null when there's no usable host (the leading
// `https://` is optional, but a non-https scheme is rejected). Storing the
// canonical form means two spellings of the same host dedupe to one entry.
export function normalizeOriginPattern(value: string): string | null {
  const host = value
    .trim()
    .toLowerCase()
    .replace(/^https:\/\//, '')
    .split('/')[0];

  if (host.length > MAX_HOSTNAME_LENGTH || !HOST_PATTERN.test(host)) {
    return null;
  }

  return `https://${host}/*`;
}

// Whether a string is already a fully canonical origin pattern
// (https://host/*). Origins that enter from outside the options UI — granted
// through the browser's permission prompt — are filtered through this before
// being registered for content-script injection.
export function isCanonicalOriginPattern(pattern: string): boolean {
  return pattern === normalizeOriginPattern(pattern);
}

// The user-facing spelling of a stored pattern: the canonical https://host
// without the trailing /* the match-pattern grammar needs. This is the exact
// inverse of normalizeOriginPattern for canonical patterns.
export function displayOrigin(pattern: string): string {
  return pattern.replace(/\/\*$/, '');
}

export function validateOriginPattern(value: string): string | null {
  return normalizeOriginPattern(value) === null ? ORIGIN_ERROR : null;
}

export function isDuplicateKey(key: string, existingKeys: string[]): boolean {
  const normalized = key.trim().toLowerCase();

  return existingKeys.some((existing) => existing.trim().toLowerCase() === normalized);
}
