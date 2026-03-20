#!/usr/bin/env node
/**
 * Copy extension sources into dist/, merge manifests per target, zip (same flow as multi-pass).
 * @see https://github.com/M4n0x/multi-pass/blob/main/scripts/build.js
 */

const fs = require("fs/promises");
const path = require("path");
const { execSync } = require("child_process");

const rootDir = path.resolve(__dirname, "..");
const sourceDir = path.join(rootDir, "src");
const distDir = path.join(rootDir, "dist");
const manifestDir = path.join(rootDir, "manifests");

const targets = [
  {
    name: "chromium",
    manifestBase: "manifest.base.mv3.json",
    manifestOverride: "manifest.chromium.json",
    outputDir: "chromium",
    zipBase: "conventional-comments-chromium",
  },
  {
    name: "firefox-mv3",
    manifestBase: "manifest.base.mv3.json",
    manifestOverride: "manifest.firefox.mv3.json",
    outputDir: "firefox-mv3",
    zipBase: "conventional-comments-firefox-mv3",
  },
];

function isObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function deepMerge(base, override) {
  if (!isObject(base)) {
    return override;
  }
  const merged = { ...base };
  for (const [key, value] of Object.entries(override || {})) {
    if (value === null) {
      delete merged[key];
      continue;
    }
    if (isObject(value) && isObject(merged[key])) {
      merged[key] = deepMerge(merged[key], value);
    } else if (value !== undefined) {
      merged[key] = value;
    }
  }
  return merged;
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function copyExtension(targetDir) {
  await fs.rm(targetDir, { recursive: true, force: true });
  await fs.mkdir(targetDir, { recursive: true });
  await fs.cp(sourceDir, targetDir, { recursive: true });
}

async function writeManifest(targetDir, manifest) {
  const manifestPath = path.join(targetDir, "manifest.json");
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

function zipTarget(targetDir, zipName) {
  const zipPath = path.join(distDir, zipName);
  execSync(`zip -r "${zipPath}" . -x "*.DS_Store"`, {
    stdio: "inherit",
    cwd: targetDir,
  });
}

async function buildTarget(target) {
  const targetDir = path.join(distDir, target.outputDir);
  await copyExtension(targetDir);

  const overridePath = path.join(manifestDir, target.manifestOverride);
  const overrideManifest = await readJson(overridePath);
  let manifest = overrideManifest;

  if (target.manifestBase) {
    const basePath = path.join(manifestDir, target.manifestBase);
    const baseManifest = await readJson(basePath);
    manifest = deepMerge(baseManifest, overrideManifest);
  }

  await writeManifest(targetDir, manifest);
  const version = manifest.version;
  const zipName = `${target.zipBase}-v${version}.zip`;
  zipTarget(targetDir, zipName);
}

async function main() {
  const pick = process.argv[2];
  const list = pick ? targets.filter((t) => t.name === pick) : targets;
  if (pick && list.length === 0) {
    console.error(`Unknown target "${pick}". Use: chromium | firefox-mv3`);
    process.exit(1);
  }

  if (!pick) {
    await fs.rm(distDir, { recursive: true, force: true });
    await fs.mkdir(distDir, { recursive: true });
  } else {
    await fs.mkdir(distDir, { recursive: true });
    for (const target of list) {
      await fs.rm(path.join(distDir, target.outputDir), {
        recursive: true,
        force: true,
      });
      const prefix = `${target.zipBase}-v`;
      let entries = [];
      try {
        entries = await fs.readdir(distDir);
      } catch {
        /* ignore */
      }
      for (const name of entries) {
        if (name.startsWith(prefix) && name.endsWith(".zip")) {
          await fs.rm(path.join(distDir, name), { force: true });
        }
      }
    }
  }

  for (const target of list) {
    await buildTarget(target);
  }

  console.log(
    `Built ${list.map((t) => `dist/${t.outputDir}`).join(", ")} (and zips in dist/)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
