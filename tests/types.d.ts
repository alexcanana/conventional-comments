import type { matchTrigger } from '../src/core/trigger';
import type { showDropdown, hideDropdown, isOpen } from '../src/core/dropdown';
import type { bootstrap, setActiveTriggerKeyword } from '../src/content';
import type { LABELS } from '../src/core/labels';

declare global {
  interface Window {
    __cc: {
      matchTrigger: typeof matchTrigger;
      showDropdown: typeof showDropdown;
      hideDropdown: typeof hideDropdown;
      isOpen: typeof isOpen;
      bootstrap: typeof bootstrap;
      setActiveTriggerKeyword: typeof setActiveTriggerKeyword;
      labels: typeof LABELS;
    };
    __ccPlatform: 'github' | 'gitlab';
    // Test-local counter set up inside individual specs (e.g. gitlab/escape) via
    // page.evaluate to count swallowed Escape events; not part of the __cc harness.
    __escapes: number;
  }
}

export {};
