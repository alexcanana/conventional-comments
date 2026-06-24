import { ref, watch } from 'vue';

// Page-wide "only one inline edit open at a time" coordinator. Each editable
// surface (every EditableTable instance) gets a unique token; claiming it
// preempts every other surface, so starting an edit in one table closes an open
// edit in another. Module-level state is shared across all instances and resets
// on page load.
const activeEditor = ref<symbol | null>(null);

export function useExclusiveEdit(onPreempt: () => void): {
  claim: () => void;
  release: () => void;
} {
  const token = Symbol('editor');

  // When any other surface becomes active (or all editing clears), close ours.
  watch(activeEditor, (current) => {
    if (current !== token) {
      onPreempt();
    }
  });

  return {
    claim(): void {
      activeEditor.value = token;
    },
    release(): void {
      // Only clear if we still hold it — never stomp another surface's claim.
      if (activeEditor.value === token) {
        activeEditor.value = null;
      }
    },
  };
}
