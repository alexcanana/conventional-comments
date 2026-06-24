<script setup lang="ts">
import { ref, computed, nextTick, watch, onBeforeUnmount } from 'vue';
import DataTable from 'primevue/datatable';
import type { DataTablePassThroughMethodOptions } from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import ToggleSwitch from './ToggleSwitch.vue';
import { useExclusiveEdit } from '../composables/useExclusiveEdit';

interface Row {
  key: string;
  description?: string;
  isEnabled?: boolean;
  isDefault?: boolean;
}

const props = withDefaults(
  defineProps<{
    rows: Row[];
    mode: 'origins' | 'entries';
    validate: (value: string, rowIndex: number, field: 'key' | 'description') => string | null;
    entryHeading?: string;
  }>(),
  { entryHeading: 'Label' },
);

const emit = defineEmits<{
  edit: [index: number, patch: { key?: string; description?: string }];
  toggleVisible: [index: number];
  toggle: [index: number];
  remove: [index: number];
  reorder: [from: number, to: number];
}>();

const editingIndex = ref(-1);
const draftKey = ref('');
const draftDescription = ref('');
const keyInput = ref<HTMLInputElement | null>(null);

// PrimeVue InputText's root element is its <input>, exposed as $el. Capture it so
// we can focus the title field and put the caret at the end when editing starts.
// Only record on mount (ignore the null unmount): this one function ref is shared
// by every row's editor, and when switching to an EARLIER row that row's editor
// mounts before the previous row's editor unmounts (callbacks fire in DOM order),
// so honoring null would clobber the freshly-mounted input and lose focus.
// startEdit only reads keyInput after a new editor has mounted, so a stale ref is
// never used.
function setKeyInput(element: unknown): void {
  const candidate = element as { $el?: HTMLInputElement } | null;

  if (candidate) {
    keyInput.value = candidate.$el ?? (candidate as HTMLInputElement);
  }
}

const keyError = computed(() =>
  editingIndex.value >= 0 ? props.validate(draftKey.value, editingIndex.value, 'key') : null,
);
const descriptionError = computed(() =>
  editingIndex.value >= 0 && props.mode === 'entries'
    ? props.validate(draftDescription.value, editingIndex.value, 'description')
    : null,
);
const editInvalid = computed(() => !!keyError.value || !!descriptionError.value);

const editUnchanged = computed(() => {
  if (editingIndex.value < 0) {
    return true;
  }

  const row = props.rows[editingIndex.value];
  const keyUnchanged = draftKey.value.trim() === row.key;

  if (props.mode === 'origins') {
    return keyUnchanged;
  }

  return keyUnchanged && draftDescription.value === (row.description ?? '');
});

// Only one inline edit may be open across the whole page; claiming preempts the
// other tables, and being preempted closes this table's open edit.
const { claim, release } = useExclusiveEdit(() => {
  editingIndex.value = -1;
});

async function startEdit(index: number): Promise<void> {
  editingIndex.value = index;
  draftKey.value = props.rows[index].key;
  draftDescription.value = props.rows[index].description ?? '';
  claim();

  await nextTick();
  const field = keyInput.value;

  if (field) {
    field.focus();
    field.setSelectionRange(field.value.length, field.value.length);
  }
}

function cancelEdit(): void {
  editingIndex.value = -1;
  release();
}

// Cancel the edit when the user clicks outside the row being edited (e.g. another
// button or empty space). Clicks on the confirm/cancel buttons or the other input
// stay inside the row, so they're unaffected. Only listens while editing.
function onPointerDownOutside(event: PointerEvent): void {
  const row = keyInput.value?.closest('tr');
  const target = event.target as Node | null;

  if (row && target && !row.contains(target)) {
    cancelEdit();
  }
}

watch(editingIndex, (index) => {
  if (index >= 0) {
    document.addEventListener('pointerdown', onPointerDownOutside, true);
  } else {
    document.removeEventListener('pointerdown', onPointerDownOutside, true);
  }
});

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onPointerDownOutside, true);
});

function confirmEdit(): void {
  if (editInvalid.value) {
    return;
  }

  const patch =
    props.mode === 'origins'
      ? { key: draftKey.value.trim() }
      : { key: draftKey.value.trim(), description: draftDescription.value };
  emit('edit', editingIndex.value, patch);
  editingIndex.value = -1;
  release();
}

function onReorder(event: { dragIndex: number; dropIndex: number }): void {
  // A reorder mid-edit would shift editingIndex onto a different row; ignore it
  // (the dragged row snaps back) until the edit is confirmed or cancelled.
  if (editingIndex.value >= 0) {
    return;
  }

  if (event.dragIndex !== event.dropIndex) {
    emit('reorder', event.dragIndex, event.dropIndex);
  }
}

// Stable per-row test hooks. The function form of pt.bodyRow gives the row index
// (context.index) and the source array (props.value); derive data-enabled so the
// visibility spec can assert it without depending on a CSS class.
// NOTE: context.index is the rendered (page-local) index, which equals the source
// index only because this table is never sorted, filtered, or paginated. If any of
// those are added later, map through the page offset before indexing props.value.
function rowAttrs(options: DataTablePassThroughMethodOptions): Record<string, string> {
  const rows = options.props.value as Row[];
  const row = rows?.[options.context.index];

  return {
    'data-testid': 'row',
    'data-enabled': row?.isEnabled === false ? 'false' : 'true',
  };
}

// Dim hidden entry rows, matching the old `.is-hidden` row styling.
function rowClass(row: Row): string {
  return row.isEnabled === false ? 'is-hidden' : '';
}
</script>

