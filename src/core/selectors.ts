// Comment-editor textareas across GitHub's and GitLab's UIs, keyed on stable
// name/aria/testid attributes (not the hashed framework classes). The content
// script binds any textarea matching this union — which site it came from is
// irrelevant to the picker.
const COMMENT_TEXTAREA_SELECTORS = [
  // GitHub — React and classic comment/review editors.
  'textarea[name="comment[body]"]',
  'textarea[name="pull_request_review[body]"]',
  'textarea[name="pull_request_review_comment[body]"]',
  'textarea[name="pull_request_review_thread[body]"]',
  'textarea[aria-label="Markdown value"]',
  'textarea[data-testid="markdown-editor-input"]',
  'textarea.js-comment-field',
  'textarea#new_comment_field',
  // GitLab — comment / reply editors across its UIs.
  'textarea[name="note[note]"]',
  'textarea[data-testid="reply-field"]',
  'textarea.note-textarea',
  'textarea.js-note-text',
];

export const commentTextareaSelector = COMMENT_TEXTAREA_SELECTORS.join(', ');
