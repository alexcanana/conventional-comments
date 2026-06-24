type ChangeListener = (
  changes: Record<string, { newValue?: unknown; oldValue?: unknown }>,
  areaName: string,
) => void;

export function installChromeMock(): {
  sync: Record<string, unknown>;
  local: Record<string, unknown>;
  emit: (area: 'sync' | 'local', changes: Record<string, { newValue?: unknown }>) => void;
} {
  const sync: Record<string, unknown> = {};
  const local: Record<string, unknown> = {};
  const listeners: ChangeListener[] = [];

  const makeArea = (store: Record<string, unknown>, areaName: string) => ({
    async get(key: string) {
      return key in store ? { [key]: store[key] } : {};
    },
    async set(items: Record<string, unknown>) {
      const changes: Record<string, { oldValue?: unknown; newValue?: unknown }> = {};
      for (const [k, v] of Object.entries(items)) {
        const previous = store[k];
        store[k] = v;
        // Real chrome.storage fires onChanged only when a value actually changes;
        // writing the same value back is silent.
        if (JSON.stringify(previous) !== JSON.stringify(v)) {
          changes[k] = { oldValue: previous, newValue: v };
        }
      }

      if (Object.keys(changes).length > 0) {
        listeners.forEach((listener) => listener(changes, areaName));
      }
    },
  });

  (globalThis as unknown as { chrome: unknown }).chrome = {
    storage: {
      sync: makeArea(sync, 'sync'),
      local: makeArea(local, 'local'),
      onChanged: {
        addListener: (listener: ChangeListener) => listeners.push(listener),
        removeListener: (listener: ChangeListener) => {
          const index = listeners.indexOf(listener);
          if (index >= 0) {
            listeners.splice(index, 1);
          }
        },
      },
    },
  };

  return {
    sync,
    local,
    emit: (area, changes) => listeners.forEach((listener) => listener(changes, area)),
  };
}
