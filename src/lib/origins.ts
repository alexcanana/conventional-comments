import { DEFAULT_ALLOWED_ORIGINS, type ExtensionOptions } from './options';
import { isCanonicalOriginPattern } from './validation';

export interface ListedOrigin {
  pattern: string;
  isEnabled: boolean;
  isDefault: boolean;
}

export function originPatternFromUrl(url: string): string | null {
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'https:') {
    return null;
  }

  const pattern = `https://${parsed.hostname}/*`;

  return isCanonicalOriginPattern(pattern) ? pattern : null;
}

export function isDefaultOrigin(pattern: string): boolean {
  return DEFAULT_ALLOWED_ORIGINS.includes(pattern);
}

export function isOriginEnabled(options: ExtensionOptions, pattern: string): boolean {
  return options.allowedOrigins.includes(pattern);
}

export function withOriginEnabled(options: ExtensionOptions, pattern: string): ExtensionOptions {
  const allowedOrigins = options.allowedOrigins.includes(pattern)
    ? options.allowedOrigins
    : [...options.allowedOrigins, pattern];
  const disabledOrigins = options.disabledOrigins.filter((origin) => origin !== pattern);

  if (
    allowedOrigins === options.allowedOrigins &&
    disabledOrigins.length === options.disabledOrigins.length
  ) {
    return options;
  }

  return { ...options, allowedOrigins, disabledOrigins };
}

export function withOriginDisabled(options: ExtensionOptions, pattern: string): ExtensionOptions {
  const allowedOrigins = options.allowedOrigins.filter((origin) => origin !== pattern);
  const disabledOrigins = options.disabledOrigins.includes(pattern)
    ? options.disabledOrigins
    : [...options.disabledOrigins, pattern];

  if (
    allowedOrigins.length === options.allowedOrigins.length &&
    disabledOrigins === options.disabledOrigins
  ) {
    return options;
  }

  return { ...options, allowedOrigins, disabledOrigins };
}

export function listedOrigins(options: ExtensionOptions): ListedOrigin[] {
  const seen = new Set<string>();
  const result: ListedOrigin[] = [];

  const push = (pattern: string): void => {
    if (seen.has(pattern)) {
      return;
    }

    seen.add(pattern);
    result.push({
      pattern,
      isEnabled: options.allowedOrigins.includes(pattern),
      isDefault: isDefaultOrigin(pattern),
    });
  };

  DEFAULT_ALLOWED_ORIGINS.forEach(push);
  options.allowedOrigins.forEach(push);
  options.disabledOrigins.forEach(push);

  return result;
}
