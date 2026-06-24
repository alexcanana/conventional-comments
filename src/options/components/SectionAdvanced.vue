<script setup lang="ts">
import { ref } from 'vue';
import { useOptionsStore } from '../composables/useOptionsStore';
import { useToast } from 'primevue/usetoast';
import { DEFAULT_OPTIONS } from '../../lib/options';
import { resetLabelUsageCounts } from '../../lib/options-storage';
import DangerZone from './DangerZone.vue';
import ConfirmModal from './ConfirmModal.vue';

const store = useOptionsStore();
const toast = useToast();
const confirming = ref(false);

async function reset(): Promise<void> {
  confirming.value = false;

  try {
    // Deep-clone so the reactive store never aliases DEFAULT_OPTIONS' nested
    // arrays; a later in-place edit would otherwise corrupt the shared defaults.
    await store.update(structuredClone(DEFAULT_OPTIONS));
    // Usage counts live in local storage, outside the options object, so a
    // defaults reset must clear them explicitly or stale counts survive.
    await resetLabelUsageCounts();
    toast.add({ severity: 'success', summary: 'Settings reset to defaults.', life: 5000 });
  } catch {
    toast.add({ severity: 'error', summary: 'Couldn’t reset settings.', life: 5000 });
  }
}
</script>

<template>
  <div class="opt-section" data-testid="section-advanced">
    <DangerZone @reset="confirming = true" />
    <ConfirmModal
      :open="confirming"
      title="Reset all settings?"
      message="This restores the trigger, sites, labels, decorations, and label usage counts to their defaults. This cannot be undone."
      confirm-label="Reset"
      confirm-icon="pi-replay"
      @confirm="reset"
      @cancel="confirming = false"
    />
  </div>
</template>
