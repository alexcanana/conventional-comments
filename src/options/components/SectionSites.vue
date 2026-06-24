<script setup lang="ts">
import { computed, ref } from 'vue';
import { useOptionsStore } from '../composables/useOptionsStore';
import { useToast } from 'primevue/usetoast';
import { validateOriginPattern, normalizeOriginPattern, displayOrigin } from '../../lib/validation';
import { requestOrigin, removeOrigin } from '../composables/useOriginPermissions';
import {
  listedOrigins,
  isDefaultOrigin,
  withOriginEnabled,
  withOriginDisabled,
} from '../../lib/origins';
import EditableTable from './EditableTable.vue';
import InlineAddForm from './InlineAddForm.vue';
import ConfirmModal from './ConfirmModal.vue';

const store = useOptionsStore();
const toast = useToast();
const adding = ref(false);
const pendingRemoval = ref<string | null>(null);

const sites = computed(() => listedOrigins(store.options));
const rows = computed(() =>
  sites.value.map((site) => ({
    key: displayOrigin(site.pattern),
    isEnabled: site.isEnabled,
    isDefault: site.isDefault,
  })),
);

function patternAt(index: number): string | null {
  return sites.value[index]?.pattern ?? null;
}

async function onToggle(index: number): Promise<void> {
  const site = sites.value[index];

  if (!site) {
    return;
  }

  if (site.isEnabled) {
    const next = withOriginDisabled(store.options, site.pattern);
    await store.update({
      allowedOrigins: next.allowedOrigins,
      disabledOrigins: next.disabledOrigins,
    });

    return;
  }

  if (!site.isDefault) {
    const granted = await requestOrigin(site.pattern);

    if (!granted) {
      toast.add({ severity: 'error', summary: 'Permission denied for that site.', life: 5000 });

      return;
    }
  }

  const next = withOriginEnabled(store.options, site.pattern);
  await store.update({
    allowedOrigins: next.allowedOrigins,
    disabledOrigins: next.disabledOrigins,
  });
}

async function onAdd(values: { key: string }): Promise<void> {
  const pattern = normalizeOriginPattern(values.key);

  if (!pattern) {
    toast.add({ severity: 'error', summary: 'That doesn’t look like a site.', life: 5000 });

    return;
  }

  if (sites.value.some((site) => site.pattern === pattern)) {
    toast.add({ severity: 'error', summary: 'That site is already in the list.', life: 5000 });

    return;
  }

  const granted = await requestOrigin(pattern);

  if (!granted) {
    toast.add({ severity: 'error', summary: 'Permission denied for that site.', life: 5000 });

    return;
  }

  const next = withOriginEnabled(store.options, pattern);

  try {
    await store.update({
      allowedOrigins: next.allowedOrigins,
      disabledOrigins: next.disabledOrigins,
    });
    adding.value = false;
    toast.add({ severity: 'success', summary: 'Site added.', life: 5000 });
  } catch {
    toast.add({ severity: 'error', summary: 'Couldn’t add the site.', life: 5000 });
  }
}

async function onEdit(index: number, patch: { key?: string }): Promise<void> {
  const site = sites.value[index];

  if (!site || site.isDefault || !patch.key) {
    return;
  }

  const pattern = normalizeOriginPattern(patch.key);

  if (!pattern) {
    toast.add({ severity: 'error', summary: 'That doesn’t look like a site.', life: 5000 });

    return;
  }

  if (pattern === site.pattern) {
    return;
  }

  if (sites.value.some((other, otherIndex) => otherIndex !== index && other.pattern === pattern)) {
    toast.add({ severity: 'error', summary: 'That site is already in the list.', life: 5000 });

    return;
  }

  const granted = await requestOrigin(pattern);

  if (!granted) {
    toast.add({ severity: 'error', summary: 'Permission denied for that site.', life: 5000 });

    return;
  }

  const allowedOrigins = store.options.allowedOrigins.filter((origin) => origin !== site.pattern);
  const disabledOrigins = store.options.disabledOrigins.filter((origin) => origin !== site.pattern);
  (site.isEnabled ? allowedOrigins : disabledOrigins).push(pattern);

  try {
    await store.update({ allowedOrigins, disabledOrigins });
    await removeOrigin(site.pattern);
    toast.add({ severity: 'success', summary: 'Site updated.', life: 5000 });
  } catch {
    toast.add({ severity: 'error', summary: 'Couldn’t update the site.', life: 5000 });
  }
}

async function confirmRemove(): Promise<void> {
  const pattern = pendingRemoval.value;
  pendingRemoval.value = null;

  if (pattern === null || isDefaultOrigin(pattern)) {
    return;
  }

  try {
    await removeOrigin(pattern);
    await store.update({
      allowedOrigins: store.options.allowedOrigins.filter((origin) => origin !== pattern),
      disabledOrigins: store.options.disabledOrigins.filter((origin) => origin !== pattern),
    });
    toast.add({ severity: 'success', summary: 'Site removed.', life: 5000 });
  } catch {
    toast.add({ severity: 'error', summary: 'Couldn’t remove the site.', life: 5000 });
  }
}
</script>

<template>
  <div class="opt-section" data-testid="section-sites">
    <div class="opt-section-title"><i class="pi pi-globe" /> Sites</div>
    <div class="opt-section-desc">
      Sites the extension may run on. Toggle a site off to pause the picker there without removing
      it. GitHub and GitLab are always listed; add your own, including self-hosted GitHub Enterprise
      and GitLab.
    </div>
    <div class="opt-actions">
      <button class="opt-btn" data-testid="add-site" @click="adding = true">
        <i class="pi pi-plus" /> Add Site
      </button>
    </div>
    <InlineAddForm
      v-if="adding"
      fields="origin"
      :validate="(value) => validateOriginPattern(value)"
      @submit="onAdd"
      @cancel="adding = false"
    />
    <EditableTable
      mode="origins"
      :rows="rows"
      :validate="(value) => validateOriginPattern(value)"
      @toggle="onToggle"
      @edit="onEdit"
      @remove="(index) => (pendingRemoval = patternAt(index))"
    />
    <ConfirmModal
      :open="pendingRemoval !== null"
      title="Remove this site?"
      :message="`The picker will no longer appear on ${pendingRemoval ? displayOrigin(pendingRemoval) : ''}. You can add it again later.`"
      confirm-label="Remove"
      confirm-icon="pi-trash"
      @confirm="confirmRemove"
      @cancel="pendingRemoval = null"
    />
  </div>
</template>
