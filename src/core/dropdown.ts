import { getCaretCoordinates } from './caret';
import { matchTrigger, TRIGGER } from './trigger';
import { LABELS } from './labels';
import { DECORATIONS } from './decorations';
import type { Entry } from './entries';

const ID = 'cc-dropdown';

interface DropdownSource {
  labels: Entry[];
  decorations: Entry[];
  showLabelDescriptions: boolean;
  showDecorationDescriptions: boolean;
}

let source: DropdownSource = {
  labels: LABELS,
  decorations: DECORATIONS,
  showLabelDescriptions: true,
  showDecorationDescriptions: true,
};
let onInsert: (labelKey: string) => void = () => {};

let insertTriggerKeyword = TRIGGER;

export function setInsertTriggerKeyword(keyword: string): void {
  insertTriggerKeyword = keyword;
}

export function setDropdownSource(next: DropdownSource): void {
  source = next;
}

export function getDropdownLabels(): Entry[] {
  return source.labels;
}

export function setInsertHandler(handler: (labelKey: string) => void): void {
  onInsert = handler;
}

let activeTextarea: HTMLTextAreaElement | null = null;
let activeIndex = 0;
let stage: 'labels' | 'decorations' = 'labels';
let selectedLabel = '';
let labelQuery = '';
let repositionScheduled = false;
let renderedEntries: Entry[] = [];

// Wire the focused textarea up as an ARIA combobox that owns the listbox. The
// active-option relationship (aria-activedescendant) must live on the focused
// element — the dropdown div never receives focus — or screen readers won't
// announce the highlighted option as navigation moves.
function markCombobox(textarea: HTMLTextAreaElement): void {
  textarea.setAttribute('role', 'combobox');
  textarea.setAttribute('aria-autocomplete', 'list');
  textarea.setAttribute('aria-expanded', 'true');
  textarea.setAttribute('aria-controls', ID);
}

function clearCombobox(textarea: HTMLTextAreaElement): void {
  textarea.removeAttribute('role');
  textarea.removeAttribute('aria-autocomplete');
  textarea.removeAttribute('aria-expanded');
  textarea.removeAttribute('aria-controls');
  textarea.removeAttribute('aria-activedescendant');
}

// Labels whose name starts with the typed query (case-insensitive).
function filterLabels(query: string): Entry[] {
  const normalized = query.toLowerCase();

  return source.labels.filter((entry) => entry.label.toLowerCase().startsWith(normalized));
}

function renderItems(element: HTMLElement, entries: Entry[], withCheckbox: boolean): void {
  element.textContent = '';
  renderedEntries = entries;
  element.setAttribute('role', 'listbox');
  element.setAttribute(
    'aria-label',
    withCheckbox ? 'Conventional Comments decorations' : 'Conventional Comments labels',
  );

  if (withCheckbox) {
    element.setAttribute('aria-multiselectable', 'true');
  } else {
    element.removeAttribute('aria-multiselectable');
  }

  const showDescription = withCheckbox
    ? source.showDecorationDescriptions
    : source.showLabelDescriptions;

  entries.forEach(({ label, description }, index) => {
    const item = document.createElement('div');
    item.className = 'cc-item';
    item.id = `cc-option-${index}`;
    item.setAttribute('role', 'option');
    item.setAttribute('aria-selected', 'false');

    if (withCheckbox) {
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'cc-checkbox';
      checkbox.tabIndex = -1;
      checkbox.setAttribute('aria-label', label);
      item.appendChild(checkbox);
    }

    // Stack the label over its description in a column so the checkbox sits
    // beside the text block rather than inline with it.
    const text = document.createElement('div');
    text.className = 'cc-text';

    const labelElement = document.createElement('span');
    labelElement.className = 'cc-label';
    labelElement.textContent = label;
    text.appendChild(labelElement);

    if (showDescription) {
      const descriptionElement = document.createElement('span');
      descriptionElement.className = 'cc-desc';
      descriptionElement.textContent = description;
      text.appendChild(descriptionElement);
    }

    item.appendChild(text);
    element.appendChild(item);
  });
}

function itemElements(): HTMLElement[] {
  const element = document.getElementById(ID);

  return element ? ([...element.querySelectorAll('.cc-item')] as HTMLElement[]) : [];
}

