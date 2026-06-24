import { createApp } from 'vue';
import PrimeVue from 'primevue/config';
import App from './App.vue';
import { CcPreset } from '../theme/preset';
import '../styles/options.css';
import './popup.css';

createApp(App)
  .use(PrimeVue, { theme: { preset: CcPreset, options: { darkModeSelector: false } } })
  .mount('#app');
