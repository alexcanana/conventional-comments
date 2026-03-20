# Conventional Comments for GitLab and GitHub

## Description

Browser extension (Chrome, Edge, Firefox) that offers autocomplete for [Conventional Comments](https://conventionalcomments.org/) labels and decorations when you write merge request or pull request comments on GitLab and GitHub.

## Features

- Autocomplete dropdown when you type a configurable trigger in comment textareas (MR/PR conversation, files, and changes views where supported).
- **GitLab** and **GitHub** support with styling that matches each host where possible.
- **Options:** custom trigger text (default `cc`), allowed origins (exact HTTPS only), and optional debug logging.
- **Firefox** and **Chromium-class** builds from a shared codebase (Manifest V3); Firefox uses a script-based background entry as required by the platform.

## Usage

Load the extension in your browser.

Open the extension **options** to set:

- **Trigger** — substring that opens the menu (default `cc`).
- **Allowed origins** — exact origins such as `https://gitlab.com` or `https://github.com` (no wildcards, paths, query strings, or hashes).
- **Debug** — extra console logging for matching and injection.

**Save** is enabled only when settings are valid and changed.

## Build

Requires [Node.js](https://nodejs.org/) and a `zip` command (common on macOS and Linux).

```bash
npm run build
```

This copies sources into `dist/chromium` and `dist/firefox-mv3`, merges manifests from `manifests/`, and writes versioned zips in `dist/`, for example `conventional-comments-chromium-v0.2.1.zip` and `conventional-comments-firefox-mv3-v0.2.1.zip`.

Single target:

```bash
npm run build:chromium
npm run build:firefox
```

Validate manifest JSON and the base version before building (also run in CI):

```bash
npm run validate
```

Manifest sources live under `manifests/` (`manifest.base.mv3.json` plus browser-specific overlays). Edit them, then run `npm run build` again. The `dist/` directory is generated and should not be committed.
