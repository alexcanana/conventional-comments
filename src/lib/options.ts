import { LABELS } from '../core/labels';
import { DECORATIONS } from '../core/decorations';

export interface EntryOption {
  key: string;
  description: string;
  isEnabled: boolean;
  sortOrder: number;
}

export interface ExtensionOptions {
  triggerKeyword: string;
  allowedOrigins: string[];
  disabledOrigins: string[];
  labels: EntryOption[];
  decorations: EntryOption[];
  sortLabelsByUsage: boolean;
  showLabelDescriptionsInDropdown: boolean;
  showDecorationDescriptions: boolean;
}

export const DEFAULT_ALLOWED_ORIGINS = ['https://github.com/*', 'https://gitlab.com/*'];

function seedFromEntries(entries: { label: string; description: string }[]): EntryOption[] {
  return entries.map((entry, index) => ({
    key: entry.label,
    description: entry.description,
    isEnabled: true,
    sortOrder: index,
  }));
}

export const DEFAULT_OPTIONS: ExtensionOptions = {
  triggerKeyword: 'cc',
  allowedOrigins: [...DEFAULT_ALLOWED_ORIGINS],
  disabledOrigins: [],
  labels: seedFromEntries(LABELS),
  decorations: seedFromEntries(DECORATIONS),
  sortLabelsByUsage: true,
  showLabelDescriptionsInDropdown: true,
  showDecorationDescriptions: true,
};