function setActive(index: number): void {
  const items = itemElements();
  if (!items.length) {
    return;
  }

  activeIndex = (index + items.length) % items.length;
  const dropdown = document.getElementById(ID);
  if (!dropdown) {
    return;
  }

  items.forEach((item, index) => {
    const isActive = index === activeIndex;
    item.classList.toggle('cc-active', isActive);

    // Labels are single-select: the highlighted row is the selected one.
    // Decorations are multi-select: aria-selected follows the checkbox instead
    // (set in renderItems / toggleDecoration), so don't touch it here.
    if (stage === 'labels') {
      item.setAttribute('aria-selected', isActive ? 'true' : 'false');
    }
  });

  // aria-activedescendant goes on the focused textarea (the combobox), not the
  // unfocused listbox div — see markCombobox.
  if (activeTextarea) {
    activeTextarea.setAttribute('aria-activedescendant', items[activeIndex].id);
  }

  // Scroll within the dropdown only — element.scrollIntoView() would scroll the
  // host page (a jump to the top on GitHub when the dropdown first opens).
  const active = items[activeIndex];
  const top = active.offsetTop;
  const bottom = top + active.offsetHeight;
  if (top < dropdown.scrollTop) {
    dropdown.scrollTop = top;
  } else if (bottom > dropdown.scrollTop + dropdown.clientHeight) {
    dropdown.scrollTop = bottom - dropdown.clientHeight;
  }
}

// Move the highlighted entry by delta (e.g. +1 for ArrowDown), wrapping at ends.
function moveActive(delta: number): void {
  setActive(activeIndex + delta);
}

function showDecorations(): void {
  const element = document.getElementById(ID);
  if (!element) {
    return;
  }

  stage = 'decorations';
  renderItems(element, source.decorations, true);
  setActive(0);
  position(element);
}

// Go back from the decorations to the (still query-filtered) label list.
function showLabels(): void {
  const element = document.getElementById(ID);
  if (!element) {
    return;
  }

  stage = 'labels';
  selectedLabel = '';
  renderItems(element, filterLabels(labelQuery), false);
  setActive(0);
  position(element);
}

function selectLabel(index: number): void {
  setActive(index);
  selectedLabel = renderedEntries[index].label;
  showDecorations();
}

function toggleDecoration(index: number): void {
  const item = itemElements()[index];
  const checkbox = item && item.querySelector<HTMLInputElement>('.cc-checkbox');
  if (checkbox) {
    checkbox.checked = !checkbox.checked;
    item.setAttribute('aria-selected', checkbox.checked ? 'true' : 'false');
  }
}

function insertComment(): void {
  const textarea = activeTextarea;
  if (!textarea) {
    return;
  }

  const caret = textarea.selectionStart;
  const match = matchTrigger(textarea.value, caret, insertTriggerKeyword);

  // The trigger may have moved or been edited while the dropdown was open; only
  // replace it when it is still right before the caret.
  if (!match) {
    hideDropdown();

    return;
  }

  const checkedDecorations = itemElements()
    .filter((item) => item.querySelector<HTMLInputElement>('.cc-checkbox')?.checked)
    .map((item) => item.querySelector('.cc-label')?.textContent ?? '')
    .filter((label) => label.length > 0);
  const decorationText = checkedDecorations.length ? ` (${checkedDecorations.join(', ')})` : '';
  const snippet = `**${selectedLabel}${decorationText}:** `;

  const start = caret - match.length;
  const value = textarea.value;
  const newValue = value.slice(0, start) + snippet + value.slice(caret);
  const newCaret = start + snippet.length;

  // Use the native setter so framework-controlled textareas (React/Vue) notice
  // the change, then fire an input event the way a real keystroke would.
  const valueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    'value',
  )!.set!;
  valueSetter.call(textarea, newValue);
  textarea.setSelectionRange(newCaret, newCaret);
  textarea.dispatchEvent(new Event('input', { bubbles: true }));

  onInsert(selectedLabel);
  hideDropdown();
  textarea.focus();
}

// Enter: advance from the label list to the decorations, or write the comment.
function selectActive(): void {
  if (stage === 'labels') {
    selectLabel(activeIndex);
  } else {
    insertComment();
  }
}

// Space: toggle the highlighted decoration.
function toggleActive(): void {
  toggleDecoration(activeIndex);
}

function onClick(event: MouseEvent): void {
  const target = event.target as HTMLElement;
  const item = target.closest('.cc-item');
  if (!item) {
    return;
  }

  const index = itemElements().indexOf(item as HTMLElement);
  if (index < 0) {
    return;
  }

  setActive(index);
  if (stage === 'labels') {
    selectLabel(index);
  } else {
    toggleDecoration(index);
  }
}

function position(element: HTMLElement): void {
  if (!activeTextarea) {
    return;
  }

  const rect = activeTextarea.getBoundingClientRect();
  const caret = getCaretCoordinates(activeTextarea, activeTextarea.selectionStart);
  element.style.top = `${window.scrollY + rect.top + caret.top - activeTextarea.scrollTop + caret.height}px`;
  element.style.left = `${window.scrollX + rect.left + caret.left - activeTextarea.scrollLeft}px`;
}

