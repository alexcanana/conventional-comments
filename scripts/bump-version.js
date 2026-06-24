#!/usr/bin/env node
/**
 * Patch-bump the shipped manifest version (manifests/manifest.base.json).
 * Run manually via `bun run bump`; CI does not auto-bump.
 */

const fs = require('fs/promises');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const baseManifestPath = path.join(rootDir, 'manifests', 'manifest.base.json');

function bumpPatch(version) {
  const parts = version.split('.').map((value) => Number.parseInt(value, 10));
  if (parts.length !== 3 || parts.some((value) => Number.isNaN(value))) {
    throw new Error(`Invalid version: ${version}`);
  }

  const [major, minor, patch] = parts;

  return `${major}.${minor}.${patch + 1}`;
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');

  return JSON.parse(raw);
}

async function writeJson(filePath, data) {
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

async function main() {
  const baseManifest = await readJson(baseManifestPath);
  const currentVersion = baseManifest.version;
  const nextVersion = bumpPatch(currentVersion);

  baseManifest.version = nextVersion;
  await writeJson(baseManifestPath, baseManifest);

  console.log(`Version bumped ${currentVersion} → ${nextVersion}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
