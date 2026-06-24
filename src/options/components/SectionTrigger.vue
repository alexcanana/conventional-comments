<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useOptionsStore } from '../composables/useOptionsStore';
import { useToast } from 'primevue/usetoast';
import InputText from 'primevue/inputtext';
import { validateTriggerKeyword } from '../../lib/validation';

const store = useOptionsStore();
const toast = useToast();
const draft = ref(store.options.triggerKeyword);

// Keep the field in sync once the store finishes loading (or is reset), since
// the draft is seeded from the default before load() resolves. Only adopt the
// new value when the draft still matches the previous store value: a dirty,
// unsaved edit must survive an external change written by another surface.
watch(
  () => store.options.triggerKeyword,
  (value, previous) => {
    if (draft.value === previous) {
      draft.value = value;
    }
  },
);

const error = computed(() => validateTriggerKeyword(draft.value));
const isUnchanged = computed(() => draft.value.trim() === store.options.triggerKeyword);

async function save(): Promise<void> {
  if (error.value || isUnchanged.value) {
    return;
  }

  try {
    await store.update({ triggerKeyword: draft.value.trim() });
    toast.add({ severity: 'success', summary: 'Settings saved.', life: 5000 });
  } catch {
    toast.add({ severity: 'error', summary: 'Couldn’t save the trigger keyword.', life: 5000 });
  }
}

function cancelEdit(): void {
  draft.value = store.options.triggerKeyword;
}
</script>

<template>
  <div class="opt-section" data-testid="section-trigger">
    <div class="opt-section-title"><i class="pi pi-bolt" /> Trigger</div>
    <div class="opt-section-desc">
      The keyword you type in a comment box to open the picker. Case-insensitive.
    </div>
    <label class="opt-label">Trigger keyword</label>
    <div style="display: flex; gap: 8px; align-items: center">
      <InputText
        v-model="draft"
        class="opt-input opt-input-md"
        :class="{ 'is-error': error }"
        style="max-width: 220px"
        data-testid="trigger-input"
        @keydown.escape="cancelEdit"
      />
      <button
        class="opt-btn primary"
        :disabled="!!error || isUnchanged"
        data-testid="trigger-save"
        @click="save"
      >
        <i class="pi pi-check" /> Save
      </button>
    </div>
    <div v-if="error" class="opt-error-msg"><i class="pi pi-exclamation-circle" /> {{ error }}</div>
    <div v-else class="opt-hint">
      Type "{{ draft }}" then a query — the picker opens. Default:
      <code data-testid="trigger-hint-code">cc</code>
    </div>
  </div>
</template>
