<script setup lang="ts">
import { computed } from 'vue';
import PvToggleSwitch from 'primevue/toggleswitch';

const props = defineProps<{
  modelValue: boolean;
  label: string;
  testId?: string;
  disabled?: boolean;
  hideLabel?: boolean;
}>();
const emit = defineEmits<{ 'update:modelValue': [boolean] }>();

const model = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
});

// Stable id so the <label> associates with the rendered input for a11y name.
const inputId = computed(() => (props.testId ? `${props.testId}-input` : undefined));
</script>

<template>
  <div class="opt-toggle">
    <PvToggleSwitch
      v-model="model"
      :disabled="disabled"
      :inputId="inputId"
      :ariaLabel="label"
      :pt="{ input: { 'data-testid': testId } }"
    />
    <label v-if="inputId && !hideLabel" :for="inputId">{{ label }}</label>
    <template v-else-if="!hideLabel">{{ label }}</template>
  </div>
</template>
