<script setup lang="ts">
import { useOptionsStore } from '../composables/useOptionsStore';
import { useEntryListSection } from '../composables/useEntryListSection';
import EditableTable from './EditableTable.vue';
import InlineAddForm from './InlineAddForm.vue';
import ToggleSwitch from './ToggleSwitch.vue';
import ConfirmModal from './ConfirmModal.vue';

const store = useOptionsStore();
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
} = useEntryListSection('decorations', {
  updated: 'Decoration updated.',
  updateFailed: 'Couldn’t update the decoration.',
  added: 'Decoration added.',
  addFailed: 'Couldn’t add the decoration.',
  removed: (key) => `Decoration “${key}” removed.`,
  saveFailed: 'Couldn’t save the decoration.',
});
</script>

<template>
  <div class="opt-section" data-testid="section-decorations">
    <div class="opt-section-title"><i class="pi pi-tags" /> Decorations</div>
    <div class="opt-section-desc">
      Optional modifiers shown after a label, e.g. <code>suggestion (non-blocking)</code>. Add your
      own, drag to reorder, edit the title &amp; description, and toggle visibility.
    </div>
    <div class="opt-actions">
      <button class="opt-btn" data-testid="add-decoration" @click="adding = true">
        <i class="pi pi-plus" /> Add Decoration
      </button>
    </div>
    <InlineAddForm
      v-if="adding"
      fields="title-description"
      title-placeholder="e.g. security"
      description-placeholder="What this decoration means…"
      :validate="validateField"
      @submit="onAdd"
      @cancel="adding = false"
    />
    <EditableTable
      mode="entries"
      entry-heading="Decoration"
      :rows="entries"
      :validate="validateField"
      @edit="onEdit"
      @toggle-visible="onToggleVisible"
      @remove="onRemove"
      @reorder="onReorder"
    />
    <div class="opt-toggle-list">
      <ToggleSwitch
        :model-value="store.options.showDecorationDescriptions"
        label="Show decoration descriptions"
        test-id="toggle-decoration-descriptions"
        @update:model-value="(value) => store.update({ showDecorationDescriptions: value })"
      />
    </div>
    <ConfirmModal
      :open="pendingRemovalIndex !== null"
      title="Remove this decoration?"
      :message="`“${pendingRemovalName}” will no longer appear after a label. You can add it again later.`"
      confirm-label="Remove"
      confirm-icon="pi-trash"
      @confirm="confirmRemove"
      @cancel="pendingRemovalIndex = null"
    />
  </div>
</template>
