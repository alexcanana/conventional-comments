<script setup lang="ts">
const emit = defineEmits<{ reset: [] }>();
</script>

<template>
  <div class="opt-danger">
    <div class="opt-danger-head"><i class="pi pi-exclamation-triangle" /> Danger zone</div>
    <div class="opt-danger-row">
      <div>
        <div class="opt-danger-title">Reset all settings</div>
        <div class="opt-danger-desc">
          Restore the trigger, sites, labels, decorations, and label usage counts to their defaults.
          This cannot be undone.
        </div>
      </div>
      <button
        class="opt-btn danger-fill"
        style="flex-shrink: 0"
        data-testid="reset-all"
        @click="emit('reset')"
      >
        <i class="pi pi-replay" /> Reset
      </button>
    </div>
  </div>
</template>
