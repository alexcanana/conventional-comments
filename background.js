importScripts('src/shared.js');
importScripts('src/core/routes.js');

const routes = globalThis.GCC_ROUTES || {};
const GITLAB_MERGE_REQUEST_PATH_RE = routes.GITLAB_MERGE_REQUEST_PATH_RE || /\/-\/merge_requests\/\d+(?:\/diffs)?(?:\/.*)?$/;
const GITHUB_PULL_REQUEST_PATH_RE = routes.GITHUB_PULL_REQUEST_PATH_RE || /^\/[^/]+\/[^/]+\/pull\/\d+(?:\/(?:conversation|files|changes))?\/?$/;
const DEBUG_PREFIX = '[gcc]';

let debugModeEnabled = DEFAULT_DEBUG_MODE;

function logDebug(message, metadata) {
  if (!debugModeEnabled) {
    return;
  }

  if (typeof metadata === 'undefined') {
    console.debug(`${DEBUG_PREFIX} ${message}`);
    return;
  }

  console.debug(`${DEBUG_PREFIX} ${message}`, metadata);
}

function logError(message, error) {
  if (!debugModeEnabled) {
    return;
  }

  console.error(`${DEBUG_PREFIX} ${message}`, error);
}

async function loadDebugMode() {
  try {
    const result = await chrome.storage.sync.get({ debugMode: DEFAULT_DEBUG_MODE });
    debugModeEnabled = Boolean(result.debugMode);
  } catch (error) {
    debugModeEnabled = DEFAULT_DEBUG_MODE;
  }
}

loadDebugMode();

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'sync' || !changes.debugMode) {
    return;
  }

  debugModeEnabled = Boolean(changes.debugMode.newValue);
});

function getHttpsOrigin(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') {
      return null;
    }
    return url.origin;
  } catch (error) {
    return null;
  }
}

function isGitHubPullRequestPage(urlString) {
  try {
    const url = new URL(urlString);
    return GITHUB_PULL_REQUEST_PATH_RE.test(url.pathname);
  } catch (error) {
    return false;
  }
}

function getPlatformForUrl(url) {
  if (isMergeRequestPage(url)) {
    return 'gitlab';
  }

  if (isGitHubPullRequestPage(url)) {
    return 'github';
  }

  return null;
}

function matchesAllowedPattern(url, patterns) {
  const pageOrigin = getHttpsOrigin(url);
  if (!pageOrigin) {
    return false;
  }

  return patterns.some((pattern) => {
    const allowedOrigin = getHttpsOrigin(pattern);
    return allowedOrigin === pageOrigin;
  });
}

function isMergeRequestPage(urlString) {
  try {
    const url = new URL(urlString);
    return GITLAB_MERGE_REQUEST_PATH_RE.test(url.pathname);
  } catch (error) {
    return false;
  }
}

const injectedUrls = new Map();

async function getAllowedUrlPatterns() {
  try {
    const result = await chrome.storage.sync.get({
      allowedUrlPatterns: DEFAULT_PATTERNS
    });
    return Array.isArray(result.allowedUrlPatterns) ? result.allowedUrlPatterns : DEFAULT_PATTERNS;
  } catch (error) {
    logError('failed to read allowed origins', error);
    return DEFAULT_PATTERNS;
  }
}

function shouldInject(tabId, url) {
  return injectedUrls.get(tabId) !== url;
}

async function injectIntoTab(tabId, url) {
  const platform = getPlatformForUrl(url);
  if (!url || !platform) {
    logDebug('skip injection: unsupported url', { tabId, url });
    return;
  }

  const allowedUrlPatterns = await getAllowedUrlPatterns();

  if (!matchesAllowedPattern(url, allowedUrlPatterns)) {
    logDebug('skip injection: origin not allowed', { tabId, url });
    return;
  }

  if (!shouldInject(tabId, url)) {
    logDebug('skip injection: duplicate url', { tabId, url });
    return;
  }

  try {
    await chrome.scripting.insertCSS({
      target: { tabId },
      files: ['src/styles/core.css', `src/styles/${platform}.css`]
    });
  } catch (error) {
    logError('css injection failed', error);
  }

  let executed = false;
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: [
        'src/shared.js',
        'src/core/routes.js',
        'src/core/constants.js',
        'src/core/trigger.js',
        'src/core/position.js',
        'src/core/state.js',
        'src/core/render.js',
        'src/core/bindings.js',
        'src/core/core.js',
        'src/platforms/helpers.js',
        `src/platforms/${platform}.js`,
        'src/content.js'
      ]
    });
    executed = true;
  } catch (error) {
    logError('script injection failed', error);
  }

  if (executed) {
    injectedUrls.set(tabId, url);
    logDebug('injection succeeded', { tabId, url, platform });
  }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading') {
    injectedUrls.delete(tabId);
    return;
  }

  const nextUrl = changeInfo.url || tab.url;

  if (!nextUrl) {
    return;
  }

  if (changeInfo.status !== 'complete') {
    return;
  }

  injectIntoTab(tabId, nextUrl);
});

chrome.tabs.onRemoved.addListener((tabId) => {
  injectedUrls.delete(tabId);
});

chrome.webNavigation.onHistoryStateUpdated.addListener(async (details) => {
  if (details.frameId !== 0) {
    return;
  }
  await injectIntoTab(details.tabId, details.url);
}, {
  url: [{ pathContains: '/-/merge_requests/' }, { pathContains: '/pull/' }]
});

chrome.runtime.onInstalled.addListener(async () => {
  try {
    const result = await chrome.storage.sync.get(['allowedUrlPatterns', 'triggerText', 'debugMode']);
    const payload = {};

    if (!Array.isArray(result.allowedUrlPatterns)) {
      payload.allowedUrlPatterns = DEFAULT_PATTERNS;
    }

    if (typeof result.triggerText !== 'string' || result.triggerText.trim() === '') {
      payload.triggerText = DEFAULT_TRIGGER;
    }

    if (typeof result.debugMode !== 'boolean') {
      payload.debugMode = DEFAULT_DEBUG_MODE;
    }

    if (Object.keys(payload).length > 0) {
      await chrome.storage.sync.set(payload);
    }
  } catch (error) {
    logError('onInstalled bootstrap failed', error);
  }
});
