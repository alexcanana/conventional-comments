(() => {
  const GITLAB_MERGE_REQUEST_PATH_RE = /\/-\/merge_requests\/\d+(?:\/diffs)?(?:\/.*)?$/;
  const GITHUB_PULL_REQUEST_PATH_RE = /^\/[^/]+\/[^/]+\/pull\/\d+(?:\/(?:conversation|files|changes))?\/?$/;

  globalThis.GCC_ROUTES = {
    GITLAB_MERGE_REQUEST_PATH_RE,
    GITHUB_PULL_REQUEST_PATH_RE
  };
})();
