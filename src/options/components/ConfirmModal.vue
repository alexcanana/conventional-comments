<script setup lang="ts">
import Dialog from 'primevue/dialog';

const props = defineProps<{
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  confirmIcon: string;
}>();
const emit = defineEmits<{ confirm: []; cancel: [] }>();

// Bridge the boolean `open` prop to Dialog's v-model:visible; closing via the
// mask or the ✕ maps to cancel.
function onVisibleChange(value: boolean): void {
  if (!value && props.open) {
    emit('cancel');
  }
}
</script>

<template>
  <Dialog
    :visible="open"
    modal
    :draggable="false"
    :style="{ width: '28rem' }"
    :pt="{ root: { 'data-testid': 'confirm-dialog' } }"
    @update:visible="onVisibleChange"
  >
    <template #header>
      <span class="opt-modal-title"><i class="pi pi-exclamation-triangle" /> {{ title }}</span>
    </template>
    <p class="opt-modal-desc">{{ message }}</p>
    <template #footer>
      <div class="opt-modal-actions">
        <!-- PrimeVue Dialog.focus() picks the first [autofocus] element (footer
             checked first), else falls back to the ✕ close button. Mark Cancel
             so the safe, non-destructive action is focused on open. -->
        <button class="opt-btn" data-testid="confirm-cancel" autofocus @click="emit('cancel')">
          <i class="pi pi-times" /> Cancel
        </button>
        <button class="opt-btn danger-fill" data-testid="confirm-accept" @click="emit('confirm')">
          <i :class="`pi ${confirmIcon}`" /> {{ confirmLabel }}
        </button>
      </div>
    </template>
  </Dialog>
</template>
