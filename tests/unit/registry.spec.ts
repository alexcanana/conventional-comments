import { test, expect } from '@playwright/test';
import { commentTextareaSelector } from '../../src/core/selectors';

test('commentTextareaSelector unions the known GitHub and GitLab comment-box selectors', () => {
  expect(commentTextareaSelector).toContain('textarea[name="comment[body]"]'); // GitHub
  expect(commentTextareaSelector).toContain('textarea[aria-label="Markdown value"]'); // GitHub
  expect(commentTextareaSelector).toContain('textarea[name="note[note]"]'); // GitLab
});
