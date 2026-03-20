/**
 * Options / settings page: tabs, lists (origins, labels, decorations), drag-reorder,
 * storage sync, and per-section save feedback. Loaded after shared.js (defaults + GCC_CONSTANTS).
 */
const originsList = document.getElementById('origins-list');
const triggerInput = document.getElementById('trigger-text');
const saveButton = document.getElementById('save');
const resetButton = document.getElementById('reset');
const status = document.getElementById('status');
const version = document.getElementById('version');
const triggerError = document.getElementById('trigger-text-error');
const debugModeInput = document.getElementById('debug-mode');
const orderLabelsByUsageInput = document.getElementById('order-labels-by-usage');
const showLabelDescriptionsInput = document.getElementById('show-label-descriptions');
const showDecorationDescriptionsInput = document.getElementById('show-decoration-descriptions');
const resetLabelUsageButton = document.getElementById('reset-label-usage');
const resetLabelUsageStatus = document.getElementById('reset-label-usage-status');
const labelsConfigList = document.getElementById('labels-config-list');
const decorationsConfigList = document.getElementById('decorations-config-list');
const originsListSaveButton = document.getElementById('origins-list-save');
const labelsConfigSaveButton = document.getElementById('labels-config-save');
const decorationsConfigSaveButton = document.getElementById('decorations-config-save');
const originsListSaveStatus = document.getElementById('origins-list-save-status');
const labelsConfigSaveStatus = document.getElementById('labels-config-save-status');
const decorationsConfigSaveStatus = document.getElementById('decorations-config-save-status');

const LIST_TEMPLATE_CLASS = 'config-list__template';
/** BALLOT X (HTML numeric entity &#x2715;) */
const REMOVE_ROW_GLYPH = '\u2715';

function insertAfter(parentEl, newNode, refNode) {
  parentEl.insertBefore(newNode, refNode.nextSibling);
}

async function persistCurrentSettingsQuiet() {
  const evaluation = getCurrentNormalizedSettings();
  if (!evaluation.ok) {
    updateSaveState();
    return;
  }
  const s = evaluation.settings;
  try {
    await chrome.storage.sync.set(syncSettingsWritePayload(s));
  } catch (error) {
    return;
  }
  savedSettings = snapshotSavedSettingsFromEvaluation(s);
  setOriginsError('');
  setLabelsConfigError('');
  setDecorationsConfigError('');
  updateSaveState();
}

function initSettingsTabs() {
  const root = document.querySelector('.settings__tabs-root');
  if (!root) {
    return;
  }
  const tabs = [...root.querySelectorAll('[role="tablist"] [role="tab"]')];
  if (tabs.length === 0) {
    return;
  }
  const panels = tabs.map((tab) => document.getElementById(tab.getAttribute('aria-controls')));

  function selectTab(index) {
    tabs.forEach((tabEl, i) => {
      const on = i === index;
      tabEl.setAttribute('aria-selected', String(on));
      tabEl.tabIndex = on ? 0 : -1;
      const panel = panels[i];
      if (panel) {
        panel.hidden = !on;
      }
    });
  }

  tabs.forEach((tabEl, i) => {
    tabEl.addEventListener('click', () => {
      selectTab(i);
    });
    tabEl.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const delta = e.key === 'ArrowRight' ? 1 : -1;
        const next = (i + delta + tabs.length) % tabs.length;
        selectTab(next);
        tabs[next].focus();
      } else if (e.key === 'Home') {
        e.preventDefault();
        selectTab(0);
        tabs[0].focus();
      } else if (e.key === 'End') {
        e.preventDefault();
        selectTab(tabs.length - 1);
        tabs[tabs.length - 1].focus();
      }
    });
  });
}

const LABEL_KEY_RE = /^[a-z][a-z0-9-]*$/;

const ICON_EYE_ON =
  '<svg class="config-row__icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="20" height="20" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>';

const ICON_EYE_OFF =
  '<svg class="config-row__icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="20" height="20" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>';

function syncVisibilityToggleButton(toggleBtn, enableInput, shownLabel, hiddenLabel) {
  const on = enableInput.checked;
  toggleBtn.setAttribute('aria-pressed', String(on));
  toggleBtn.setAttribute('aria-label', on ? shownLabel : hiddenLabel);
  toggleBtn.innerHTML = on ? ICON_EYE_ON : ICON_EYE_OFF;
}

function getBuiltInDefaultLabelsConfig() {
  const c = typeof window !== 'undefined' ? window.GCC_CONSTANTS : null;
  if (c && Array.isArray(c.LABELS)) {
    return c.LABELS.map((item) => ({
      key: String(item.key),
      description: typeof item.description === 'string' ? item.description : '',
      enabled: true
    }));
  }
  return [];
}

function normalizeStoredLabelsConfig(raw) {
  const fallback = getBuiltInDefaultLabelsConfig();
  if (!Array.isArray(raw) || raw.length === 0) {
    return fallback.slice();
  }
  const out = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const key = typeof item.key === 'string' ? item.key.trim() : '';
    const description = typeof item.description === 'string' ? item.description : '';
    if (!key) {
      continue;
    }
    out.push({
      key,
      description,
      enabled: item.enabled !== false
    });
  }
  return out.length > 0 ? out : fallback.slice();
}

function getBuiltInDefaultDecorationsConfig() {
  const c = typeof window !== 'undefined' ? window.GCC_CONSTANTS : null;
  if (c && Array.isArray(c.DECORATIONS)) {
    return c.DECORATIONS.map((item) => ({
      key: String(item.key),
      description: typeof item.description === 'string' ? item.description : '',
      enabled: true
    }));
  }
  return [];
}

function builtInDescriptionForKey(key, defaultsList) {
  const lower = String(key).toLowerCase();
  const item = defaultsList.find((e) => e.key.toLowerCase() === lower);
  return item && typeof item.description === 'string' ? item.description : '';
}

function descriptionForSavedLabelKey(key) {
  return builtInDescriptionForKey(key, getBuiltInDefaultLabelsConfig());
}

function descriptionForSavedDecorationKey(key) {
  return builtInDescriptionForKey(key, getBuiltInDefaultDecorationsConfig());
}

function normalizeStoredDecorationsConfig(raw) {
  const fallback = getBuiltInDefaultDecorationsConfig();
  if (!Array.isArray(raw) || raw.length === 0) {
    return fallback.slice();
  }
  const out = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const key = typeof item.key === 'string' ? item.key.trim() : '';
    const description = typeof item.description === 'string' ? item.description : '';
    if (!key) {
      continue;
    }
    out.push({
      key,
      description,
      enabled: item.enabled !== false
    });
  }
  return out.length > 0 ? out : fallback.slice();
}

let savedSettings = {
  allowedUrlPatterns: DEFAULT_PATTERNS,
  triggerText: DEFAULT_TRIGGER,
  debugMode: DEFAULT_DEBUG_MODE,
  orderLabelsByUsage: DEFAULT_ORDER_LABELS_BY_USAGE,
  showLabelDescriptions: DEFAULT_SHOW_LABEL_DESCRIPTIONS,
  showDecorationDescriptions: DEFAULT_SHOW_DECORATION_DESCRIPTIONS,
  labelsConfig: getBuiltInDefaultLabelsConfig(),
  decorationsConfig: getBuiltInDefaultDecorationsConfig()
};

