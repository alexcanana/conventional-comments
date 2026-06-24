import { commentTextareaSelector } from './core/selectors';
import { matchTrigger } from './core/trigger';
import {
  showDropdown,
  hideDropdown,
  isPinned,
  setDropdownSource,
  setInsertHandler,
  setInsertTriggerKeyword,
} from './core/dropdown';
import {
  readOptions,
  subscribeToOptionsChanges,
  incrementLabelUsage,
  readLabelUsageCounts,
} from './lib/options-storage';
import type { ExtensionOptions } from './lib/options';

let activeTriggerKeyword = 'cc';

export function getActiveTriggerKeyword(): string {
  return activeTriggerKeyword;
}

export function setActiveTriggerKeyword(keyword: string): void {
  activeTriggerKeyword = keyword;
  setInsertTriggerKeyword(keyword);
}

async function applyOptionsToDropdown(options: ExtensionOptions): Promise<void> {
  const usage = options.sortLabelsByUsage ? await readLabelUsageCounts() : {};
  const orderLabels = (entries: typeof options.labels) =>
    [...entries]
      .filter((entry) => entry.isEnabled)
      .sort((a, b) =>
        options.sortLabelsByUsage
          ? (usage[b.key] ?? 0) - (usage[a.key] ?? 0) || a.sortOrder - b.sortOrder
          : a.sortOrder - b.sortOrder,
      );

  setDropdownSource({
    labels: orderLabels(options.labels).map((entry) => ({
      label: entry.key,
      description: entry.description,
    })),
    decorations: options.decorations
      .filter((decoration) => decoration.isEnabled)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((decoration) => ({ label: decoration.key, description: decoration.description })),
    showLabelDescriptions: options.showLabelDescriptionsInDropdown,
    showDecorationDescriptions: options.showDecorationDescriptions,
  });
}

function bindTextarea(textarea: HTMLTextAreaElement): void {
  if (textarea.dataset.ccBound) {
    return;
  }

  textarea.dataset.ccBound = '1';

  textarea.addEventListener('input', () => {
    // Once decorations are showing the dropdown is pinned (see isPinned); the
    // trigger text is irrelevant, so don't let editing it tear the dropdown down.
    if (isPinned()) {
      return;
    }

    const match = matchTrigger(textarea.value, textarea.selectionStart, activeTriggerKeyword);

    if (match === null) {
      hideDropdown();
    } else {
      showDropdown(textarea, match.query);
    }
  });
  textarea.addEventListener('blur', () => {
    if (isPinned()) {
      return;
    }

    hideDropdown();
  });
}

export function attach(root: Document | Element = document): MutationObserver {
  const selector = commentTextareaSelector;

  const bindWithin = (node: Node): void => {
    if (typeof (node as Element).matches === 'function' && (node as Element).matches(selector)) {
      bindTextarea(node as HTMLTextAreaElement);
    }

    if (typeof (node as Element).querySelectorAll === 'function') {
      (node as Element).querySelectorAll<HTMLTextAreaElement>(selector).forEach(bindTextarea);
    }
  };

  // Bind textareas already on the page...
  bindWithin(root);

  // ...and any the host adds later (GitHub renders the comment editor only when
  // you click a line, so the textarea often does not exist at load time).
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof HTMLElement) {
          bindWithin(node);
        }
      }
    }
  });
  const observeTarget = root === document ? document.documentElement : root;
  observer.observe(observeTarget, { childList: true, subtree: true });

  return observer;
}

const BOOTSTRAPPED = '__ccBootstrapped';

export function bootstrap(root: Document | Element = document): void {
  // The service worker injects the script twice for a freshly-granted origin
  // (registerContentScripts for future loads + executeScript for the open tab),
  // so guard against a second bootstrap adding duplicate observers and listeners.
  const flags = globalThis as Record<string, unknown>;
  if (root === document && flags[BOOTSTRAPPED]) {
    return;
  }

  if (root === document) {
    flags[BOOTSTRAPPED] = true;
  }

  // Load options (best-effort — the content script must still work if storage is
  // unavailable, e.g. in a plain test page).
  if (typeof chrome !== 'undefined' && chrome.storage) {
    setInsertHandler((key) => void incrementLabelUsage(key));
    void readOptions().then((options) => {
      setActiveTriggerKeyword(options.triggerKeyword);
      void applyOptionsToDropdown(options);
    });
    subscribeToOptionsChanges((options) => {
      setActiveTriggerKeyword(options.triggerKeyword);
      void applyOptionsToDropdown(options);
    });
  }

  attach(root);
}

if (typeof window !== 'undefined') {
  bootstrap();
}
