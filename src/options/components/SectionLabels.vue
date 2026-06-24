<script setup lang="ts">
import { ref } from 'vue';
import { useOptionsStore } from '../composables/useOptionsStore';
import { useEntryListSection } from '../composables/useEntryListSection';
import { useToast } from 'primevue/usetoast';
import { resetLabelUsageCounts } from '../../lib/options-storage';
import EditableTable from './EditableTable.vue';
import InlineAddForm from './InlineAddForm.vue';
import ToggleSwitch from './ToggleSwitch.vue';
import ConfirmModal from './ConfirmModal.vue';

const store = useOptionsStore();
const toast = useToast();
const confirmingReset = ref(false);

const {
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
} = useEntryListSection('labels', {
  updated: 'Label updated.',
  updateFailed: 'Couldn’t update the label.',
  added: 'Label added.',
  addFailed: 'Couldn’t add the label.',
  removed: (key) => `Label “${key}” removed.`,
  saveFailed: 'Couldn’t save the label.',
});

async function confirmReset(): Promise<void> {
  confirmingReset.value = false;
  await resetLabelUsageCounts();
  toast.add({ severity: 'success', summary: 'Usage counts reset.', life: 5000 });
}
</script>

<template>
  <div class="opt-section" data-testid="section-labels">
    <div class="opt-section-title"><i class="pi pi-bookmark" /> Labels</div>
    <div class="opt-section-desc">
      The conventional-comment labels. Add your own, drag to reorder, edit the title &amp;
      description, and toggle which appear in the picker.
    </div>
    <div class="opt-actions">
      <button class="opt-btn" data-testid="add-label" @click="adding = true">
        <i class="pi pi-plus" /> Add Label
      </button>
    </div>
    <InlineAddForm
      v-if="adding"
      fields="title-description"
      title-placeholder="e.g. risk"
      description-placeholder="What this label means…"
      :validate="validateField"
      @submit="onAdd"
      @cancel="adding = false"
    />
    <EditableTable
      mode="entries"
      entry-heading="Label"
      :rows="entries"
      :validate="validateField"
      @edit="onEdit"
      @toggle-visible="onToggleVisible"
      @remove="onRemove"
      @reorder="onReorder"
    />
    <div class="opt-toggle-list">
      <ToggleSwitch
        :model-value="store.options.showLabelDescriptionsInDropdown"
        label="Show descriptions in the picker"
        test-id="toggle-label-descriptions"
        @update:model-value="(value) => store.update({ showLabelDescriptionsInDropdown: value })"
      />
      <div class="opt-toggle-inline">
        <ToggleSwitch
          :model-value="store.options.sortLabelsByUsage"
          label="Sort labels by how often I use them"
          test-id="toggle-sort-usage"
          @update:model-value="(value) => store.update({ sortLabelsByUsage: value })"
        />
        <button
          class="opt-btn sm danger"
          type="button"
          data-testid="reset-counts"
          @click="confirmingReset = true"
        >
          <i class="pi pi-replay" /> Reset counts
        </button>
      </div>
    </div>
    <ConfirmModal
      :open="pendingRemovalIndex !== null"
      title="Remove this label?"
      :message="`“${pendingRemovalName}” will no longer appear in the picker. You can add it again later.`"
      confirm-label="Remove"
      confirm-icon="pi-trash"
      @confirm="confirmRemove"
      @cancel="pendingRemovalIndex = null"
    />
    <ConfirmModal
      :open="confirmingReset"
      title="Reset usage counts?"
      message="This clears how often each label has been used, so usage-based sorting starts fresh. This cannot be undone."
      confirm-label="Reset"
      confirm-icon="pi-replay"
      @confirm="confirmReset"
      @cancel="confirmingReset = false"
    />
  </div>
</template>