function getNormalizedHttpsOrigin(value) {
  const trimmed = value.trim();
  if (trimmed === '') {
    return { ok: false, error: 'Empty' };
  }
  if (trimmed.includes('*')) {
    return { ok: false, error: 'No wildcards' };
  }

  let url;
  try {
    url = new URL(trimmed);
  } catch (error) {
    return { ok: false, error: 'Not a valid URL' };
  }

  if (url.protocol !== 'https:') {
    return { ok: false, error: 'HTTPS only' };
  }
  if (url.username || url.password) {
    return { ok: false, error: 'No user or password in the URL' };
  }
  if (url.pathname !== '/' || url.search !== '' || url.hash !== '') {
    return { ok: false, error: 'No path, query, or hash—origin only' };
  }

  return { ok: true, origin: url.origin };
}

function setSaveFeedback(el, message, type = 'success') {
  if (!el) {
    return;
  }
  el.textContent = message;
  el.classList.remove('status--success', 'status--error');

  if (type === 'error') {
    el.classList.add('status--error');
    el.setAttribute('role', 'alert');
    el.setAttribute('aria-live', 'assertive');
  } else {
    el.classList.add('status--success');
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
  }

  if (!message) {
    return;
  }

  const timeoutMs = type === 'error' ? 5000 : 1500;
  window.setTimeout(() => {
    if (el.textContent === message) {
      el.textContent = '';
    }
  }, timeoutMs);
}

function saveFeedbackElForSourceId(sourceId) {
  switch (sourceId) {
    case 'origins-list-save':
      return originsListSaveStatus;
    case 'labels-config-save':
      return labelsConfigSaveStatus;
    case 'decorations-config-save':
      return decorationsConfigSaveStatus;
    default:
      return status;
  }
}

function setStatus(message, type = 'success') {
  setSaveFeedback(status, message, type);
}

function syncSettingsWritePayload(settings) {
  return {
    allowedUrlPatterns: settings.allowedUrlPatterns,
    triggerText: settings.triggerText,
    debugMode: settings.debugMode,
    orderLabelsByUsage: settings.orderLabelsByUsage,
    showLabelDescriptions: settings.showLabelDescriptions,
    showDecorationDescriptions: settings.showDecorationDescriptions,
    labelsConfig: settings.labelsConfig,
    decorationsConfig: settings.decorationsConfig
  };
}

function snapshotSavedSettingsFromEvaluation(s) {
  return {
    triggerText: s.triggerText,
    allowedUrlPatterns: s.allowedUrlPatterns.slice(),
    debugMode: s.debugMode,
    orderLabelsByUsage: s.orderLabelsByUsage,
    showLabelDescriptions: s.showLabelDescriptions,
    showDecorationDescriptions: s.showDecorationDescriptions,
    labelsConfig: s.labelsConfig.slice(),
    decorationsConfig: s.decorationsConfig.slice()
  };
}

function setFieldError(field, errorElement, message) {
  if (message) {
    field.classList.add('field--error');
    field.setAttribute('aria-invalid', 'true');
    errorElement.textContent = message;
    return;
  }

  field.classList.remove('field--error');
  field.removeAttribute('aria-invalid');
  errorElement.textContent = '';
}

function stripRowPrefixFromErrorMessage(message) {
  return String(message).replace(/^(?:Row|Label row|Decoration row) \d+: /, '');
}

function setOriginsRowError(input, message) {
  if (!input) {
    return;
  }
  const row = input.closest('.origins-list__item');
  const errEl = row?.querySelector('.origins-list__row-error');
  if (message) {
    input.classList.add('field--error');
    input.setAttribute('aria-invalid', 'true');
    if (errEl) {
      errEl.textContent = message;
    }
    return;
  }
  input.classList.remove('field--error');
  input.removeAttribute('aria-invalid');
  if (errEl) {
    errEl.textContent = '';
  }
}

function clearOriginsVisualErrors() {
  originsList.querySelectorAll('.origins-list__row-error').forEach((el) => {
    el.textContent = '';
  });
  originsList.querySelectorAll('.origins-list__input').forEach((input) => {
    input.classList.remove('field--error');
    input.removeAttribute('aria-invalid');
  });
}

function setOriginsError(message, input = null) {
  if (!message) {
    clearOriginsVisualErrors();
    return;
  }
  clearOriginsVisualErrors();
  if (input) {
    setOriginsRowError(input, message);
  }
}

function getOriginLinesFromDom() {
  return Array.from(originsList.querySelectorAll('.origins-list__input')).map((input) => input.value);
}

function parseAllowedOriginLines(lines) {
  const normalized = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim() === '') {
      continue;
    }

    const result = getNormalizedHttpsOrigin(line);
    if (!result.ok) {
      return {
        ok: false,
        error: `Row ${index + 1}: ${result.error}`,
        invalidRowIndex: index
      };
    }

    normalized.push(result.origin);
  }

  return { ok: true, origins: Array.from(new Set(normalized)) };
}

function isTemplateOriginAddEnabled(input) {
  const raw = input.value.trim();
  if (raw === '') {
    return false;
  }
  const result = getNormalizedHttpsOrigin(raw);
  if (!result.ok) {
    return false;
  }
  const dataInputs = [...originsList.querySelectorAll(`.origins-list__item:not(.${LIST_TEMPLATE_CLASS}) .origins-list__input`)];
  return !dataInputs.some((el) => {
    const r = getNormalizedHttpsOrigin(el.value.trim());
    return r.ok && r.origin === result.origin;
  });
}

function refreshOriginsListUi() {
  const items = originsList.querySelectorAll('.origins-list__item');
  items.forEach((row) => {
    const input = row.querySelector('.origins-list__input');
    const removeBtn = row.querySelector('.origins-list__remove');
    const addBtn = row.querySelector('.origins-list__add');
    const isTemplate = row.classList.contains(LIST_TEMPLATE_CLASS);
    if (isTemplate) {
      removeBtn.hidden = true;
      removeBtn.disabled = true;
      addBtn.hidden = false;
      addBtn.disabled = !isTemplateOriginAddEnabled(input);
    } else {
      removeBtn.hidden = false;
      removeBtn.disabled = false;
      addBtn.hidden = true;
      addBtn.disabled = true;
    }
  });
}

