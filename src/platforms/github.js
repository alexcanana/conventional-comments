(function registerGitHubPlatform() {
  window.GCC_PLATFORMS = window.GCC_PLATFORMS || {};
  var routes = window.GCC_ROUTES || {};
  var helpers = window.GCC_PLATFORM_HELPERS || {};

  var isEditableTextarea = helpers.isEditableTextarea || function () { return true; };
  var isVisibleTextarea = helpers.isVisibleTextarea || function () { return true; };
  var isInsideAny = helpers.isInsideAny || function () { return true; };
  var joinSelectorBuckets = helpers.joinSelectorBuckets || function (b) {
    return [].concat(b.stable || [], b.legacy || [], b.fragile || []).join(', ');
  };

  var GITHUB_PULL_REQUEST_PATH_RE = routes.GITHUB_PULL_REQUEST_PATH_RE
    || /^\/[^/]+\/[^/]+\/pull\/\d+(?:\/(?:conversation|files|changes))?\/?$/;

  // ── Textarea selectors ──────────────────────────────────────────────
  // Ordered by reliability: stable attributes first, fragile hashes last.
  var textareaBuckets = {
    stable: [
      'textarea[name="pull_request_review[body]"]',
      'textarea[name="comment[body]"]',
      'textarea[name="pull_request_review_comment[body]"]',
      'textarea[name="pull_request_review_thread[body]"]',
      'textarea[aria-label="Markdown value"]',
      'textarea[data-testid="markdown-editor-input"]'
    ],
    legacy: [
      'textarea.js-comment-field',
      'textarea#new_comment_field'
    ],
    // Hashed classes change across GitHub deploys.
    // Stable selectors above should cover the same elements.
    fragile: [
      'textarea.prc-Textarea-TextArea-snlco'
    ]
  };

  // ── Comment container selectors ─────────────────────────────────────
  // A textarea must be inside at least one of these to qualify.
  var containerBuckets = {
    stable: [
      '[data-testid="markdown-editor-footer"]',
      '[data-testid="markdown-editor"]',
      '[data-inline-markers]',
      '[data-marker-navigation-new-thread]'
    ],
    legacy: [
      '.js-inline-comment-form',
      '.review-comment',
      '.review-thread'
    ],
    // Hashed classes change across GitHub deploys.
    // Stable selectors above should cover the same containers.
    fragile: [
      '.MarkdownEditor-module__container__H4O8J',
      '[class*="MarkdownEditor-module__container"]'
    ]
  };

  var TEXTAREA_SELECTOR = joinSelectorBuckets(textareaBuckets);
  var CONTAINER_SELECTORS = [].concat(
    containerBuckets.stable || [],
    containerBuckets.legacy || [],
    containerBuckets.fragile || []
  );

  function isGitHubCommentEditor(textarea) {
    if (!isEditableTextarea(textarea)) {
      return false;
    }

    if (!isInsideAny(textarea, CONTAINER_SELECTORS)) {
      return false;
    }

    return isVisibleTextarea(textarea);
  }

  window.GCC_PLATFORMS.github = {
    id: 'github',
    textareaSelector: TEXTAREA_SELECTOR,
    isSupportedTextarea: function (textarea) {
      return isGitHubCommentEditor(textarea);
    },
    isSupportedPage: function (urlString) {
      try {
        var url = new URL(urlString);
        return GITHUB_PULL_REQUEST_PATH_RE.test(url.pathname);
      } catch (error) {
        return false;
      }
    }
  };
})();