// Keep the dropdown glued to the caret while open. Capture phase so scrolling
// of any ancestor (e.g. a nested scroll container) triggers a reposition.
// Throttled to one update per animation frame so fast scroll/resize streams do
// not force a layout per event.
function reposition(): void {
  if (repositionScheduled) {
    return;
  }

  repositionScheduled = true;
  requestAnimationFrame(() => {
    repositionScheduled = false;
    const element = document.getElementById(ID);

    if (element) {
      position(element);
    }
  });
}

// Close on any pointer press outside the dropdown — including the textarea
// behind it, which stays focused on click and so never fires blur.
function onDocumentPointerDown(event: MouseEvent): void {
  const element = document.getElementById(ID);
  if (element && !element.contains(event.target as Node)) {
    hideDropdown();
  }
}

// Drive the dropdown from the keyboard. Registered on document in the capture
// phase so we run before the host page's own handlers (e.g. GitLab's Escape
// "cancel this comment?" prompt, which sits on the textarea) and can swallow
// the keys the dropdown owns.
function onKeydown(event: KeyboardEvent): void {
  if (!isOpen()) {
    return;
  }

  if (stage === 'labels' && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
    // Let the caret move normally, but the trigger context is gone — close.
    // Only at the labels stage: once a label is chosen the decorations no longer
    // track the trigger, so caret movement must not discard them (Escape steps
    // back to labels instead).
    hideDropdown();

    return;
  }

  switch (event.key) {
    case 'Escape':
      if (stage === 'decorations') {
        showLabels();
      } else {
        hideDropdown();
      }

      break;
    case 'ArrowDown':
      moveActive(1);
      break;
    case 'ArrowUp':
      moveActive(-1);
      break;
    case 'Enter':
      selectActive();
      break;
    case ' ':
      if (stage !== 'decorations') {
        return;
      }

      toggleActive();
      break;
    default:
      return;
  }

  event.preventDefault();
  event.stopPropagation();
}

function createDropdown(): HTMLElement {
  const element = document.createElement('div');
  element.id = ID;
  element.className = 'cc-dropdown';
  // Keep focus on the textarea when interacting with the dropdown, so a click
  // selects an item instead of blurring (which would close it).
  element.addEventListener('mousedown', (event) => event.preventDefault());
  element.addEventListener('click', onClick);
  document.body.appendChild(element);
  window.addEventListener('scroll', reposition, true);
  window.addEventListener('resize', reposition);
  document.addEventListener('mousedown', onDocumentPointerDown, true);
  document.addEventListener('keydown', onKeydown, true);

  return element;
}

export function showDropdown(textarea: HTMLTextAreaElement, query = ''): HTMLElement | null {
  const existing = document.getElementById(ID);

  // Once a label is chosen, keep the decorations on screen regardless of the
  // (now irrelevant) trigger text; just keep them positioned against the
  // textarea they were opened for.
  if (existing && stage === 'decorations') {
    position(existing);

    return existing;
  }

  if (activeTextarea && activeTextarea !== textarea) {
    clearCombobox(activeTextarea);
  }

  activeTextarea = textarea;
  const labels = filterLabels(query);

  if (!labels.length) {
    hideDropdown();

    return null;
  }

  markCombobox(textarea);

  const element = existing ?? createDropdown();
  stage = 'labels';
  selectedLabel = '';
  labelQuery = query;
  renderItems(element, labels, false);
  setActive(0);
  position(element);

  return element;
}

export function hideDropdown(): void {
  const element = document.getElementById(ID);
  if (element) {
    element.remove();
  }

  window.removeEventListener('scroll', reposition, true);
  window.removeEventListener('resize', reposition);
  document.removeEventListener('mousedown', onDocumentPointerDown, true);
  document.removeEventListener('keydown', onKeydown, true);

  if (activeTextarea) {
    clearCombobox(activeTextarea);
  }

  activeTextarea = null;
  activeIndex = 0;
  stage = 'labels';
  selectedLabel = '';
  labelQuery = '';
  renderedEntries = [];
}

export function isOpen(): boolean {
  return !!document.getElementById(ID);
}

// True once a label is chosen and the decorations are showing: the dropdown is
// then pinned to its textarea and no longer tracks the trigger, so editing the
// (now irrelevant) trigger text must not close it. Escape steps back to labels.
export function isPinned(): boolean {
  return isOpen() && stage === 'decorations';
}