function createOriginRow(value = '', { template = false } = {}) {
  const item = document.createElement('li');
  item.className = 'origins-list__item';
  item.setAttribute('role', 'listitem');
  if (template) {
    item.classList.add(LIST_TEMPLATE_CLASS);
  }

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'origins-list__input';
  input.setAttribute('spellcheck', 'false');
  input.setAttribute('placeholder', 'https://example.com');
  input.value = value;
  input.addEventListener('input', () => {
    setOriginsError('');
    refreshOriginsListUi();
    updateSaveState();
  });

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'button button--danger button--small origins-list__remove';
  removeBtn.setAttribute('aria-label', 'Remove origin');
  removeBtn.textContent = REMOVE_ROW_GLYPH;

  removeBtn.addEventListener('click', () => {
    item.remove();
    refreshOriginsListUi();
    updateSaveState();
  });

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'button button--primary origins-list__add';
  addBtn.textContent = 'Add';
  addBtn.setAttribute('aria-label', 'Add origin from this row');
  addBtn.addEventListener('click', () => {
    const raw = input.value.trim();
    if (raw === '') {
      setOriginsError('Enter an HTTPS origin first', input);
      input.focus();
      return;
    }
    const result = getNormalizedHttpsOrigin(raw);
    if (!result.ok) {
      setOriginsError(result.error, input);
      input.focus();
      return;
    }
    setOriginsError('');
    const dataInputs = [...originsList.querySelectorAll(`.origins-list__item:not(.${LIST_TEMPLATE_CLASS}) .origins-list__input`)];
    const already = dataInputs.some((el) => {
      const r = getNormalizedHttpsOrigin(el.value.trim());
      return r.ok && r.origin === result.origin;
    });
    if (already) {
      setOriginsError('That origin is already listed', input);
      input.focus();
      return;
    }
    const templateRow = originsList.querySelector(`.${LIST_TEMPLATE_CLASS}`);
    const newRow = createOriginRow(result.origin);
    if (templateRow) {
      insertAfter(originsList, newRow, templateRow);
    } else {
      originsList.appendChild(newRow);
    }
    input.value = '';
    refreshOriginsListUi();
    updateSaveState();
    input.focus();
  });

  const controls = document.createElement('div');
  controls.className = 'origins-list__controls';
  controls.appendChild(removeBtn);
  controls.appendChild(addBtn);

  const main = document.createElement('div');
  main.className = 'origins-list__main';
  main.appendChild(input);

  const rowLine = document.createElement('div');
  rowLine.className = 'origins-list__row-line';
  rowLine.appendChild(main);
  rowLine.appendChild(controls);

  const rowError = document.createElement('p');
  rowError.className = 'field-error field-error--row origins-list__row-error';
  rowError.setAttribute('aria-live', 'polite');

  item.appendChild(rowLine);
  item.appendChild(rowError);
  return item;
}

function renderOriginsList(patterns) {
  originsList.replaceChildren();
  originsList.appendChild(createOriginRow('', { template: true }));
  const list = Array.isArray(patterns) && patterns.length > 0 ? patterns.slice() : [];
  list.forEach((value) => {
    originsList.appendChild(createOriginRow(value));
  });
  refreshOriginsListUi();
}

function labelsConfigEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function originsPatternsEqual(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
    return false;
  }
  return a.every((value, index) => value === b[index]);
}

function getLabelRowsFromDom() {
  return Array.from(
    labelsConfigList.querySelectorAll(`.labels-config__item:not(.${LIST_TEMPLATE_CLASS})`)
  ).map((row) => ({
    enabled: row.querySelector('.labels-config__enabled').checked,
    key: row.querySelector('.labels-config__key').value.trim()
  }));
}

function parseLabelsConfigFromDom() {
  const rows = getLabelRowsFromDom();
  const normalized = [];
  const seen = new Set();

  for (let i = 0; i < rows.length; i += 1) {
    const { enabled, key } = rows[i];
    if (!key) {
      return {
        ok: false,
        error: `Label row ${i + 1}: key required`,
        rowIndex: i
      };
    }
    if (!LABEL_KEY_RE.test(key)) {
      return {
        ok: false,
        error: `Label row ${i + 1}: invalid key (a–z, 0-9, hyphens)`,
        rowIndex: i
      };
    }
    const lower = key.toLowerCase();
    if (seen.has(lower)) {
      return {
        ok: false,
        error: `Duplicate key: ${key}`,
        rowIndex: i
      };
    }
    seen.add(lower);
    normalized.push({
      key: lower,
      description: descriptionForSavedLabelKey(lower),
      enabled: Boolean(enabled)
    });
  }

  if (normalized.length === 0) {
    return { ok: false, error: 'Need at least one label', rowIndex: null };
  }

  return { ok: true, labelsConfig: normalized };
}

function setKeyedRowFieldError(keyInput, errorRowSelector, message) {
  if (!keyInput) {
    return;
  }
  const errEl = keyInput.closest('.config-field')?.querySelector(errorRowSelector);
  if (message) {
    keyInput.classList.add('field--error');
    keyInput.setAttribute('aria-invalid', 'true');
    if (errEl) {
      errEl.textContent = message;
    }
    return;
  }
  keyInput.classList.remove('field--error');
  keyInput.removeAttribute('aria-invalid');
  if (errEl) {
    errEl.textContent = '';
  }
}

function setLabelsKeyFieldError(keyInput, message) {
  setKeyedRowFieldError(keyInput, '.labels-config__key-error', message);
}

function clearLabelsVisualErrors() {
  labelsConfigList.querySelectorAll('.labels-config__key-error').forEach((el) => {
    el.textContent = '';
  });
  labelsConfigList.querySelectorAll('.labels-config__key').forEach((el) => {
    el.classList.remove('field--error');
    el.removeAttribute('aria-invalid');
  });
}

function setLabelsConfigError(message) {
  clearLabelsVisualErrors();
  if (!message) {
    return;
  }
  const templateRow = labelsConfigList.querySelector(`.${LIST_TEMPLATE_CLASS}`);
  const keyInput = templateRow?.querySelector('.labels-config__key');
  setLabelsKeyFieldError(keyInput, message);
}

function replaceDragGhostTextInputs(ghost) {
  ghost.querySelectorAll('input[type="text"]').forEach((input) => {
    const span = document.createElement('span');
    const keepClasses = input.className
      .split(/\s+/)
      .filter((c) => c && c !== 'field--error');
    span.className = [...keepClasses, 'config-row__ghost-input'].join(' ');
    const value = input.value;
    if (value) {
      span.textContent = value;
    } else {
      span.textContent = input.getAttribute('placeholder') || '';
      span.classList.add('config-row__ghost-input--placeholder');
    }
    input.replaceWith(span);
  });
  ghost.querySelectorAll('.field-error').forEach((el) => el.remove());
}

function createConfigRowLeadCell(template) {
  if (template) {
    return null;
  }
  const dragHandle = document.createElement('span');
  dragHandle.className = 'config-row__drag-handle';
  dragHandle.draggable = true;
  dragHandle.setAttribute('aria-label', 'Reorder');
  dragHandle.setAttribute('title', 'Drag to reorder');
  const grip = document.createElement('span');
  grip.className = 'config-row__drag-grip';
  grip.setAttribute('aria-hidden', 'true');
  dragHandle.appendChild(grip);
  return dragHandle;
}

/**
 * Insert-before if pointer is in the top band of the row, insert-after if in the bottom band.
 * Middle band keeps the previous choice so layout shifts from the gap don’t flip the target.
 */
const CONFIG_REORDER_DROP_EDGE_FRACTION = 0.36;

function computeInsertBeforeWithHysteresis(overRow, clientY, dragState) {
  const rect = overRow.getBoundingClientRect();
  const h = rect.height;
  const mid = rect.top + h / 2;
  const edge = h * CONFIG_REORDER_DROP_EDGE_FRACTION;
  const topBand = rect.top + edge;
  const botBand = rect.bottom - edge;

  if (dragState.dropHystRow !== overRow) {
    dragState.dropHystRow = overRow;
    dragState.dropHystIsBefore = clientY < mid;
    return dragState.dropHystIsBefore;
  }

  if (clientY < topBand) {
    dragState.dropHystIsBefore = true;
    return true;
  }
  if (clientY > botBand) {
    dragState.dropHystIsBefore = false;
    return false;
  }
  return dragState.dropHystIsBefore;
}

