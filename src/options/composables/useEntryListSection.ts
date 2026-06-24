import { ref, computed, type Ref, type ComputedRef } from 'vue';
import { useOptionsStore } from './useOptionsStore';
import { useToast } from 'primevue/usetoast';
import { isDuplicateKey } from '../../lib/validation';
import type { EntryOption, ExtensionOptions } from '../../lib/options';

type EntryListKey = 'labels' | 'decorations';

interface EntryListCopy {
  updated: string;
  updateFailed: string;
  added: string;
  addFailed: string;
  removed: (key: string) => string;
  saveFailed: string;
}

interface EntryListSection {
  adding: Ref<boolean>;
  entries: ComputedRef<EntryOption[]>;
  pendingRemovalIndex: Ref<number | null>;
  pendingRemovalName: ComputedRef<string>;
  validateField: (value: string, rowIndex: number, field: 'key' | 'description') => string | null;
  onEdit: (index: number, patch: Partial<EntryOption>) => Promise<void>;
  onToggleVisible: (index: number) => Promise<void>;
  onRemove: (index: number) => void;
  confirmRemove: () => Promise<void>;
  onReorder: (from: number, to: number) => Promise<void>;
  onAdd: (values: { key: string; description?: string }) => Promise<void>;
}

// The labels and decorations sections are the same EntryOption-list editor over
// a different store list with different copy. This composable holds that shared
// behaviour so a fix lands in one place rather than drifting across the two.
export function useEntryListSection(listKey: EntryListKey, copy: EntryListCopy): EntryListSection {
  const store = useOptionsStore();
  const toast = useToast();
  const adding = ref(false);
  const pendingRemovalIndex = ref<number | null>(null);

  const entries = computed<EntryOption[]>(() => store.options[listKey]);

  const pendingRemovalName = computed(() =>
    pendingRemovalIndex.value === null ? '' : (entries.value[pendingRemovalIndex.value]?.key ?? ''),
  );

  function persistPatch(next: EntryOption[]): Promise<void> {
    return store.update({ [listKey]: next } as Partial<ExtensionOptions>);
  }

  function validateKey(value: string, rowIndex: number): string | null {
    if (!value.trim()) {
      return 'Title is required.';
    }

    const others = entries.value.filter((_, index) => index !== rowIndex).map((entry) => entry.key);

    return isDuplicateKey(value, others) ? 'Name in use' : null;
  }

  function validateField(
    value: string,
    rowIndex: number,
    field: 'key' | 'description',
  ): string | null {
    return field === 'key' ? validateKey(value, rowIndex) : null;
  }

  async function onEdit(index: number, patch: Partial<EntryOption>): Promise<void> {
    const next = entries.value.map((entry, entryIndex) =>
      entryIndex === index ? { ...entry, ...patch } : entry,
    );

    try {
      await persistPatch(next);
      toast.add({ severity: 'success', summary: copy.updated, life: 5000 });
    } catch {
      toast.add({ severity: 'error', summary: copy.updateFailed, life: 5000 });
    }
  }

  async function onToggleVisible(index: number): Promise<void> {
    const next = entries.value.map((entry, entryIndex) =>
      entryIndex === index ? { ...entry, isEnabled: !entry.isEnabled } : entry,
    );

    try {
      await persistPatch(next);
    } catch {
      toast.add({ severity: 'error', summary: copy.saveFailed, life: 5000 });
    }
  }

  function onRemove(index: number): void {
    pendingRemovalIndex.value = index;
  }

  async function confirmRemove(): Promise<void> {
    const index = pendingRemovalIndex.value;

    if (index === null) {
      return;
    }

    const removed = entries.value[index];
    pendingRemovalIndex.value = null;

    try {
      await persistPatch(entries.value.filter((_, entryIndex) => entryIndex !== index));
      toast.add({ severity: 'success', summary: copy.removed(removed.key), life: 5000 });
    } catch {
      toast.add({ severity: 'error', summary: copy.saveFailed, life: 5000 });
    }
  }

  async function onReorder(from: number, to: number): Promise<void> {
    const next = [...entries.value];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);

    try {
      await persistPatch(next.map((entry, entryIndex) => ({ ...entry, sortOrder: entryIndex })));
    } catch {
      toast.add({ severity: 'error', summary: copy.saveFailed, life: 5000 });
    }
  }

  async function onAdd(values: { key: string; description?: string }): Promise<void> {
    adding.value = false;

    const next = [
      ...entries.value,
      {
        key: values.key,
        description: values.description ?? '',
        isEnabled: true,
        sortOrder: entries.value.length,
      },
    ];

    try {
      await persistPatch(next);
      toast.add({ severity: 'success', summary: copy.added, life: 5000 });
    } catch {
      toast.add({ severity: 'error', summary: copy.addFailed, life: 5000 });
    }
  }

  return {
    adding,
    entries,
    pendingRemovalIndex,
    pendingRemovalName,
    validateField,
    onEdit,
    onToggleVisible,
    onRemove,
    confirmRemove,
    onReorder,
    onAdd,
  };
}
