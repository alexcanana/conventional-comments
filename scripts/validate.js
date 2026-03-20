#!/usr/bin/env node
/**
 * Ensure manifest JSON files parse and the base manifest has a semver version.
 */

const fs = require("fs/promises");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const manifestDir = path.join(rootDir, "manifests");

const SEMVER = /^\d+\.\d+\.\d+$/;

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function main() {
  const names = await fs.readdir(manifestDir);
  const jsonFiles = names.filter((n) => n.endsWith(".json")).sort();

  for (const name of jsonFiles) {
    await readJson(path.join(manifestDir, name));
  }

  const basePath = path.join(manifestDir, "manifest.base.mv3.json");
  const base = await readJson(basePath);
  if (typeof base.version !== "string" || !SEMVER.test(base.version)) {
    throw new Error(
      `Invalid or missing version in manifest.base.mv3.json: ${base.version}`,
    );
  }

  console.log("Manifest validation passed.");
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