function skipReorderPlaceholderSibling(node, placeholder) {
  let n = node;
  while (n === placeholder) {
    n = n.nextSibling;
  }
  return n;
}

const PLACEHOLDER_AT_END = Symbol('placeholderAtEnd');

function moveDropPlaceholder(listRoot, itemClass, dragged, clientX, clientY, dragState) {
  const ph = dragState.placeholderEl;
  const template = listRoot.querySelector(`.${LIST_TEMPLATE_CLASS}`);
  const draggedRect = dragged.getBoundingClientRect();
  if (clientY >= draggedRect.top && clientY <= draggedRect.bottom) {
    return;
  }

  const surface = document.elementFromPoint(clientX, clientY);
  let insertBeforeTarget = null;
  let useAppend = false;

  if (template && surface && (surface === template || template.contains(surface))) {
    dragState.dropHystRow = null;
    insertBeforeTarget = listRoot.querySelector(`.${itemClass}:not(.${LIST_TEMPLATE_CLASS})`);
    if (!insertBeforeTarget) {
      useAppend = true;
    }
  } else {
    const peersNoPh = [...listRoot.querySelectorAll(`.${itemClass}:not(.${LIST_TEMPLATE_CLASS})`)].filter(
      (el) => el !== ph && el !== dragged
    );

    let over = null;
    for (const row of peersNoPh) {
      const r = row.getBoundingClientRect();
      if (clientY >= r.top && clientY <= r.bottom) {
        over = row;
        break;
      }
    }

    if (over) {
      const before = computeInsertBeforeWithHysteresis(over, clientY, dragState);
      const next = skipReorderPlaceholderSibling(over.nextSibling, ph);
      if (before) {
        insertBeforeTarget = over;
      } else if (next) {
        insertBeforeTarget = next;
      } else {
        useAppend = true;
      }
    } else {
      dragState.dropHystRow = null;
      const rowsAll = [...listRoot.querySelectorAll(`.${itemClass}:not(.${LIST_TEMPLATE_CLASS})`)].filter(
        (el) => el !== ph
      );
      let found = false;
      for (const row of rowsAll) {
        const r = row.getBoundingClientRect();
        if (clientY < r.top) {
          insertBeforeTarget = row;
          found = true;
          break;
        }
      }
      if (!found) {
        useAppend = true;
      }
    }
  }

  const moveKey = useAppend ? PLACEHOLDER_AT_END : insertBeforeTarget;
  if (dragState.placeholderMoveKey === moveKey) {
    return;
  }
  dragState.placeholderMoveKey = moveKey;

  if (useAppend) {
    listRoot.appendChild(ph);
    return;
  }
  listRoot.insertBefore(ph, insertBeforeTarget);
}

function initConfigListReorder() {
  function bind(listRoot, itemClass, refreshUi) {
    let dragState = null;

    listRoot.addEventListener('dragstart', (e) => {
      const handle = e.target.closest('.config-row__drag-handle');
      if (!handle || !listRoot.contains(handle)) {
        return;
      }
      const item = handle.closest(`.${itemClass}`);
      if (!item || item.classList.contains(LIST_TEMPLATE_CLASS)) {
        return;
      }
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', 'reorder');

      const rect = item.getBoundingClientRect();
      const ghost = document.createElement('div');
      ghost.className = `${item.className} config-row__drag-ghost`.trim();
      const structureClone = item.cloneNode(true);
      while (structureClone.firstChild) {
        ghost.appendChild(structureClone.firstChild);
      }
      replaceDragGhostTextInputs(ghost);
      ghost.style.width = `${rect.width}px`;
      ghost.setAttribute('aria-hidden', 'true');
      ghost.querySelectorAll('.config-row__drag-handle').forEach((h) => {
        h.removeAttribute('draggable');
      });
      document.body.appendChild(ghost);

      const offsetX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const offsetY = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
      e.dataTransfer.setDragImage(ghost, offsetX, offsetY);

      const placeholderEl = document.createElement('li');
      placeholderEl.className = 'config-row__drop-placeholder';
      placeholderEl.setAttribute('aria-hidden', 'true');
      listRoot.insertBefore(placeholderEl, item.nextSibling);

      dragState = {
        list: listRoot,
        item,
        refreshUi,
        ghost,
        placeholderEl,
        placeholderMoveKey: undefined,
        dropHystRow: null,
        dropHystIsBefore: true,
        dropRaf: null,
        pendingDropClientX: 0,
        pendingDropClientY: 0
      };
      item.classList.add('config-row--dragging');
    });

    listRoot.addEventListener('dragend', () => {
      if (dragState?.dropRaf != null) {
        cancelAnimationFrame(dragState.dropRaf);
      }
      if (dragState?.ghost?.isConnected) {
        dragState.ghost.remove();
      }
      if (dragState?.placeholderEl?.isConnected) {
        dragState.placeholderEl.remove();
      }
      if (dragState?.item) {
        dragState.item.classList.remove('config-row--dragging');
      }
      dragState = null;
    });

    listRoot.addEventListener('dragover', (e) => {
      if (!dragState || dragState.list !== listRoot) {
        return;
      }
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      dragState.pendingDropClientX = e.clientX;
      dragState.pendingDropClientY = e.clientY;
      if (dragState.dropRaf != null) {
        return;
      }
      dragState.dropRaf = requestAnimationFrame(() => {
        dragState.dropRaf = null;
        moveDropPlaceholder(
          listRoot,
          itemClass,
          dragState.item,
          dragState.pendingDropClientX,
          dragState.pendingDropClientY,
          dragState
        );
      });
    });

    listRoot.addEventListener('drop', (e) => {
      e.preventDefault();
      if (!dragState || dragState.list !== listRoot) {
        return;
      }
      const dragged = dragState.item;
      if (!dragged || !listRoot.contains(dragged)) {
        return;
      }

      if (dragState.placeholderEl?.isConnected) {
        listRoot.insertBefore(dragged, dragState.placeholderEl);
        dragState.placeholderEl.remove();
      }

      dragState.refreshUi();
      updateSaveState();
      void persistCurrentSettingsQuiet();
    });
  }

  bind(labelsConfigList, 'labels-config__item', refreshLabelsListUi);
  bind(decorationsConfigList, 'decorations-config__item', refreshDecorationsListUi);
}

function refreshLabelsListUi() {
  refreshKeyedConfigListUi(
    labelsConfigList,
    'labels-config__item',
    {
      keyInput: '.labels-config__key',
      removeBtn: '.labels-config__remove',
      addBtn: '.labels-config__add'
    },
    (keyInput) =>
      isTemplateKeyAddValid(keyInput, () => getLabelRowsFromDom().map((r) => r.key.toLowerCase()))
  );
}

