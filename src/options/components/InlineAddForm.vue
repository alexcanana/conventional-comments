<script setup lang="ts">
import { ref, computed } from 'vue';
import InputText from 'primevue/inputtext';

const props = withDefaults(
  defineProps<{
    fields: 'origin' | 'title-description';
    validate: (value: string, rowIndex: number, field: 'key' | 'description') => string | null;
    titlePlaceholder?: string;
    descriptionPlaceholder?: string;
  }>(),
  { titlePlaceholder: 'e.g. risk', descriptionPlaceholder: 'What this label means…' },
);

const emit = defineEmits<{
  submit: [values: { key: string; description?: string }];
  cancel: [];
}>();

const keyValue = ref('');
const descriptionValue = ref('');
// Don't flag the empty field as invalid until the user has started typing.
const touched = ref(false);

const keyError = computed(() => props.validate(keyValue.value, -1, 'key'));
const descriptionError = computed(() =>
  props.fields === 'title-description'
    ? props.validate(descriptionValue.value, -1, 'description')
    : null,
);
const invalid = computed(() => !!keyError.value || !!descriptionError.value);

function submit(): void {
  if (invalid.value) {
    return;
  }

  emit(
    'submit',
    props.fields === 'origin'
      ? { key: keyValue.value.trim() }
      : { key: keyValue.value.trim(), description: descriptionValue.value.trim() },
  );
}
</script>

<template>
  <div class="opt-inline-form" data-testid="add-form">
    <template v-if="fields === 'origin'">
      <label class="opt-label">Site</label>
      <div class="opt-input-row">
        <InputText
          v-model="keyValue"
          class="opt-input opt-input-md"
          :class="{ 'is-error': touched && keyError }"
          placeholder="https://gitlab.example.com"
          data-testid="add-form-title"
          @input="touched = true"
          @keydown.escape="emit('cancel')"
        />
      </div>
      <div v-if="touched && keyError" class="opt-error-msg">
        <i class="pi pi-exclamation-circle" /> {{ keyError }}
      </div>
    </template>

    <template v-else>
      <div class="opt-form-row">
        <div style="flex: 0 0 190px">
          <label class="opt-label">Title</label>
          <InputText
            v-model="keyValue"
            class="opt-input opt-input-md"
            :class="{ 'is-error': touched && keyError }"
            :placeholder="titlePlaceholder"
            data-testid="add-form-title"
            @input="touched = true"
            @keydown.escape="emit('cancel')"
          />
        </div>
        <div style="flex: 1">
          <label class="opt-label">Description</label>
          <InputText
            v-model="descriptionValue"
            class="opt-input opt-input-md"
            :class="{ 'is-error': touched && descriptionError }"
            :placeholder="descriptionPlaceholder"
            data-testid="add-form-description"
            @input="touched = true"
            @keydown.escape="emit('cancel')"
          />
        </div>
      </div>
      <div v-if="touched && (keyError || descriptionError)" class="opt-error-msg">
        <i class="pi pi-exclamation-circle" /> {{ keyError ?? descriptionError }}
      </div>
    </template>

    <div class="opt-inline-form-actions">
      <button class="opt-btn" data-testid="add-form-cancel" @click="emit('cancel')">
        <i class="pi pi-times" /> Cancel
      </button>
      <button
        class="opt-btn primary"
        :disabled="invalid"
        data-testid="add-form-submit"
        @click="submit"
      >
        <i class="pi pi-check" /> Add
      </button>
    </div>
  </div>
</template>
