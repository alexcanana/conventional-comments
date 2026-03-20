# Conventional Comments for GitLab and GitHub

## Description

Browser extension (Chrome, Edge, Firefox) that offers autocomplete for [Conventional Comments](https://conventionalcomments.org/) labels and decorations when you write merge request or pull request comments on GitLab and GitHub.

## Features

- Autocomplete dropdown when you type a configurable trigger in comment textareas (MR/PR conversation, files, and changes views where supported).
- **GitLab** and **GitHub** support with styling that matches each host where possible.
- **Options:** trigger word, allowed HTTPS origins, labels/decorations, optional debug logging, and reset.
- **Firefox** and **Chromium-class** builds from a shared codebase (Manifest V3); Firefox uses a script-based background entry as required by the platform.

## Usage

Install the extension, then open **Options**.

- **Trigger & origins** — keyword that opens the picker (default `cc`) and which HTTPS sites may inject the script.
- **Labels** — label list, optional “sort by usage”, and decorations.
- **Advanced** — debug logging in the console and restoring factory defaults.

**Save** works when the form is valid and something changed.

## Build

Requires [Node.js](https://nodejs.org/) and a `zip` command (common on macOS and Linux).

```bash
npm run build
```

This copies sources into `dist/chromium` and `dist/firefox-mv3`, merges manifests from `manifests/`, and writes versioned zips in `dist/`, for example `conventional-comments-chromium-v0.1.0.zip` and `conventional-comments-firefox-mv3-v0.1.0.zip`.

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
