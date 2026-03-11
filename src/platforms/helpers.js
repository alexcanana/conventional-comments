(function registerPlatformHelpers() {
  window.GCC_PLATFORM_HELPERS = window.GCC_PLATFORM_HELPERS || {};

  /**
   * Returns true when the textarea is not disabled or read-only.
   */
  function isEditableTextarea(textarea) {
    return !textarea.disabled && !textarea.readOnly;
  }

  /**
   * Returns true when the textarea has a layout box (offsetParent !== null)
   * or is the currently focused element.
   */
  function isVisibleTextarea(textarea) {
    if (textarea.offsetParent !== null) {
      return true;
    }
    return document.activeElement === textarea;
  }

  /**
   * Returns true when the textarea is nested inside at least one element
   * matching any of the provided selectors.
   */
  function isInsideAny(textarea, selectors) {
    return selectors.some(function (selector) {
      return textarea.closest(selector);
    });
  }

  /**
   * Joins selector arrays from ordered buckets into a single comma-separated
   * selector string.  Buckets are processed in order so stable selectors
   * appear first in querySelectorAll results.
   *
   * @param {{ stable?: string[], legacy?: string[], fragile?: string[] }} buckets
   * @returns {string}
   */
  function joinSelectorBuckets(buckets) {
    var all = []
      .concat(buckets.stable || [])
      .concat(buckets.legacy || [])
      .concat(buckets.fragile || []);
    return all.join(', ');
  }

  window.GCC_PLATFORM_HELPERS = {
    isEditableTextarea: isEditableTextarea,
    isVisibleTextarea: isVisibleTextarea,
    isInsideAny: isInsideAny,
    joinSelectorBuckets: joinSelectorBuckets
  };
})();
