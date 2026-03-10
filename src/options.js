const textarea = document.getElementById('allowed-patterns');
const triggerInput = document.getElementById('trigger-text');
const saveButton = document.getElementById('save');
const resetButton = document.getElementById('reset');
const status = document.getElementById('status');
const version = document.getElementById('version');
const triggerError = document.getElementById('trigger-text-error');
const originsError = document.getElementById('allowed-patterns-error');
const debugModeInput = document.getElementById('debug-mode');

let savedSettings = {
  allowedUrlPatterns: DEFAULT_PATTERNS,
  triggerText: DEFAULT_TRIGGER,
  debugMode: DEFAULT_DEBUG_MODE
};

function getNormalizedHttpsOrigin(value) {
  const trimmed = value.trim();
  if (trimmed === '') {
    return { ok: false, error: 'Empty value' };
  }
  if (trimmed.includes('*')) {
    return { ok: false, error: 'Wildcards are not allowed' };
  }

  let url;
  try {
    url = new URL(trimmed);
  } catch (error) {
    return { ok: false, error: 'Must be a valid absolute URL' };
  }

  if (url.protocol !== 'https:') {
    return { ok: false, error: 'Only HTTPS origins are allowed' };
  }
  if (url.username || url.password) {
    return { ok: false, error: 'Username/password are not allowed' };
  }
  if (url.pathname !== '/' || url.search !== '' || url.hash !== '') {
    return { ok: false, error: 'Paths, query strings, and hashes are not allowed' };
  }

  return { ok: true, origin: url.origin };
}

function setStatus(message, type = 'success') {
  status.textContent = message;
  status.classList.remove('status--success', 'status--error');

  if (type === 'error') {
    status.classList.add('status--error');
    status.setAttribute('role', 'alert');
    status.setAttribute('aria-live', 'assertive');
  } else {
    status.classList.add('status--success');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
  }

  if (!message) {
    return;
  }

  const timeoutMs = type === 'error' ? 5000 : 1500;
  window.setTimeout(() => {
    if (status.textContent === message) {
      status.textContent = '';
    }
  }, timeoutMs);
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

function parseAllowedOrigins(value) {
  const lines = value.split('\n');
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
        error: `Line ${index + 1}: ${result.error}`
      };
    }

    normalized.push(result.origin);
  }

  return { ok: true, origins: Array.from(new Set(normalized)) };
}

function getCurrentNormalizedSettings() {
  const triggerText = triggerInput.value.trim();
  const originsResult = parseAllowedOrigins(textarea.value);

  if (triggerText === '') {
    return { ok: false, triggerError: 'Trigger text is required' };
  }

  if (!originsResult.ok) {
    return { ok: false, originsError: originsResult.error };
  }

  return {
    ok: true,
    settings: {
      triggerText,
      allowedUrlPatterns: originsResult.origins,
      debugMode: Boolean(debugModeInput.checked)
    }
  };
}

function areSettingsEqual(left, right) {
  if (left.triggerText !== right.triggerText) {
    return false;
  }
  if (Boolean(left.debugMode) !== Boolean(right.debugMode)) {
    return false;
  }
  if (left.allowedUrlPatterns.length !== right.allowedUrlPatterns.length) {
    return false;
  }

  return left.allowedUrlPatterns.every((value, index) => value === right.allowedUrlPatterns[index]);
}

function updateSaveState() {
  const evaluation = getCurrentNormalizedSettings();

  setFieldError(triggerInput, triggerError, evaluation.triggerError || '');
  setFieldError(textarea, originsError, evaluation.originsError || '');

  if (!evaluation.ok) {
    saveButton.disabled = true;
    return;
  }

  saveButton.disabled = areSettingsEqual(evaluation.settings, savedSettings);
}

async function loadOptions() {
  let result;
  try {
    result = await chrome.storage.sync.get({
      allowedUrlPatterns: DEFAULT_PATTERNS,
      triggerText: DEFAULT_TRIGGER,
      debugMode: DEFAULT_DEBUG_MODE
    });
  } catch (error) {
    result = {
      allowedUrlPatterns: DEFAULT_PATTERNS,
      triggerText: DEFAULT_TRIGGER,
      debugMode: DEFAULT_DEBUG_MODE
    };
  }

  const storedPatterns = Array.isArray(result.allowedUrlPatterns) ? result.allowedUrlPatterns : DEFAULT_PATTERNS;
  const normalizedPatterns = parseAllowedOrigins(storedPatterns.join('\n'));
  const allowedUrlPatterns = normalizedPatterns.ok ? normalizedPatterns.origins : storedPatterns;
  const triggerText = typeof result.triggerText === 'string' && result.triggerText.trim() !== ''
    ? result.triggerText.trim()
    : DEFAULT_TRIGGER;

  textarea.value = allowedUrlPatterns.join('\n');
  triggerInput.value = triggerText;
  debugModeInput.checked = Boolean(result.debugMode);
  savedSettings = {
    triggerText,
    allowedUrlPatterns,
    debugMode: Boolean(result.debugMode)
  };
  updateSaveState();
}

async function saveOptions() {
  const evaluation = getCurrentNormalizedSettings();

  setFieldError(triggerInput, triggerError, evaluation.triggerError || '');
  setFieldError(textarea, originsError, evaluation.originsError || '');

  if (!evaluation.ok) {
    if (evaluation.triggerError) {
      triggerInput.focus();
      setStatus(evaluation.triggerError, 'error');
    } else {
      textarea.focus();
      setStatus(evaluation.originsError, 'error');
    }
    return;
  }

  const { allowedUrlPatterns, triggerText, debugMode } = evaluation.settings;

  try {
    await chrome.storage.sync.set({
      allowedUrlPatterns,
      triggerText,
      debugMode
    });
  } catch (error) {
    setStatus('Save failed', 'error');
    return;
  }

  textarea.value = allowedUrlPatterns.join('\n');
  triggerInput.value = triggerText;
  debugModeInput.checked = Boolean(debugMode);
  savedSettings = { triggerText, allowedUrlPatterns, debugMode: Boolean(debugMode) };
  updateSaveState();
  setStatus('Saved', 'success');
}

async function clearOptions() {
  textarea.value = DEFAULT_PATTERNS.join('\n');
  triggerInput.value = DEFAULT_TRIGGER;
  debugModeInput.checked = DEFAULT_DEBUG_MODE;

  try {
    await chrome.storage.sync.set({
      allowedUrlPatterns: DEFAULT_PATTERNS,
      triggerText: DEFAULT_TRIGGER,
      debugMode: DEFAULT_DEBUG_MODE
    });
  } catch (error) {
    setStatus('Reset failed', 'error');
    return;
  }

  savedSettings = {
    triggerText: DEFAULT_TRIGGER,
    allowedUrlPatterns: DEFAULT_PATTERNS,
    debugMode: DEFAULT_DEBUG_MODE
  };
  setFieldError(triggerInput, triggerError, '');
  setFieldError(textarea, originsError, '');
  updateSaveState();

  setStatus('Reset to defaults', 'success');
}

saveButton.addEventListener('click', () => saveOptions());
resetButton.addEventListener('click', () => clearOptions());
triggerInput.addEventListener('input', () => updateSaveState());
textarea.addEventListener('input', () => updateSaveState());
debugModeInput.addEventListener('change', () => updateSaveState());

loadOptions();

if (version) {
  version.textContent = `Version v${chrome.runtime.getManifest().version}`;
}
