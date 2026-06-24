import type { Entry } from './entries';

// Conventional Comments labels, in the order listed on
// https://conventionalcomments.org/ (decorations are intentionally omitted).
export const LABELS: Entry[] = [
  { label: 'praise', description: 'Highlights something done well.' },
  { label: 'nitpick', description: 'Minor preference or optional tweak.' },
  { label: 'suggestion', description: 'Concrete improvement proposal.' },
  { label: 'issue', description: 'Problem requiring a fix.' },
  { label: 'todo', description: 'Follow-up work item.' },
  { label: 'question', description: 'Clarification request.' },
  { label: 'thought', description: 'Non-blocking observation.' },
  { label: 'chore', description: 'Maintenance or refactor note.' },
  { label: 'note', description: 'General contextual comment.' },
  { label: 'typo', description: 'Spelling/wording correction.' },
  { label: 'polish', description: 'Quality/readability refinement.' },
  { label: 'quibble', description: 'Tiny preference-level disagreement.' },
];
