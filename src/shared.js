(function registerSharedDefaults() {
  var shared = globalThis.GCC_SHARED || {
    DEFAULT_PATTERNS: ['https://github.com', 'https://gitlab.com'],
    DEFAULT_TRIGGER: 'cc',
    DEFAULT_DEBUG_MODE: false,
    DEFAULT_ORDER_LABELS_BY_USAGE: false
  };

  globalThis.GCC_SHARED = shared;
  globalThis.DEFAULT_PATTERNS = shared.DEFAULT_PATTERNS;
  globalThis.DEFAULT_TRIGGER = shared.DEFAULT_TRIGGER;
  globalThis.DEFAULT_DEBUG_MODE = shared.DEFAULT_DEBUG_MODE;
  globalThis.DEFAULT_ORDER_LABELS_BY_USAGE = shared.DEFAULT_ORDER_LABELS_BY_USAGE;
})();