function createLabelConfigRow({ key = '', enabled = true, template = false } = {}) {
  const item = document.createElement('li');
  item.className = 'labels-config__item';
  item.setAttribute('role', 'listitem');
  if (template) {
    item.classList.add(LIST_TEMPLATE_CLASS);
  }

  const keyInput = document.createElement('input');
  keyInput.type = 'text';
  keyInput.className = 'labels-config__key';
  keyInput.setAttribute('spellcheck', 'false');
  keyInput.setAttribute('placeholder', 'praise');
  keyInput.setAttribute('aria-label', 'Label key');
  keyInput.value = key;

  let enableInput = null;
  let toggleBtn = null;
  if (!template) {
    enableInput = document.createElement('input');
    enableInput.type = 'checkbox';
    enableInput.className = 'labels-config__enabled visually-hidden';
    enableInput.checked = Boolean(enabled);
    enableInput.setAttribute('tabindex', '-1');
    enableInput.setAttribute('aria-hidden', 'true');

    toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = 'config-row__toggle';
    syncVisibilityToggleButton(
      toggleBtn,
      enableInput,
      'Shown in menu—click to hide',
      'Hidden—click to show'
    );
    toggleBtn.addEventListener('click', () => {
      enableInput.checked = !enableInput.checked;
      syncVisibilityToggleButton(
        toggleBtn,
        enableInput,
        'Shown in menu—click to hide',
        'Hidden—click to show'
      );
      updateSaveState();
      void persistCurrentSettingsQuiet();
    });
  }

  function onFieldInput() {
    if (template) {
      setLabelsConfigError('');
    }
    refreshLabelsListUi();
    updateSaveState();
  }

  keyInput.addEventListener('input', onFieldInput);

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'button button--danger button--small labels-config__remove';
  removeBtn.setAttribute('aria-label', 'Remove label');
  removeBtn.textContent = REMOVE_ROW_GLYPH;

  removeBtn.addEventListener('click', () => {
    item.remove();
    refreshLabelsListUi();
    updateSaveState();
  });

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'button button--primary origins-list__add labels-config__add';
  addBtn.textContent = 'Add';
  addBtn.setAttribute('aria-label', 'Add label from this row');
  addBtn.addEventListener('click', () => {
    const k = keyInput.value.trim();
    if (!k) {
      setLabelsConfigError('Enter a key first');
      keyInput.focus();
      return;
    }
    if (!LABEL_KEY_RE.test(k)) {
      setLabelsConfigError('Invalid key (a–z, 0-9, hyphens)');
      keyInput.focus();
      return;
    }
    const lower = k.toLowerCase();
    const existingKeys = getLabelRowsFromDom().map((r) => r.key.toLowerCase());
    if (existingKeys.includes(lower)) {
      setLabelsConfigError(`Duplicate key: ${k}`);
      keyInput.focus();
      return;
    }
    setLabelsConfigError('');
    const templateRow = labelsConfigList.querySelector(`.${LIST_TEMPLATE_CLASS}`);
    const newRow = createLabelConfigRow({
      key: lower,
      enabled: true
    });
    if (templateRow) {
      insertAfter(labelsConfigList, newRow, templateRow);
    } else {
      labelsConfigList.appendChild(newRow);
    }
    keyInput.value = '';
    refreshLabelsListUi();
    updateSaveState();
    keyInput.focus();
  });

  const controls = document.createElement('div');
  controls.className = 'config-row__actions labels-config__controls';
  if (!template) {
    controls.appendChild(enableInput);
    controls.appendChild(toggleBtn);
  }
  controls.appendChild(removeBtn);
  controls.appendChild(addBtn);

  const keyField = document.createElement('div');
  keyField.className = 'config-field';
  const keyErr = document.createElement('p');
  keyErr.className = 'field-error field-error--row labels-config__key-error';
  keyErr.setAttribute('aria-live', 'polite');
  keyField.appendChild(keyInput);
  keyField.appendChild(keyErr);

  const lead = createConfigRowLeadCell(template);
  if (lead) {
    item.appendChild(lead);
  }
  item.appendChild(keyField);
  item.appendChild(controls);
  return item;
}

function renderLabelsConfigList(labelsConfig) {
  labelsConfigList.replaceChildren();
  labelsConfigList.appendChild(createLabelConfigRow({ template: true }));
  const list = Array.isArray(labelsConfig) && labelsConfig.length > 0 ? labelsConfig.slice() : getBuiltInDefaultLabelsConfig();
  list.forEach((entry) => {
    labelsConfigList.appendChild(
      createLabelConfigRow({
        key: entry.key,
        enabled: entry.enabled !== false
      })
    );
  });
  refreshLabelsListUi();
}

function getDecorationRowsFromDom() {
  return Array.from(
    decorationsConfigList.querySelectorAll(`.decorations-config__item:not(.${LIST_TEMPLATE_CLASS})`)
  ).map((row) => ({
    enabled: row.querySelector('.decorations-config__enabled').checked,
    key: row.querySelector('.decorations-config__key').value.trim()
  }));
}

function isTemplateKeyAddValid(keyInput, getExistingLowercaseKeys) {
  const k = keyInput.value.trim();
  if (!k || !LABEL_KEY_RE.test(k)) {
    return false;
  }
  return !getExistingLowercaseKeys().includes(k.toLowerCase());
}

function refreshKeyedConfigListUi(listRoot, itemClass, selectors, canAddFromTemplateKey) {
  listRoot.querySelectorAll(`.${itemClass}`).forEach((row) => {
    const keyInput = row.querySelector(selectors.keyInput);
    const removeBtn = row.querySelector(selectors.removeBtn);
    const addBtn = row.querySelector(selectors.addBtn);
    const isTemplate = row.classList.contains(LIST_TEMPLATE_CLASS);
    if (isTemplate) {
      removeBtn.hidden = true;
      removeBtn.disabled = true;
      addBtn.hidden = false;
      addBtn.disabled = !keyInput || !canAddFromTemplateKey(keyInput);
    } else {
      removeBtn.hidden = false;
      removeBtn.disabled = false;
      addBtn.hidden = true;
      addBtn.disabled = true;
    }
  });
}

function parseDecorationsConfigFromDom() {
  const rows = getDecorationRowsFromDom();
  const normalized = [];
  const seen = new Set();

  for (let i = 0; i < rows.length; i += 1) {
    const { enabled, key } = rows[i];
    if (!key) {
      return {
        ok: false,
        error: `Decoration row ${i + 1}: key required`,
        rowIndex: i
      };
    }
    if (!LABEL_KEY_RE.test(key)) {
      return {
        ok: false,
        error: `Decoration row ${i + 1}: invalid key (a–z, 0-9, hyphens)`,
        rowIndex: i
      };
    }
    const lower = key.toLowerCase();
    if (seen.has(lower)) {
      return {
        ok: false,
        error: `Duplicate key: ${key}`,
        rowIndex: i
      };
    }
    seen.add(lower);
    normalized.push({
      key: lower,
      description: descriptionForSavedDecorationKey(lower),
      enabled: Boolean(enabled)
    });
  }

  if (normalized.length === 0) {
    return { ok: false, error: 'Need at least one decoration', rowIndex: null };
  }

  return { ok: true, decorationsConfig: normalized };
}

function setDecorationsKeyFieldError(keyInput, message) {
  setKeyedRowFieldError(keyInput, '.decorations-config__key-error', message);
}

