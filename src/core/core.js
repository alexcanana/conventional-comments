(() => {
  const constants = window.GCC_CONSTANTS || {};
  const triggerUtils = window.GCC_TRIGGER_UTILS || {};
  const positionUtils = window.GCC_POSITION_UTILS || {};
  const stateUtils = window.GCC_STATE_UTILS || {};
  const renderUtils = window.GCC_RENDER_UTILS || {};
  const bindingUtils = window.GCC_BINDING_UTILS || {};

  const FALLBACK_TRIGGER = constants.FALLBACK_TRIGGER || 'cc';
  const INSTANCE_KEY = constants.INSTANCE_KEY || '__gccInstance';
  const BOUND_ATTRIBUTE = constants.BOUND_ATTRIBUTE || 'data-cc-bound';
  const DROPDOWN_ID = constants.DROPDOWN_ID || 'gl-cc-dropdown';
  const LABELS = constants.LABELS || [];
  const DECORATIONS = constants.DECORATIONS || [];

  function fallbackEscapeRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  const getSafeTriggerText = typeof triggerUtils.getSafeTriggerText === 'function'
    ? triggerUtils.getSafeTriggerText
    : (triggerText) => triggerText || FALLBACK_TRIGGER;
  const getTriggerRegex = typeof triggerUtils.getTriggerRegex === 'function'
    ? triggerUtils.getTriggerRegex
    : (triggerText) => new RegExp(`(^|\\s)(${fallbackEscapeRegex(getSafeTriggerText(triggerText))})([a-z]*)$`, 'i');
  const positionDropdown = typeof positionUtils.positionDropdown === 'function'
    ? positionUtils.positionDropdown
    : () => {};

  const createRuntimeState = typeof stateUtils.createRuntimeState === 'function'
    ? stateUtils.createRuntimeState
    : () => ({
      currentTextarea: null,
      currentRange: null,
      currentFilter: '',
      activeIndex: 0,
      anchorPosition: null,
      mode: 'labels',
      selectedLabel: null,
      selectedDecorations: new Set(),
      triggerText: FALLBACK_TRIGGER
    });
  const hideDropdownState = typeof stateUtils.hideDropdown === 'function'
    ? stateUtils.hideDropdown
    : (dropdown, state) => {
      dropdown.hidden = true;
      dropdown.innerHTML = '';
      state.currentRange = null;
      state.currentFilter = '';
      state.activeIndex = 0;
      state.anchorPosition = null;
      state.mode = 'labels';
      state.selectedLabel = null;
      state.selectedDecorations = new Set();
    };

  const renderLabelsList = typeof renderUtils.renderLabels === 'function'
    ? renderUtils.renderLabels
    : () => 0;
  const renderDecorationsList = typeof renderUtils.renderDecorations === 'function'
    ? renderUtils.renderDecorations
    : () => 0;

  const bindTextareaUtil = typeof bindingUtils.bindTextarea === 'function'
    ? bindingUtils.bindTextarea
    : () => {};
  const bindExistingTextareasUtil = typeof bindingUtils.bindExistingTextareas === 'function'
    ? bindingUtils.bindExistingTextareas
    : () => {};
  const installObserverUtil = typeof bindingUtils.installObserver === 'function'
    ? bindingUtils.installObserver
    : () => null;
  const installRepositionHandlersUtil = typeof bindingUtils.installRepositionHandlers === 'function'
    ? bindingUtils.installRepositionHandlers
    : () => {};

  let debugModeEnabled = DEFAULT_DEBUG_MODE;

  function logDebug(message, metadata) {
    if (!debugModeEnabled) {
      return;
    }

    if (typeof metadata === 'undefined') {
      console.debug(`[gcc] ${message}`);
      return;
    }

    console.debug(`[gcc] ${message}`, metadata);
  }

  function createDropdown() {
    const existing = document.getElementById(DROPDOWN_ID);
    if (existing) {
      return existing;
    }

    const dropdown = document.createElement('div');
    dropdown.id = DROPDOWN_ID;
    dropdown.className = 'gl-cc-dropdown';
    dropdown.hidden = true;
    document.body.appendChild(dropdown);
    return dropdown;
  }

  function getPlatformTextareaSelector(platform) {
    if (!platform || typeof platform.textareaSelector !== 'string') {
      return '';
    }

    return platform.textareaSelector.trim();
  }

  function isSupportedTextarea(platform, textarea) {
    if (!(textarea instanceof HTMLTextAreaElement)) {
      return false;
    }

    if (typeof platform.isSupportedTextarea === 'function') {
      return platform.isSupportedTextarea(textarea);
    }

    return true;
  }

  function initConventionalComments(platform) {
    const textareaSelector = getPlatformTextareaSelector(platform);
    if (!platform || textareaSelector === '') {
      return;
    }

    const platformId = typeof platform.id === 'string' ? platform.id : 'unknown';
    const existing = window[INSTANCE_KEY];
    if (existing && existing.platformId === platformId) {
      return;
    }

    if (existing) {
      if (existing.observer) {
        existing.observer.disconnect();
      }
      if (typeof existing.removeStorageListener === 'function') {
        existing.removeStorageListener();
      }
      if (typeof existing.removeRepositionHandlers === 'function') {
        existing.removeRepositionHandlers();
      }
      delete window[INSTANCE_KEY];
    }

    const dropdown = createDropdown();
    const state = createRuntimeState(FALLBACK_TRIGGER);

    chrome.storage.sync.get({
      triggerText: FALLBACK_TRIGGER,
      debugMode: DEFAULT_DEBUG_MODE
    }).then((result) => {
      if (typeof result.triggerText === 'string' && result.triggerText.trim() !== '') {
        state.triggerText = result.triggerText.trim();
      } else {
        state.triggerText = FALLBACK_TRIGGER;
      }
      debugModeEnabled = Boolean(result.debugMode);
    }).catch((error) => {
      state.triggerText = FALLBACK_TRIGGER;
      debugModeEnabled = DEFAULT_DEBUG_MODE;
      logDebug('failed to load trigger/debug settings', error);
    });

    function onStorageChanged(changes, areaName) {
      if (areaName !== 'sync') {
        return;
      }

      if (changes.debugMode) {
        debugModeEnabled = Boolean(changes.debugMode.newValue);
        logDebug('debug mode toggled', { debugModeEnabled });
      }

      if (changes.triggerText) {
        const next = changes.triggerText.newValue;
        if (typeof next === 'string' && next.trim() !== '') {
          state.triggerText = next.trim();
        } else {
          state.triggerText = FALLBACK_TRIGGER;
        }
        logDebug('trigger text updated', { triggerText: state.triggerText });
      }
    }

    chrome.storage.onChanged.addListener(onStorageChanged);

    function getFilteredLabels() {
      const filter = state.currentFilter.toLowerCase();
      if (!filter) {
        return LABELS;
      }

      return LABELS.filter((item) => item.key.startsWith(filter));
    }

    function getDecorationOptions() {
      return DECORATIONS;
    }

    function getSelectedDecorationsText() {
      const ordered = DECORATIONS
        .map((item) => item.key)
        .filter((key) => state.selectedDecorations.has(key));

      return ordered.join(', ');
    }

    function hideDropdown() {
      hideDropdownState(dropdown, state);
    }

    function chooseLabel(nextActiveIndex) {
      const labels = getFilteredLabels();
      const label = labels[nextActiveIndex];
      if (!label) {
        return;
      }

      state.activeIndex = nextActiveIndex;
      state.selectedLabel = label.key;
      state.mode = 'decorations';
      state.activeIndex = 0;
      state.selectedDecorations = new Set();
      renderDecorations();
    }

    function toggleDecoration(nextActiveIndex) {
      const items = getDecorationOptions();
      const item = items[nextActiveIndex];
      if (!item) {
        return;
      }

      state.activeIndex = nextActiveIndex;

      if (state.selectedDecorations.has(item.key)) {
        state.selectedDecorations.delete(item.key);
      } else {
        state.selectedDecorations.add(item.key);
      }

      renderDecorations();
    }

    function renderLabels() {
      state.activeIndex = renderLabelsList({
        dropdown,
        items: getFilteredLabels(),
        activeIndex: state.activeIndex,
        onChooseLabel: chooseLabel,
        visibleRows: 5.4
      });
    }

    function renderDecorations() {
      state.activeIndex = renderDecorationsList({
        dropdown,
        items: getDecorationOptions(),
        activeIndex: state.activeIndex,
        selectedDecorations: state.selectedDecorations,
        onToggleDecoration: toggleDecoration,
        visibleRows: 5.4
      });
    }

    function applySelection() {
      if (!state.currentTextarea || !state.currentRange || !state.selectedLabel) {
        hideDropdown();
        return;
      }

      const value = state.currentTextarea.value;
      const prefix = value.slice(0, state.currentRange.start);
      const suffix = value.slice(state.currentRange.end);
      const decorationsText = getSelectedDecorationsText();
      const insertion = decorationsText
        ? `${state.selectedLabel} (${decorationsText}): `
        : `${state.selectedLabel}: `;
      const nextValue = `${prefix}${insertion}${suffix}`;

      state.currentTextarea.value = nextValue;
      const caretPosition = prefix.length + insertion.length;
      state.currentTextarea.focus();
      state.currentTextarea.setSelectionRange(caretPosition, caretPosition);
      state.currentTextarea.dispatchEvent(new Event('input', { bubbles: true }));

      hideDropdown();
    }

    function getTokenBeforeCaret(textarea) {
      const caret = textarea.selectionStart || 0;
      const before = textarea.value.slice(0, caret);
      const match = before.match(getTriggerRegex(state.triggerText));

      if (!match) {
        return null;
      }

      const token = match[2] + match[3];
      const start = caret - token.length;
      return {
        token,
        start,
        end: caret
      };
    }

    function updateDropdown(textarea) {
      const tokenData = getTokenBeforeCaret(textarea);
      if (!tokenData) {
        hideDropdown();
        return;
      }

      state.currentTextarea = textarea;
      state.currentRange = { start: tokenData.start, end: tokenData.end };
      state.anchorPosition = tokenData.start;
      state.currentFilter = tokenData.token.slice(getSafeTriggerText(state.triggerText).length);
      state.activeIndex = 0;
      state.mode = 'labels';
      state.selectedLabel = null;
      state.selectedDecorations = new Set();
      renderLabels();

      if (state.currentTextarea) {
        positionDropdown(dropdown, state.currentTextarea, state.anchorPosition);
      }
    }

    function handleKeyDown(event) {
      if (dropdown.hidden) {
        return;
      }

      if (state.mode === 'labels') {
        const labels = getFilteredLabels();
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          state.activeIndex = (state.activeIndex + 1) % labels.length;
          renderLabels();
        } else if (event.key === 'ArrowUp') {
          event.preventDefault();
          state.activeIndex = (state.activeIndex - 1 + labels.length) % labels.length;
          renderLabels();
        } else if (event.key === 'Enter') {
          event.preventDefault();
          chooseLabel(state.activeIndex);
        } else if (event.key === 'Escape' || event.key === 'Esc') {
          event.preventDefault();
          event.stopPropagation();
          if (typeof event.stopImmediatePropagation === 'function') {
            event.stopImmediatePropagation();
          }
          hideDropdown();
        }
        return;
      }

      const items = getDecorationOptions();
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        state.activeIndex = (state.activeIndex + 1) % items.length;
        renderDecorations();
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        state.activeIndex = (state.activeIndex - 1 + items.length) % items.length;
        renderDecorations();
      } else if (event.key === ' ') {
        event.preventDefault();
        toggleDecoration(state.activeIndex);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        applySelection();
      } else if (event.key === 'Escape' || event.key === 'Esc') {
        event.preventDefault();
        event.stopPropagation();
        if (typeof event.stopImmediatePropagation === 'function') {
          event.stopImmediatePropagation();
        }
        state.mode = 'labels';
        state.activeIndex = 0;
        renderLabels();
      }
    }

    const bindTextareaForPlatform = (textarea) => {
      bindTextareaUtil(textarea, {
        boundAttribute: BOUND_ATTRIBUTE,
        isSupportedTextarea: (target) => isSupportedTextarea(platform, target),
        onUpdateDropdown: updateDropdown,
        onKeyDown: handleKeyDown,
        onHideDropdown: hideDropdown,
        shouldSkipKeyup: () => !dropdown.hidden && state.mode === 'decorations'
      });
    };

    bindExistingTextareasUtil(textareaSelector, bindTextareaForPlatform);

    const observer = installObserverUtil(textareaSelector, bindTextareaForPlatform);

    const removeRepositionHandlers = installRepositionHandlersUtil(() => {
      if (state.currentTextarea && !dropdown.hidden) {
        positionDropdown(dropdown, state.currentTextarea, state.anchorPosition);
      }
    });

    window[INSTANCE_KEY] = {
      platformId,
      observer,
      removeStorageListener: () => chrome.storage.onChanged.removeListener(onStorageChanged),
      removeRepositionHandlers: typeof removeRepositionHandlers === 'function' ? removeRepositionHandlers : undefined
    };
  }

  window.initConventionalComments = initConventionalComments;
})();
