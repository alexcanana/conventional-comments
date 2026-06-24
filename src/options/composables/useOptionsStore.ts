import { reactive } from 'vue';
import { readOptions, writeOptions, subscribeToOptionsChanges } from '../../lib/options-storage';
import { DEFAULT_OPTIONS, type ExtensionOptions } from '../../lib/options';

export function createOptionsStore() {
  const options = reactive<ExtensionOptions>({ ...DEFAULT_OPTIONS });
  let unsubscribe: (() => void) | null = null;
  // Serialized snapshots of values we've written whose onChanged echo we haven't
  // matched yet. Matching incoming changes by content (rather than counting them)
  // tells our own writes apart from genuine external ones — and, unlike a bare
  // counter, never leaks a suppression slot when a no-op write fires no onChanged
  // event at all (chrome.storage stays silent when a value doesn't change).
  const pendingSelfWrites: string[] = [];

  function apply(next: ExtensionOptions): void {
    Object.assign(options, next);
  }

  async function load(): Promise<void> {
    apply(await readOptions());

    // Subscribe at most once — load() may be called again on remount.
    if (!unsubscribe) {
      unsubscribe = subscribeToOptionsChanges((next) => {
        const echo = pendingSelfWrites.indexOf(JSON.stringify(next));

        // The onChanged echo of one of our own writes: drop it, along with any
        // older still-pending writes (events arrive in order, so an earlier one
        // we never matched — e.g. a coalesced or no-op write — won't match later).
        if (echo !== -1) {
          pendingSelfWrites.splice(0, echo + 1);

          return;
        }

        // A genuine change from elsewhere (another tab, the service worker).
        apply(next);
      });
    }
  }

  async function update(patch: Partial<ExtensionOptions>): Promise<void> {
    const previous = { ...options };
    apply({ ...options, ...patch });

    const serialized = JSON.stringify(options);
    pendingSelfWrites.push(serialized);

    try {
      await writeOptions({ ...options });
    } catch (error) {
      // No echo will arrive for a failed write — restore the previous state and
      // drop the snapshot we queued.
      apply(previous);
      const index = pendingSelfWrites.lastIndexOf(serialized);
      if (index !== -1) {
        pendingSelfWrites.splice(index, 1);
      }

      throw error;
    }
  }

  function dispose(): void {
    unsubscribe?.();
    unsubscribe = null;
  }

  return { options, load, update, dispose };
}

let shared: ReturnType<typeof createOptionsStore> | null = null;
export function useOptionsStore() {
  if (!shared) {
    shared = createOptionsStore();
  }

  return shared;
}
