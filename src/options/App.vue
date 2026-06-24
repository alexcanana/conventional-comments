<script setup lang="ts">
import { onMounted } from 'vue';
import Toast from 'primevue/toast';
import { useOptionsStore } from './composables/useOptionsStore';
import SectionTrigger from './components/SectionTrigger.vue';
import SectionSites from './components/SectionSites.vue';
import SectionLabels from './components/SectionLabels.vue';
import SectionDecorations from './components/SectionDecorations.vue';
import SectionAdvanced from './components/SectionAdvanced.vue';

const store = useOptionsStore();
onMounted(() => void store.load());
</script>

<template>
  <div class="opt-shell">
    <div class="opt-header">
      <div class="opt-header-inner">
        <span class="opt-logo">CONVENTIONAL COMMENTS</span>
        <span class="opt-sep">/</span>
        <span class="opt-title">Settings</span>
      </div>
    </div>
    <div class="opt-main">
      <SectionTrigger />
      <SectionSites />
      <SectionLabels />
      <SectionDecorations />
      <SectionAdvanced />
    </div>
    <Toast
      position="top-right"
      success-icon="pi pi-check-circle"
      error-icon="pi pi-exclamation-circle"
      close-icon="pi pi-times"
      :pt="{
        root: { 'data-testid': 'toasts', style: { top: '4.5rem' } },
        message: { class: 'opt-toast' },
      }"
    />
  </div>
</template>
