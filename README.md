# Conventional Comments for GitLab and GitHub

## Description

Browser extension (Chrome, Edge, Firefox) that offers autocomplete for [Conventional Comments](https://conventionalcomments.org/) labels and decorations when you write merge request or pull request comments on GitLab and GitHub.

## Features

- Autocomplete dropdown when you type a configurable trigger in comment textareas (MR/PR conversation, files, and changes views where supported).
- **GitLab** and **GitHub** support with styling that matches each host where possible.
- **Options:** trigger word, allowed HTTPS sites, labels, decorations, and reset to defaults.
- **Chromium** (Chrome, Edge) and **Firefox** MV3 builds from one codebase (`dist/chromium`, `dist/firefox-mv3`).

## Usage

Install the extension, then open **Options**. The page has five sections:

- **Trigger** — the keyword that opens the picker (default `cc`, case-insensitive).
- **Sites** — which HTTPS sites the picker runs on; GitHub and GitLab are always listed, and you can add your own (e.g. self-hosted GitHub Enterprise or GitLab).
- **Labels** — the label list, with optional "sort by usage", descriptions, and per-item enable/disable.
- **Decorations** — the decoration list (e.g. `non-blocking`, `blocking`).
- **Advanced** — restore factory defaults.

## Build

Requires [Bun](https://bun.sh/) and [Node.js](https://nodejs.org/) 24+ (CI runs Node 24).

```bash
bun install
bun run build
```

This builds the content script, the background worker, and the Vue options and popup pages, then emits two targets:

- `dist/chromium/` — load as an unpacked extension in Chrome or Edge.
- `dist/firefox-mv3/` — the same bundles with a Firefox-merged manifest (`background.scripts` instead of `service_worker`, plus `browser_specific_settings.gecko`).

On push to `main`, CI zips both targets into versioned artifacts (e.g. `conventional-comments-chromium-v0.0.1.zip`, `conventional-comments-firefox-v0.0.1.zip`) and publishes a GitHub Release tagged `v<version>` with both attached.

### Load in Chrome / Edge

`chrome://extensions` → enable **Developer mode** → **Load unpacked** → select `dist/chromium`.

### Load in Firefox

`about:debugging` → **This Firefox** → **Load Temporary Add-on** → pick `dist/firefox-mv3/manifest.json`. The minimum supported Firefox is 109 (`strict_min_version`, set in `manifests/manifest.firefox.json`).

## Develop

```bash
bun run lint          # ESLint (JS/TS + Vue)
bun run format        # Prettier (format:check to verify only)
bun run test          # typecheck + the Playwright fixture/unit suite
bun run test:e2e      # build dist, then drive the real packaged extension in Chromium
bun run validate      # parse-check the manifests and verify the version is semver
```

`bun run test` and `bun run test:e2e` are separate: the first is the fast inner loop (logic-level, no real extension); the second loads `dist/chromium` into Chromium and exercises the real service-worker injection path.

## Manifests

The shared base is `manifests/manifest.base.json`; the Chromium and Firefox manifests are produced at build time by deep-merging it with `manifests/manifest.chromium.json` and `manifests/manifest.firefox.json` respectively (`scripts/merge-manifest.mjs`). The `dist/` directory is generated and should not be committed.
