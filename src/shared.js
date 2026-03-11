(function registerSharedDefaults() {
  var shared = globalThis.GCC_SHARED || {
    DEFAULT_PATTERNS: ['https://gitlab.com', 'https://github.com'],
    DEFAULT_TRIGGER: 'cc',
    DEFAULT_DEBUG_MODE: false
  };

  globalThis.GCC_SHARED = shared;
  globalThis.DEFAULT_PATTERNS = shared.DEFAULT_PATTERNS;
  globalThis.DEFAULT_TRIGGER = shared.DEFAULT_TRIGGER;
  globalThis.DEFAULT_DEBUG_MODE = shared.DEFAULT_DEBUG_MODE;
})();
