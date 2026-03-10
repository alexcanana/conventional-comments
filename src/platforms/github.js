(function registerGitHubPlatform() {
  window.GCC_PLATFORMS = window.GCC_PLATFORMS || {};
  const routes = window.GCC_ROUTES || {};

  const GITHUB_PULL_REQUEST_PATH_RE = routes.GITHUB_PULL_REQUEST_PATH_RE
    || /^\/[^/]+\/[^/]+\/pull\/\d+(?:\/(?:conversation|files|changes))?\/?$/;
  const GITHUB_TEXTAREA_SELECTORS = [
    // Legacy PR editors.
    'textarea.js-comment-field',
    'textarea#new_comment_field',
    'textarea[name="pull_request_review[body]"]',
    'textarea[name="comment[body]"]',
    'textarea[name="pull_request_review_comment[body]"]',
    'textarea[name="pull_request_review_thread[body]"]',
    // New PRC markdown editors.
    'textarea.prc-Textarea-TextArea-snlco',
    'textarea[aria-label="Markdown value"]'
  ];
  const GITHUB_COMMENT_CONTAINER_SELECTORS = [
    '[data-inline-markers]',
    '[data-marker-navigation-new-thread]',
    '[data-testid="markdown-editor-footer"]',
    '.MarkdownEditor-module__container__H4O8J',
    '.js-inline-comment-form',
    '.review-comment',
    '.review-thread'
  ];

  function isGitHubCommentEditor(textarea) {
    if (textarea.disabled || textarea.readOnly) {
      return false;
    }

    const insideCommentContainer = GITHUB_COMMENT_CONTAINER_SELECTORS.some((selector) => textarea.closest(selector));
    if (!insideCommentContainer) {
      return false;
    }

    if (textarea.offsetParent !== null) {
      return true;
    }

    return document.activeElement === textarea;
  }

  window.GCC_PLATFORMS.github = {
    id: 'github',
    textareaSelector: GITHUB_TEXTAREA_SELECTORS.join(', '),
    isSupportedTextarea(textarea) {
      return isGitHubCommentEditor(textarea);
    },
    isSupportedPage(urlString) {
      try {
        const url = new URL(urlString);
        return GITHUB_PULL_REQUEST_PATH_RE.test(url.pathname);
      } catch (error) {
        return false;
      }
    }
  };
})();
