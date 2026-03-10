(function registerGitLabPlatform() {
  window.GCC_PLATFORMS = window.GCC_PLATFORMS || {};
  const routes = window.GCC_ROUTES || {};
  const gitLabPathRegex = routes.GITLAB_MERGE_REQUEST_PATH_RE || /\/-\/merge_requests\/\d+(?:\/diffs)?(?:\/.*)?$/;

  window.GCC_PLATFORMS.gitlab = {
    id: 'gitlab',
    textareaSelector: 'textarea.note-textarea, textarea[data-testid="reply-field"]',
    isSupportedPage(urlString) {
      try {
        const url = new URL(urlString);
        return gitLabPathRegex.test(url.pathname);
      } catch (error) {
        return false;
      }
    }
  };
})();