function clearDecorationsVisualErrors() {
  decorationsConfigList.querySelectorAll('.decorations-config__key-error').forEach((el) => {
    el.textContent = '';
  });
  decorationsConfigList.querySelectorAll('.decorations-config__key').forEach((el) => {
    el.classList.remove('field--error');
    el.removeAttribute('aria-invalid');
  });
}

function setDecorationsConfigError(message) {
  clearDecorationsVisualErrors();
  if (!message) {
    return;
  }
  const templateRow = decorationsConfigList.querySelector(`.${LIST_TEMPLATE_CLASS}`);
  const keyInput = templateRow?.querySelector('.decorations-config__key');
  setDecorationsKeyFieldError(keyInput, message);
}

function refreshDecorationsListUi() {
  refreshKeyedConfigListUi(
    decorationsConfigList,
    'decorations-config__item',
    {
      keyInput: '.decorations-config__key',
      removeBtn: '.decorations-config__remove',
      addBtn: '.decorations-config__add'
    },
    (keyInput) =>
      isTemplateKeyAddValid(keyInput, () => getDecorationRowsFromDom().map((r) => r.key.toLowerCase()))
  );
}

function createDecorationConfigRow({ key = '', enabled = true, template = false } = {}) {
  const item = document.createElement('li');
  item.className = 'decorations-config__item';
  item.setAttribute('role', 'listitem');
  if (template) {
    item.classList.add(LIST_TEMPLATE_CLASS);
  }

  const keyInput = document.createElement('input');
  keyInput.type = 'text';
  keyInput.className = 'decorations-config__key';
  keyInput.setAttribute('spellcheck', 'false');
  keyInput.setAttribute('placeholder', 'non-blocking');
  keyInput.setAttribute('aria-label', 'Decoration key');
  keyInput.value = key;

  let enableInput = null;
  let toggleBtn = null;
  if (!template) {
    enableInput = document.createElement('input');
    enableInput.type = 'checkbox';
    enableInput.className = 'decorations-config__enabled visually-hidden';
    enableInput.checked = Boolean(enabled);
    enableInput.setAttribute('tabindex', '-1');
    enableInput.setAttribute('aria-hidden', 'true');

    toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = 'config-row__toggle';
    syncVisibilityToggleButton(
      toggleBtn,
      enableInput,
      'Shown in menu—click to hide',
      'Hidden—click to show'
    );
    toggleBtn.addEventListener('click', () => {
      enableInput.checked = !enableInput.checked;
      syncVisibilityToggleButton(
        toggleBtn,
        enableInput,
        'Shown in menu—click to hide',
        'Hidden—click to show'
      );
      updateSaveState();
      void persistCurrentSettingsQuiet();
    });
  }

  function onFieldInput() {
    if (template) {
      setDecorationsConfigError('');
    }
    refreshDecorationsListUi();
    updateSaveState();
  }

  keyInput.addEventListener('input', onFieldInput);

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'button button--danger button--small decorations-config__remove';
  removeBtn.setAttribute('aria-label', 'Remove decoration');
  removeBtn.textContent = REMOVE_ROW_GLYPH;

  removeBtn.addEventListener('click', () => {
    item.remove();
    refreshDecorationsListUi();
    updateSaveState();
  });

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'button button--primary origins-list__add decorations-config__add';
  addBtn.textContent = 'Add';
  addBtn.setAttribute('aria-label', 'Add decoration from this row');
  addBtn.addEventListener('click', () => {
    const k = keyInput.value.trim();
    if (!k) {
      setDecorationsConfigError('Enter a key first');
      keyInput.focus();
      return;
    }
    if (!LABEL_KEY_RE.test(k)) {
      setDecorationsConfigError('Invalid key (a–z, 0-9, hyphens)');
      keyInput.focus();
      return;
    }
    const lower = k.toLowerCase();
    const existingKeys = getDecorationRowsFromDom().map((r) => r.key.toLowerCase());
    if (existingKeys.includes(lower)) {
      setDecorationsConfigError(`Duplicate key: ${k}`);
      keyInput.focus();
      return;
    }
    setDecorationsConfigError('');
    const templateRow = decorationsConfigList.querySelector(`.${LIST_TEMPLATE_CLASS}`);
    const newRow = createDecorationConfigRow({
      key: lower,
      enabled: true
    });
    if (templateRow) {
      insertAfter(decorationsConfigList, newRow, templateRow);
    } else {
      decorationsConfigList.appendChild(newRow);
    }
    keyInput.value = '';
    refreshDecorationsListUi();
    updateSaveState();
    keyInput.focus();
  });

  const controls = document.createElement('div');
  controls.className = 'config-row__actions decorations-config__controls';
  if (!template) {
    controls.appendChild(enableInput);
    controls.appendChild(toggleBtn);
  }
  controls.appendChild(removeBtn);
  controls.appendChild(addBtn);

  const keyField = document.createElement('div');
  keyField.className = 'config-field';
  const keyErr = document.createElement('p');
  keyErr.className = 'field-error field-error--row decorations-config__key-error';
  keyErr.setAttribute('aria-live', 'polite');
  keyField.appendChild(keyInput);
  keyField.appendChild(keyErr);

  const lead = createConfigRowLeadCell(template);
  if (lead) {
    item.appendChild(lead);
  }
  item.appendChild(keyField);
  item.appendChild(controls);
  return item;
}

function renderDecorationsConfigList(decorationsConfig) {
  decorationsConfigList.replaceChildren();
  decorationsConfigList.appendChild(createDecorationConfigRow({ template: true }));
  const list =
    Array.isArray(decorationsConfig) && decorationsConfig.length > 0
      ? decorationsConfig.slice()
      : getBuiltInDefaultDecorationsConfig();
  list.forEach((entry) => {
    decorationsConfigList.appendChild(
      createDecorationConfigRow({
        key: entry.key,
        enabled: entry.enabled !== false
      })
    );
  });
  refreshDecorationsListUi();
}

function getCurrentNormalizedSettings() {
  const triggerText = triggerInput.value.trim();
  const lines = getOriginLinesFromDom();
  const originsResult = parseAllowedOriginLines(lines);
  const labelsResult = parseLabelsConfigFromDom();
  const decorationsResult = parseDecorationsConfigFromDom();

  if (triggerText === '') {
    return { ok: false, triggerError: 'Enter a trigger keyword' };
  }

  if (!originsResult.ok) {
    return { ok: false, originsError: originsResult.error, invalidRowIndex: originsResult.invalidRowIndex };
  }

  if (!labelsResult.ok) {
    return {
      ok: false,
      labelsError: labelsResult.error,
      labelsErrorRowIndex: labelsResult.rowIndex
    };
  }

  if (!decorationsResult.ok) {
    return {
      ok: false,
      decorationsError: decorationsResult.error,
      decorationsErrorRowIndex: decorationsResult.rowIndex
    };
  }

  return {
    ok: true,
    settings: {
      triggerText,
      allowedUrlPatterns: originsResult.origins,
      debugMode: Boolean(debugModeInput.checked),
      orderLabelsByUsage: Boolean(orderLabelsByUsageInput.checked),
      showLabelDescriptions: Boolean(showLabelDescriptionsInput?.checked ?? DEFAULT_SHOW_LABEL_DESCRIPTIONS),
      showDecorationDescriptions: Boolean(
        showDecorationDescriptionsInput?.checked ?? DEFAULT_SHOW_DECORATION_DESCRIPTIONS
      ),
      labelsConfig: labelsResult.labelsConfig,
      decorationsConfig: decorationsResult.decorationsConfig
    }
  };
}