<template>
  <!-- entries: name + description, drag-reorder, visibility toggle -->
  <DataTable
    v-if="mode === 'entries'"
    :value="rows"
    data-key="key"
    :row-class="rowClass"
    :pt="{ bodyRow: rowAttrs }"
    class="opt-dt"
    @row-reorder="onReorder"
  >
    <Column row-reorder row-reorder-icon="pi pi-arrows-v" header-style="width: 2.5rem" />
    <Column :header="entryHeading" header-style="width: 170px">
      <template #body="{ data, index }">
        <template v-if="editingIndex === index">
          <InputText
            :ref="setKeyInput"
            v-model="draftKey"
            class="opt-input opt-input-sm"
            :class="keyError ? 'is-error' : 'is-ok'"
            style="max-width: 150px"
            data-testid="row-edit-title"
            @keydown.escape="cancelEdit"
          />
          <div v-if="keyError" class="opt-error-msg" style="margin-top: 6px">
            <i class="pi pi-exclamation-circle" /> {{ keyError }}
          </div>
        </template>
        <span v-else class="opt-trunc opt-name" data-testid="row-name">{{ data.key }}</span>
      </template>
    </Column>
    <Column header="Description">
      <template #body="{ data, index }">
        <InputText
          v-if="editingIndex === index"
          v-model="draftDescription"
          class="opt-input opt-input-sm"
          :class="descriptionError ? 'is-error' : 'is-ok'"
          data-testid="row-edit-description"
          @keydown.escape="cancelEdit"
        />
        <span v-else class="opt-trunc opt-desc-cell">{{ data.description }}</span>
      </template>
    </Column>
    <Column header="Actions" header-style="width: 120px">
      <template #body="{ data, index }">
        <div class="opt-table-actions" style="justify-content: flex-end">
          <template v-if="editingIndex === index">
            <button
              class="opt-btn-icon ok"
              :disabled="editInvalid || editUnchanged"
              data-testid="row-confirm"
              @click="confirmEdit"
            >
              <i class="pi pi-check" />
            </button>
            <button class="opt-btn-icon" data-testid="row-cancel" @click="cancelEdit">
              <i class="pi pi-times" />
            </button>
          </template>
          <template v-else>
            <button
              class="opt-btn-icon eye"
              :class="{ off: !data.isEnabled }"
              :disabled="editingIndex !== -1"
              :title="data.isEnabled ? 'Visible in picker' : 'Hidden from picker'"
              :aria-label="data.isEnabled ? 'Visible in picker' : 'Hidden from picker'"
              data-testid="row-visibility"
              @click="emit('toggleVisible', index)"
            >
              <i
                class="pi"
                :class="data.isEnabled ? 'pi-eye' : 'pi-eye-slash'"
                aria-hidden="true"
              />
            </button>
            <button class="opt-btn-icon" data-testid="row-edit" @click="startEdit(index)">
              <i class="pi pi-pencil" />
            </button>
            <button
              class="opt-btn-icon"
              :disabled="editingIndex !== -1"
              data-testid="row-remove"
              @click="emit('remove', index)"
            >
              <i class="pi pi-trash" />
            </button>
          </template>
        </div>
      </template>
    </Column>
  </DataTable>

  <!-- origins: site column, enabled toggle, edit/remove (locked for default sites) -->
  <DataTable
    v-else
    :value="rows"
    data-key="key"
    :row-class="rowClass"
    :pt="{ bodyRow: rowAttrs }"
    class="opt-dt"
  >
    <Column header="Site">
      <template #body="{ data, index }">
        <template v-if="editingIndex === index">
          <InputText
            :ref="setKeyInput"
            v-model="draftKey"
            class="opt-input opt-input-sm"
            :class="keyError ? 'is-error' : 'is-ok'"
            data-testid="row-edit-title"
            @keydown.escape="cancelEdit"
          />
          <div v-if="keyError" class="opt-error-msg" style="margin-top: 6px">
            <i class="pi pi-exclamation-circle" /> {{ keyError }}
          </div>
        </template>
        <span v-else class="opt-site-cell">
          <span class="opt-site-dot" :class="{ 'is-on': data.isEnabled !== false }" />
          <span class="opt-table-domain" data-testid="row-name">{{ data.key }}</span>
        </span>
      </template>
    </Column>
    <Column header="Enabled" header-style="width: 126px">
      <template #body="{ data, index }">
        <ToggleSwitch
          :model-value="data.isEnabled !== false"
          :label="`Enable ${data.key}`"
          :test-id="`row-toggle-${index}`"
          :disabled="editingIndex !== -1"
          hide-label
          @update:model-value="emit('toggle', index)"
        />
      </template>
    </Column>
    <Column header="Actions" header-style="width: 96px">
      <template #body="{ data, index }">
        <div class="opt-table-actions" style="justify-content: flex-end">
          <template v-if="editingIndex === index">
            <button
              class="opt-btn-icon ok"
              :disabled="editInvalid || editUnchanged"
              data-testid="row-confirm"
              @click="confirmEdit"
            >
              <i class="pi pi-check" />
            </button>
            <button class="opt-btn-icon" data-testid="row-cancel" @click="cancelEdit">
              <i class="pi pi-times" />
            </button>
          </template>
          <template v-else>
            <button
              class="opt-btn-icon"
              :disabled="data.isDefault || editingIndex !== -1"
              data-testid="row-edit"
              @click="startEdit(index)"
            >
              <i class="pi pi-pencil" />
            </button>
            <button
              class="opt-btn-icon"
              :disabled="data.isDefault || editingIndex !== -1"
              data-testid="row-remove"
              @click="emit('remove', index)"
            >
              <i class="pi pi-trash" />
            </button>
          </template>
        </div>
      </template>
    </Column>
  </DataTable>
</template>
