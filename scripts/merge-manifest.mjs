function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

// Deep-merge an override onto a base: nested objects merge recursively, a null
// override deletes the key, and arrays/scalars replace. The base is not mutated.
export function deepMerge(base, override) {
  if (!isObject(base)) {
    return override;
  }

  const merged = { ...base };
  for (const [key, value] of Object.entries(override || {})) {
    if (value === null) {
      delete merged[key];
      continue;
    }

    if (isObject(value) && isObject(merged[key])) {
      merged[key] = deepMerge(merged[key], value);
    } else if (value !== undefined) {
      merged[key] = value;
    }
  }

  return merged;
}