function abortSaveIfInvalidEvaluation(evaluation) {
  if (evaluation.originsError) {
    const inputs = originsList.querySelectorAll('.origins-list__input');
    const bad =
      typeof evaluation.invalidRowIndex === 'number' ? inputs[evaluation.invalidRowIndex] : null;
    bad?.focus();
    return true;
  }
  if (evaluation.labelsError) {
    const rows = labelsConfigList.querySelectorAll(`.labels-config__item:not(.${LIST_TEMPLATE_CLASS})`);
    const badKey =
      typeof evaluation.labelsErrorRowIndex === 'number'
        ? rows[evaluation.labelsErrorRowIndex]?.querySelector('.labels-config__key')
        : labelsConfigList.querySelector(`.${LIST_TEMPLATE_CLASS} .labels-config__key`);
    badKey?.focus();
    return true;
  }
  if (evaluation.decorationsError) {
    const rows = decorationsConfigList.querySelectorAll(
      `.decorations-config__item:not(.${LIST_TEMPLATE_CLASS})`
    );
    const badKey =
      typeof evaluation.decorationsErrorRowIndex === 'number'
        ? rows[evaluation.decorationsErrorRowIndex]?.querySelector('.decorations-config__key')
        : decorationsConfigList.querySelector(`.${LIST_TEMPLATE_CLASS} .decorations-config__key`);
    badKey?.focus();
    return true;
  }
  if (!evaluation.ok) {
    if (evaluation.triggerError) {
      triggerInput.focus();
    }
    return true;
  }
  return false;
}

function applyInlineValidationErrors(evaluation) {
  setFieldError(triggerInput, triggerError, evaluation.triggerError || '');

  clearOriginsVisualErrors();
  if (evaluation.originsError) {
    const inputs = originsList.querySelectorAll('.origins-list__input');
    const bad =
      typeof evaluation.invalidRowIndex === 'number' ? inputs[evaluation.invalidRowIndex] : null;
    if (bad) {
      setOriginsRowError(bad, stripRowPrefixFromErrorMessage(evaluation.originsError));
    }
  }

  clearLabelsVisualErrors();
  if (evaluation.labelsError) {
    const rows = labelsConfigList.querySelectorAll(`.labels-config__item:not(.${LIST_TEMPLATE_CLASS})`);
    if (typeof evaluation.labelsErrorRowIndex === 'number') {
      const badRow = rows[evaluation.labelsErrorRowIndex];
      const keyInput = badRow?.querySelector('.labels-config__key');
      setLabelsKeyFieldError(keyInput, stripRowPrefixFromErrorMessage(evaluation.labelsError));
    } else {
      const templateRow = labelsConfigList.querySelector(`.${LIST_TEMPLATE_CLASS}`);
      const keyInput = templateRow?.querySelector('.labels-config__key');
      setLabelsKeyFieldError(keyInput, evaluation.labelsError);
    }
  }

  clearDecorationsVisualErrors();
  if (evaluation.decorationsError) {
    const rows = decorationsConfigList.querySelectorAll(
      `.decorations-config__item:not(.${LIST_TEMPLATE_CLASS})`
    );
    if (typeof evaluation.decorationsErrorRowIndex === 'number') {
      const badRow = rows[evaluation.decorationsErrorRowIndex];
      const keyInput = badRow?.querySelector('.decorations-config__key');
      setDecorationsKeyFieldError(keyInput, stripRowPrefixFromErrorMessage(evaluation.decorationsError));
    } else {
      const templateRow = decorationsConfigList.querySelector(`.${LIST_TEMPLATE_CLASS}`);
      const keyInput = templateRow?.querySelector('.decorations-config__key');
      setDecorationsKeyFieldError(keyInput, evaluation.decorationsError);
    }
  }
}

function updateSaveState() {
  const evaluation = getCurrentNormalizedSettings();
  applyInlineValidationErrors(evaluation);

  if (!evaluation.ok) {
    saveButton.disabled = true;
    if (originsListSaveButton) {
      originsListSaveButton.disabled = true;
    }
    if (labelsConfigSaveButton) {
      labelsConfigSaveButton.disabled = true;
    }
    if (decorationsConfigSaveButton) {
      decorationsConfigSaveButton.disabled = true;
    }
    return;
  }

  const s = evaluation.settings;
  /* Trigger card Save only tracks trigger text; origins/labels/decorations use their own Save buttons. */
  saveButton.disabled = s.triggerText === savedSettings.triggerText;

  if (originsListSaveButton) {
    originsListSaveButton.disabled = originsPatternsEqual(s.allowedUrlPatterns, savedSettings.allowedUrlPatterns);
  }
  if (labelsConfigSaveButton) {
    labelsConfigSaveButton.disabled = labelsConfigEqual(s.labelsConfig, savedSettings.labelsConfig);
  }
  if (decorationsConfigSaveButton) {
    decorationsConfigSaveButton.disabled = labelsConfigEqual(s.decorationsConfig, savedSettings.decorationsConfig);
  }
}

async function loadOptions() {
  let result;
  try {
    result = await chrome.storage.sync.get({
      allowedUrlPatterns: DEFAULT_PATTERNS,
      triggerText: DEFAULT_TRIGGER,
      debugMode: DEFAULT_DEBUG_MODE,
      orderLabelsByUsage: DEFAULT_ORDER_LABELS_BY_USAGE,
      showLabelDescriptions: DEFAULT_SHOW_LABEL_DESCRIPTIONS,
      showDecorationDescriptions: DEFAULT_SHOW_DECORATION_DESCRIPTIONS,
      labelsConfig: null,
      decorationsConfig: null
    });
  } catch (error) {
    result = {
      allowedUrlPatterns: DEFAULT_PATTERNS,
      triggerText: DEFAULT_TRIGGER,
      debugMode: DEFAULT_DEBUG_MODE,
      orderLabelsByUsage: DEFAULT_ORDER_LABELS_BY_USAGE,
      showLabelDescriptions: DEFAULT_SHOW_LABEL_DESCRIPTIONS,
      showDecorationDescriptions: DEFAULT_SHOW_DECORATION_DESCRIPTIONS,
      labelsConfig: null,
      decorationsConfig: null
    };
  }

  const storedPatterns = Array.isArray(result.allowedUrlPatterns) ? result.allowedUrlPatterns : DEFAULT_PATTERNS;
  const normalizedPatterns = parseAllowedOriginLines(storedPatterns.map(String));
  const allowedUrlPatterns = normalizedPatterns.ok ? normalizedPatterns.origins : storedPatterns;
  const triggerText = typeof result.triggerText === 'string' && result.triggerText.trim() !== ''
    ? result.triggerText.trim()
    : DEFAULT_TRIGGER;

  const labelsConfig = normalizeStoredLabelsConfig(result.labelsConfig);
  const decorationsConfig = normalizeStoredDecorationsConfig(result.decorationsConfig);

  renderOriginsList(allowedUrlPatterns);
  renderLabelsConfigList(labelsConfig);
  renderDecorationsConfigList(decorationsConfig);
  triggerInput.value = triggerText;
  debugModeInput.checked = Boolean(result.debugMode);
  orderLabelsByUsageInput.checked = Boolean(result.orderLabelsByUsage);
  if (showLabelDescriptionsInput) {
    showLabelDescriptionsInput.checked = result.showLabelDescriptions !== false;
  }
  if (showDecorationDescriptionsInput) {
    showDecorationDescriptionsInput.checked = result.showDecorationDescriptions !== false;
  }
  savedSettings = {
    triggerText,
    allowedUrlPatterns,
    debugMode: Boolean(result.debugMode),
    orderLabelsByUsage: Boolean(result.orderLabelsByUsage),
    showLabelDescriptions: result.showLabelDescriptions !== false,
    showDecorationDescriptions: result.showDecorationDescriptions !== false,
    labelsConfig: labelsConfig.slice(),
    decorationsConfig: decorationsConfig.slice()
  };
  updateSaveState();
}

