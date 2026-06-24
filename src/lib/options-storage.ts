import { DEFAULT_OPTIONS, type ExtensionOptions, type EntryOption } from './options';
import { validateTriggerKeyword } from './validation';

const OPTIONS_KEY = 'options';
const USAGE_COUNTS_KEY = 'labelUsageCounts';

function normalizeEntries(entries: EntryOption[]): EntryOption[] {
  return entries.map((entry, index) => ({
    ...entry,
    isEnabled: entry.isEnabled ?? true,
    sortOrder: typeof entry.sortOrder === 'number' ? entry.sortOrder : index,
  }));
}

function withDefaults(value: unknown): ExtensionOptions {
  const merged = { ...DEFAULT_OPTIONS, ...((value as Partial<ExtensionOptions>) ?? {}) };

  // Heal storage written by older builds that mangled these arrays into
  // objects; a non-array here crashes the option-list renders (.map/.filter).
  if (!Array.isArray(merged.allowedOrigins)) {
    merged.allowedOrigins = [...DEFAULT_OPTIONS.allowedOrigins];
  }

  if (!Array.isArray(merged.disabledOrigins)) {
    merged.disabledOrigins = [];
  }

  if (!Array.isArray(merged.labels)) {
    merged.labels = [...DEFAULT_OPTIONS.labels];
  }

  if (!Array.isArray(merged.decorations)) {
    merged.decorations = [...DEFAULT_OPTIONS.decorations];
  }

  // Backfill per-entry fields older builds may have omitted, so a missing
  // isEnabled isn't filtered out of the picker and a missing sortOrder doesn't
  // sort as NaN. We do NOT inject new default labels a user may have removed.
  merged.labels = normalizeEntries(merged.labels);
  merged.decorations = normalizeEntries(merged.decorations);

  // Booleans written by older builds may arrive as strings/numbers/null; a
  // truthy/falsy coercion would silently flip the meaning, so fall back to the
  // default whenever the stored value isn't an actual boolean.
  for (const flag of [
    'sortLabelsByUsage',
    'showLabelDescriptionsInDropdown',
    'showDecorationDescriptions',
  ] as const) {
    if (typeof merged[flag] !== 'boolean') {
      merged[flag] = DEFAULT_OPTIONS[flag];
    }
  }

  // A corrupt or empty trigger keyword builds a regex that matches almost every
  // word, so fall back to the default when the stored value fails validation.
  if (
    typeof merged.triggerKeyword !== 'string' ||
    validateTriggerKeyword(merged.triggerKeyword) !== null
  ) {
    merged.triggerKeyword = DEFAULT_OPTIONS.triggerKeyword;
  }

  return merged;
}

export async function readOptions(): Promise<ExtensionOptions> {
  const stored = await chrome.storage.sync.get(OPTIONS_KEY);

  return withDefaults(stored[OPTIONS_KEY]);
}

export async function writeOptions(options: ExtensionOptions): Promise<void> {
  // chrome.storage serializes its payload, and Vue reactive proxies do not
  // survive that round-trip — persist a plain deep clone of the options.
  const plainOptions = JSON.parse(JSON.stringify(options)) as ExtensionOptions;
  await chrome.storage.sync.set({ [OPTIONS_KEY]: plainOptions });
}

export function subscribeToOptionsChanges(
  listener: (options: ExtensionOptions) => void,
): () => void {
  const handler = (changes: Record<string, { newValue?: unknown }>, areaName: string): void => {
    if (areaName === 'sync' && changes[OPTIONS_KEY]) {
      listener(withDefaults(changes[OPTIONS_KEY].newValue));
    }
  };

  chrome.storage.onChanged.addListener(handler);

  return () => chrome.storage.onChanged.removeListener(handler);
}

export async function readLabelUsageCounts(): Promise<Record<string, number>> {
  const stored = await chrome.storage.local.get(USAGE_COUNTS_KEY);
  const value = stored[USAGE_COUNTS_KEY];

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, number>;
}

export async function incrementLabelUsage(labelKey: string): Promise<void> {
  const counts = await readLabelUsageCounts();
  const parsed = Number(counts[labelKey]);
  const current = Number.isFinite(parsed) ? parsed : 0;
  counts[labelKey] = current + 1;
  await chrome.storage.local.set({ [USAGE_COUNTS_KEY]: counts });
}

export async function resetLabelUsageCounts(): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.storage) {
    return;
  }

  await chrome.storage.local.set({ [USAGE_COUNTS_KEY]: {} });
}
