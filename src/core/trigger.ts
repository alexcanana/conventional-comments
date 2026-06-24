export const TRIGGER = 'cc';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Matches the trigger at the caret: the keyword (at a word boundary) optionally
// followed by a letter query, e.g. "cc" or "cct". Returns the query and the full
// trigger length (so callers can replace the whole token), or null when the
// trigger is not active.
export function matchTrigger(
  text: string,
  caretIndex: number,
  triggerKeyword: string = TRIGGER,
): { query: string; length: number } | null {
  const before = text.slice(0, caretIndex);
  const pattern = new RegExp(`(?:^|\\s)${escapeRegExp(triggerKeyword)}([a-zA-Z]*)$`, 'i');
  const match = before.match(pattern);

  if (!match) {
    return null;
  }

  const query = match[1];

  return { query, length: triggerKeyword.length + query.length };
}