async function saveOptions(event) {
  const feedbackEl = saveFeedbackElForSourceId(event?.currentTarget?.id);
  const evaluation = getCurrentNormalizedSettings();
  applyInlineValidationErrors(evaluation);

  if (abortSaveIfInvalidEvaluation(evaluation)) {
    return;
  }

  const {
    allowedUrlPatterns,
    triggerText,
    debugMode,
    orderLabelsByUsage,
    showLabelDescriptions,
    showDecorationDescriptions,
    labelsConfig,
    decorationsConfig
  } = evaluation.settings;

  try {
    await chrome.storage.sync.set(
      syncSettingsWritePayload({
        allowedUrlPatterns,
        triggerText,
        debugMode,
        orderLabelsByUsage,
        showLabelDescriptions,
        showDecorationDescriptions,
        labelsConfig,
        decorationsConfig
      })
    );
  } catch (error) {
    setSaveFeedback(feedbackEl, "Couldn't save", 'error');
    return;
  }

  renderOriginsList(allowedUrlPatterns);
  renderLabelsConfigList(labelsConfig);
  renderDecorationsConfigList(decorationsConfig);
  triggerInput.value = triggerText;
  debugModeInput.checked = Boolean(debugMode);
  orderLabelsByUsageInput.checked = Boolean(orderLabelsByUsage);
  if (showLabelDescriptionsInput) {
    showLabelDescriptionsInput.checked = Boolean(showLabelDescriptions);
  }
  if (showDecorationDescriptionsInput) {
    showDecorationDescriptionsInput.checked = Boolean(showDecorationDescriptions);
  }
  savedSettings = snapshotSavedSettingsFromEvaluation({
    triggerText,
    allowedUrlPatterns,
    debugMode: Boolean(debugMode),
    orderLabelsByUsage: Boolean(orderLabelsByUsage),
    showLabelDescriptions: Boolean(showLabelDescriptions),
    showDecorationDescriptions: Boolean(showDecorationDescriptions),
    labelsConfig,
    decorationsConfig
  });
  setOriginsError('');
  setLabelsConfigError('');
  setDecorationsConfigError('');
  updateSaveState();
  setSaveFeedback(feedbackEl, 'Saved', 'success');
}

async function clearOptions() {
  try {
    await chrome.storage.sync.set(
      syncSettingsWritePayload({
        allowedUrlPatterns: DEFAULT_PATTERNS,
        triggerText: DEFAULT_TRIGGER,
        debugMode: DEFAULT_DEBUG_MODE,
        orderLabelsByUsage: DEFAULT_ORDER_LABELS_BY_USAGE,
        showLabelDescriptions: DEFAULT_SHOW_LABEL_DESCRIPTIONS,
        showDecorationDescriptions: DEFAULT_SHOW_DECORATION_DESCRIPTIONS,
        labelsConfig: getBuiltInDefaultLabelsConfig(),
        decorationsConfig: getBuiltInDefaultDecorationsConfig()
      })
    );
  } catch (error) {
    setStatus("Couldn't reset", 'error');
    return;
  }

  const defaultLabels = getBuiltInDefaultLabelsConfig();
  const defaultDecorations = getBuiltInDefaultDecorationsConfig();
  renderOriginsList(DEFAULT_PATTERNS);
  renderLabelsConfigList(defaultLabels);
  renderDecorationsConfigList(defaultDecorations);
  triggerInput.value = DEFAULT_TRIGGER;
  debugModeInput.checked = DEFAULT_DEBUG_MODE;
  orderLabelsByUsageInput.checked = DEFAULT_ORDER_LABELS_BY_USAGE;
  if (showLabelDescriptionsInput) {
    showLabelDescriptionsInput.checked = DEFAULT_SHOW_LABEL_DESCRIPTIONS;
  }
  if (showDecorationDescriptionsInput) {
    showDecorationDescriptionsInput.checked = DEFAULT_SHOW_DECORATION_DESCRIPTIONS;
  }
  savedSettings = {
    triggerText: DEFAULT_TRIGGER,
    allowedUrlPatterns: DEFAULT_PATTERNS,
    debugMode: DEFAULT_DEBUG_MODE,
    orderLabelsByUsage: DEFAULT_ORDER_LABELS_BY_USAGE,
    showLabelDescriptions: DEFAULT_SHOW_LABEL_DESCRIPTIONS,
    showDecorationDescriptions: DEFAULT_SHOW_DECORATION_DESCRIPTIONS,
    labelsConfig: defaultLabels.slice(),
    decorationsConfig: defaultDecorations.slice()
  };
  setFieldError(triggerInput, triggerError, '');
  setOriginsError('');
  setLabelsConfigError('');
  setDecorationsConfigError('');
  updateSaveState();

  setStatus('Defaults restored', 'success');
}

async function resetLabelUsage() {
  try {
    await chrome.storage.local.set({ labelUsageCounts: {} });
  } catch (error) {
    setSaveFeedback(resetLabelUsageStatus, 'Couldn’t clear counts', 'error');
    return;
  }

  setSaveFeedback(resetLabelUsageStatus, 'Usage counts cleared', 'success');
}

saveButton.addEventListener('click', (e) => saveOptions(e));
for (const btn of [originsListSaveButton, labelsConfigSaveButton, decorationsConfigSaveButton]) {
  btn?.addEventListener('click', (e) => saveOptions(e));
}
resetButton.addEventListener('click', async () => {
  if (
    !window.confirm(
      "Restore all settings to their defaults? This can't be undone."
    )
  ) {
    return;
  }
  await clearOptions();
});
resetLabelUsageButton.addEventListener('click', () => resetLabelUsage());
triggerInput.addEventListener('input', () => updateSaveState());
debugModeInput.addEventListener('change', () => {
  updateSaveState();
  void persistCurrentSettingsQuiet();
});
orderLabelsByUsageInput.addEventListener('change', () => {
  updateSaveState();
  void persistCurrentSettingsQuiet();
});
showLabelDescriptionsInput?.addEventListener('change', () => {
  updateSaveState();
  void persistCurrentSettingsQuiet();
});
showDecorationDescriptionsInput?.addEventListener('change', () => {
  updateSaveState();
  void persistCurrentSettingsQuiet();
});

initSettingsTabs();
initConfigListReorder();
loadOptions();

if (version) {
  version.textContent = `Version v${chrome.runtime.getManifest().version}`;
}
