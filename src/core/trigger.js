(() => {
  const fallbackTrigger = window.GCC_CONSTANTS && window.GCC_CONSTANTS.FALLBACK_TRIGGER
    ? window.GCC_CONSTANTS.FALLBACK_TRIGGER
    : 'cc';

  function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function getSafeTriggerText(triggerText) {
    if (typeof triggerText === 'string') {
      const trimmed = triggerText.trim();
      if (trimmed !== '') {
        return trimmed;
      }
    }

    return fallbackTrigger;
  }

  function getTriggerRegex(triggerText) {
    const escaped = escapeRegex(getSafeTriggerText(triggerText));
    return new RegExp(`(^|\\s)(${escaped})([a-z]*)$`, 'i');
  }

  window.GCC_TRIGGER_UTILS = {
    escapeRegex,
    getSafeTriggerText,
    getTriggerRegex
  };
})();
