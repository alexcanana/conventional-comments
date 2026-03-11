(function registerGitLabPlatform() {
  window.GCC_PLATFORMS = window.GCC_PLATFORMS || {};
  var routes = window.GCC_ROUTES || {};
  var helpers = window.GCC_PLATFORM_HELPERS || {};

  var isEditableTextarea = helpers.isEditableTextarea || function () { return true; };
  var isVisibleTextarea = helpers.isVisibleTextarea || function () { return true; };
  var joinSelectorBuckets = helpers.joinSelectorBuckets || function (b) {
    return [].concat(b.stable || [], b.legacy || [], b.fragile || []).join(', ');
  };

  var gitLabPathRegex = routes.GITLAB_MERGE_REQUEST_PATH_RE
    || /\/-\/merge_requests\/\d+(?:\/diffs)?(?:\/.*)?$/;

  // ── Textarea selectors ──────────────────────────────────────────────
  // Ordered by reliability: stable attributes first, legacy classes last.
  var textareaBuckets = {
    stable: [
      'textarea[data-testid="reply-field"]'
    ],
    legacy: [
      'textarea.note-textarea'
    ],
    fragile: []
  };

  var TEXTAREA_SELECTOR = joinSelectorBuckets(textareaBuckets);

  function isGitLabCommentEditor(textarea) {
    if (!isEditableTextarea(textarea)) {
      return false;
    }

    return isVisibleTextarea(textarea);
  }

  window.GCC_PLATFORMS.gitlab = {
    id: 'gitlab',
    textareaSelector: TEXTAREA_SELECTOR,
    isSupportedTextarea: function (textarea) {
      return isGitLabCommentEditor(textarea);
    },
    isSupportedPage: function (urlString) {
      try {
        var url = new URL(urlString);
        return gitLabPathRegex.test(url.pathname);
      } catch (error) {
        return false;
      }
    }
  };
})();
