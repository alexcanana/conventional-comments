import { createApp } from 'vue';
import PrimeVue from 'primevue/config';
import ToastService from 'primevue/toastservice';
import App from './App.vue';
import { CcPreset } from './theme/preset';
import './styles/options.css';

createApp(App)
  // The options page is light-only (dark theme removed in Phase 1). Disable
  // PrimeVue's default `darkModeSelector: 'system'` so components don't render
  // dark Aura tokens on a dark OS and clash with the light page chrome.
  .use(PrimeVue, { theme: { preset: CcPreset, options: { darkModeSelector: false } } })
  .use(ToastService)
  .mount('#app');
