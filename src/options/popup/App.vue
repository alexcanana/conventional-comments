<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import InputText from 'primevue/inputtext';
import ToggleSwitch from '../components/ToggleSwitch.vue';
import { readOptions, writeOptions } from '../../lib/options-storage';
import { validateTriggerKeyword, displayOrigin } from '../../lib/validation';
import { requestOrigin } from '../composables/useOriginPermissions';
import {
  originPatternFromUrl,
  isOriginEnabled,
  withOriginEnabled,
  withOriginDisabled,
} from '../../lib/origins';
import { DEFAULT_ALLOWED_ORIGINS, type ExtensionOptions } from '../../lib/options';

const BUILTIN_PATTERNS = DEFAULT_ALLOWED_ORIGINS;
const SAVED_MESSAGE_DURATION = 5000;

const options = ref<ExtensionOptions | null>(null);
const pattern = ref<string | null>(null);
const enabled = ref(false);
const trigger = ref('');
const busy = ref(false);
const toggleResetKey = ref(0);
const saved = ref(false);

let savedTimer: ReturnType<typeof setTimeout> | undefined;

const available = computed(() => pattern.value !== null);
const host = computed(() =>
  pattern.value ? displayOrigin(pattern.value).replace(/^https?:\/\//, '') : '',
);
const triggerError = computed(() => validateTriggerKeyword(trigger.value));
const triggerUnchanged = computed(
  () => trigger.value.trim() === (options.value?.triggerKeyword ?? ''),
);

const statusText = computed(() => {
  if (!available.value) {
    return 'Not available on this page';
  }

  return enabled.value ? `Active on ${host.value}` : `Off on ${host.value}`;
});

watch(trigger, () => {
  saved.value = false;
});

onMounted(async () => {
  const loaded = await readOptions();
  options.value = loaded;
  trigger.value = loaded.triggerKeyword;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  pattern.value = originPatternFromUrl(tab?.url ?? '');

  if (pattern.value) {
    const permitted = await chrome.permissions.contains({ origins: [pattern.value] });
    enabled.value = isOriginEnabled(loaded, pattern.value) && permitted;
  }
});

async function onToggle(next: boolean): Promise<void> {
  if (!pattern.value || !options.value || busy.value) {
    return;
  }

  busy.value = true;

  try {
    if (next) {
      const granted = BUILTIN_PATTERNS.includes(pattern.value)
        ? true
        : await requestOrigin(pattern.value);

      if (!granted) {
        enabled.value = false;
        toggleResetKey.value += 1;

        return;
      }

      // Re-read so a concurrent options-page edit isn't clobbered: writeOptions
      // persists the whole object, so a stale snapshot would revert other fields.
      const latest = await readOptions();
      const updated = withOriginEnabled(latest, pattern.value);
      await writeOptions(updated);
      options.value = updated;
      enabled.value = true;
    } else {
      const latest = await readOptions();
      const updated = withOriginDisabled(latest, pattern.value);
      await writeOptions(updated);
      options.value = updated;
      enabled.value = false;
    }
  } finally {
    busy.value = false;
  }
}

async function saveTrigger(): Promise<void> {
  if (!options.value || triggerError.value || triggerUnchanged.value) {
    return;
  }

  // Re-read so a concurrent options-page edit isn't clobbered: writeOptions
  // persists the whole object, so a stale snapshot would revert other fields.
  const latest = await readOptions();
  const updated = { ...latest, triggerKeyword: trigger.value.trim() };
  await writeOptions(updated);
  options.value = updated;
  saved.value = true;

  if (savedTimer) {
    clearTimeout(savedTimer);
  }

  savedTimer = setTimeout(() => {
    saved.value = false;
  }, SAVED_MESSAGE_DURATION);
}

function openSettings(): void {
  chrome.runtime.openOptionsPage();
  window.close();
}
</script>

<template>
  <div class="pop">
    <header class="pop-header">
      <span class="opt-logo">CONVENTIONAL COMMENTS</span>
      <button
        class="pop-gear"
        aria-label="Open settings"
        data-testid="popup-open-settings"
        @click="openSettings"
      >
        <i class="pi pi-cog" />
      </button>
    </header>

    <main class="pop-body">
      <div
        class="pop-status"
        :class="{ 'is-on': enabled && available, 'is-unavailable': !available }"
        data-testid="popup-status"
      >
        <span class="pop-dot" /> {{ statusText }}
      </div>

      <div v-if="available" class="pop-site">
        <span class="pop-site-label"><i class="pi pi-globe" /> Enabled on this site</span>
        <ToggleSwitch
          :key="toggleResetKey"
          :model-value="enabled"
          label="Enabled on this site"
          test-id="popup-enabled"
          hide-label
          @update:model-value="onToggle"
        />
      </div>

      <div class="pop-wave" aria-hidden="true" />

      <div class="pop-field">
        <label class="opt-label"><i class="pi pi-bolt" /> Trigger keyword</label>
        <div class="pop-desc">Type this in a comment box to open the picker. Case-insensitive.</div>
        <div class="pop-trigger-row">
          <InputText
            v-model="trigger"
            class="opt-input opt-input-md"
            :class="{ 'is-error': triggerError }"
            data-testid="popup-trigger-input"
            @keydown.enter="saveTrigger"
          />
          <button
            class="opt-btn primary"
            :disabled="!!triggerError || triggerUnchanged"
            data-testid="popup-trigger-save"
            @click="saveTrigger"
          >
            <i class="pi pi-check" /> Save
          </button>
        </div>
        <div v-if="triggerError" class="opt-error-msg" data-testid="popup-trigger-error">
          <i class="pi pi-exclamation-circle" /> {{ triggerError }}
        </div>
        <div v-else-if="saved" class="pop-saved" data-testid="popup-trigger-saved">
          <i class="pi pi-check" /> Saved.
        </div>
      </div>
    </main>
  </div>
</template>
