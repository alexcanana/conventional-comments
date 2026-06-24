import { matchTrigger } from '../src/core/trigger';
import { showDropdown, hideDropdown, isOpen } from '../src/core/dropdown';
import { LABELS } from '../src/core/labels';
import { bootstrap, setActiveTriggerKeyword } from '../src/content';

window.__cc = {
  matchTrigger,
  showDropdown,
  hideDropdown,
  isOpen,
  bootstrap,
  setActiveTriggerKeyword,
  labels: LABELS,
};

bootstrap();
