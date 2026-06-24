import { build } from 'vite';
import { rmSync, cpSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deepMerge } from './merge-manifest.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(root, 'dist/chromium');

// One clean, then every pass appends to the same folder (emptyOutDir:false).
rmSync(outDir, { recursive: true, force: true });

// MV3 content scripts must be classic IIFE bundles, so content.js and
// background.js are single-entry lib builds (iife can't multi-entry split).
async function buildScript(entry, name, fileName) {
  await build({
    configFile: false,
    root,
    build: {
      outDir,
      emptyOutDir: false,
      copyPublicDir: false,
      lib: {
        entry: resolve(root, entry),
        formats: ['iife'],
        name,
        fileName: () => fileName,
      },
    },
  });
}

await buildScript('src/content.ts', 'ccContent', 'content.js');
await buildScript('src/background/service-worker.ts', 'ccBackground', 'background.js');

// Options app (uses vite.config.mjs): options.html + hashed assets, and copies
// public/ (icons/, dropdown.css) into dist/chromium.
await build();

// Each target is manifest.base.json (shared fields) deep-merged with a thin
// per-target overlay (background type + Firefox gecko settings).
const readManifest = (name) => JSON.parse(readFileSync(resolve(root, 'manifests', name), 'utf8'));
const baseManifest = readManifest('manifest.base.json');
const chromiumManifest = deepMerge(baseManifest, readManifest('manifest.chromium.json'));
const firefoxManifest = deepMerge(baseManifest, readManifest('manifest.firefox.json'));

writeFileSync(resolve(outDir, 'manifest.json'), `${JSON.stringify(chromiumManifest, null, 2)}\n`);

console.log('Built dist/chromium');

// Firefox MV3: same bundles, only the manifest differs.
const firefoxDir = resolve(root, 'dist/firefox-mv3');
rmSync(firefoxDir, { recursive: true, force: true });
cpSync(outDir, firefoxDir, { recursive: true });
writeFileSync(
  resolve(firefoxDir, 'manifest.json'),
  `${JSON.stringify(firefoxManifest, null, 2)}\n`,
);

console.log('Built dist/firefox-mv3');
