// Deep-merge `override` onto `base`: nested objects merge recursively, a null
// override value deletes that key, and arrays/scalars replace. When `base` is
// not an object the override is returned as-is, so callers pass object
// manifests and get an object back.
export function deepMerge(base: unknown, override: unknown): unknown;
