#!/usr/bin/env node
/**
 * Validate the manifests that actually ship: every file under manifests/ must
 * parse, and the per-target merged result (base + overlay) must be a valid MV3
 * manifest. Catches a malformed overlay or a bad merge before the build does.
 */

const fs = require('fs/promises');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const manifestDir = path.join(rootDir, 'manifests');

const SEMVER = /^\d+\.\d+\.\d+$/;

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');

  return JSON.parse(raw);
}

function assertValidMergedManifest(target, manifest) {
  if (manifest.manifest_version !== 3) {
    throw new Error(`${target}: manifest_version must be 3, got ${manifest.manifest_version}`);
  }

  if (typeof manifest.name !== 'string' || !manifest.name) {
    throw new Error(`${target}: missing name`);
  }

  if (typeof manifest.version !== 'string' || !SEMVER.test(manifest.version)) {
    throw new Error(`${target}: invalid or missing version: ${manifest.version}`);
  }

  const background = manifest.background;
  const hasServiceWorker = typeof background?.service_worker === 'string';
  const hasScripts = Array.isArray(background?.scripts) && background.scripts.length > 0;

  if (!hasServiceWorker && !hasScripts) {
    throw new Error(`${target}: background must declare a service_worker or scripts`);
  }
}

async function main() {
  // Parse-check every manifest first so a syntax error reports the offending file.
  const names = (await fs.readdir(manifestDir)).filter((name) => name.endsWith('.json')).sort();
  for (const name of names) {
    await readJson(path.join(manifestDir, name));
  }

  const { deepMerge } = await import('./merge-manifest.mjs');
  const base = await readJson(path.join(manifestDir, 'manifest.base.json'));

  for (const target of ['chromium', 'firefox']) {
    const overlay = await readJson(path.join(manifestDir, `manifest.${target}.json`));
    assertValidMergedManifest(target, deepMerge(base, overlay));
  }

  console.log(`Manifest validation passed (v${base.version}, chromium + firefox).`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
