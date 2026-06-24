import path from 'node:path';
import fs from 'node:fs';
import type { Page } from '@playwright/test';

const builtScript = path.resolve(__dirname, '.build', 'test-entry.js');
const cssFile = path.resolve(__dirname, '..', 'public', 'dropdown.css');

export async function loadFixture(page: Page, fixture: string): Promise<void> {
  const fixturePath = path.resolve(__dirname, 'fixtures', fixture);
  await page.goto('file://' + fixturePath);
  await page.addStyleTag({ content: fs.readFileSync(cssFile, 'utf8') });
  await page.addScriptTag({ path: builtScript });
}
