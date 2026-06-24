import { readOptions, writeOptions, subscribeToOptionsChanges } from '../lib/options-storage';
import { withOriginEnabled } from '../lib/origins';
import { isCanonicalOriginPattern } from '../lib/validation';
import type { ExtensionOptions } from '../lib/options';

const CONTENT_SCRIPT_ID = 'cc-content';

export function buildRegistration(origins: string[]): chrome.scripting.RegisteredContentScript {
  return {
    id: CONTENT_SCRIPT_ID,
    matches: origins,
    js: ['content.js'],
    css: ['dropdown.css'],
    runAt: 'document_idle',
  };
}

let syncChain: Promise<void> = Promise.resolve();

export function syncRegistration(options: ExtensionOptions): Promise<void> {
  // Serialize register/unregister so overlapping option changes can't interleave
  // (a double register is rejected as "already registered", and a lost
  // unregister can leave the script unregistered). Run the next sync whether the
  // previous one resolved or rejected.
  syncChain = syncChain.then(
    () => doSyncRegistration(options),
    () => doSyncRegistration(options),
  );

  return syncChain;
}

async function doSyncRegistration(options: ExtensionOptions): Promise<void> {
  const existing = await chrome.scripting.getRegisteredContentScripts({
    ids: [CONTENT_SCRIPT_ID],
  });
  if (existing.length > 0) {
    await chrome.scripting.unregisterContentScripts({ ids: [CONTENT_SCRIPT_ID] });
  }

  if (options.allowedOrigins.length > 0) {
    await chrome.scripting.registerContentScripts([buildRegistration(options.allowedOrigins)]);
  }
}

export function addGrantedOrigins(options: ExtensionOptions, origins: string[]): ExtensionOptions {
  return origins
    .filter((origin) => isCanonicalOriginPattern(origin))
    .reduce((current, origin) => withOriginEnabled(current, origin), options);
}

async function injectIntoMatchingTabs(origins: string[]): Promise<void> {
  if (origins.length === 0) {
    return;
  }

  const tabs = await chrome.tabs.query({ url: origins });

  await Promise.all(
    tabs.map(async (tab) => {
      if (tab.id === undefined) {
        return;
      }

      // The registered script only covers future loads, so inject into the tab
      // the user just granted; a navigated-away or unscriptable tab is fine to skip.
      try {
        await chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ['dropdown.css'] });
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
      } catch {
        return;
      }
    }),
  );
}

async function persistGrantedOrigins(origins: string[]): Promise<void> {
  const grantable = origins.filter((origin) => isCanonicalOriginPattern(origin));
  const options = await readOptions();
  const updated = addGrantedOrigins(options, grantable);

  if (updated !== options) {
    await writeOptions(updated);
  }

  await injectIntoMatchingTabs(grantable);
}

async function initialise(): Promise<void> {
  await syncRegistration(await readOptions());
}

// Wire the lifecycle only in the real extension (guarded so unit tests that
// import the pure functions don't need the runtime APIs).
if (typeof chrome !== 'undefined' && chrome.runtime?.onInstalled) {
  chrome.runtime.onInstalled.addListener((details) => {
    void initialise();

    if (details.reason === 'install') {
      chrome.runtime.openOptionsPage();
    }
  });
  chrome.runtime.onStartup.addListener(() => void initialise());
  subscribeToOptionsChanges((options) => void syncRegistration(options));
  chrome.permissions.onAdded.addListener((permissions) => {
    void persistGrantedOrigins(permissions.origins ?? []);
  });
}
