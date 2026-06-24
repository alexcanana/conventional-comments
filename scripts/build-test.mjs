import { build } from 'vite';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// The Playwright harness injects this as a classic <script>, so it must be IIFE
// — the same format the shipped content.js uses.
await build({
  configFile: false,
  root,
  build: {
    outDir: resolve(root, 'tests/.build'),
    emptyOutDir: false,
    copyPublicDir: false,
    minify: false,
    lib: {
      entry: resolve(root, 'tests/test-entry.ts'),
      formats: ['iife'],
      name: 'ccTest',
      fileName: () => 'test-entry.js',
    },
  },
});

console.log('Built tests/.build/test-entry.js');
