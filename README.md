# Conventional Comments for GitLab and GitHub

Browser extension (Chrome, Edge, Firefox) that adds conventional comment label/decorator autocomplete for GitLab merge requests and GitHub pull requests.

## Repository layout

Aligned with [multi-pass](https://github.com/M4n0x/multi-pass/tree/main):

| Path | Purpose |
|------|---------|
| [`src/`](src/) | Unpacked extension sources (`background.js`, nested `src/` for pages/content, …) — like `basic-auth-extension/` in [multi-pass](https://github.com/M4n0x/multi-pass/tree/main) |
| [`manifests/`](manifests/) | Manifest fragments merged per browser target |
| [`scripts/build.js`](scripts/build.js) | Copies sources into `dist/`, writes `manifest.json`, zips each target |
| `dist/` | **Build output** (gitignored): `dist/chromium`, `dist/firefox-mv3`, and versioned `.zip` files |

## Build

From the repo root (requires a `zip` CLI, as on macOS/Linux):

```bash
npm run build
```

Artifacts: `dist/chromium/`, `dist/firefox-mv3/`, and zips such as `conventional-comments-chromium-v0.2.1.zip` in `dist/`.

Single target:

```bash
npm run build:chromium
npm run build:firefox
```

## Load the extension locally

After `npm run build`:

- **Chrome / Edge:** Extensions → Developer mode → **Load unpacked** → choose `dist/chromium`.
- **Firefox:** `about:debugging` → **This Firefox** → **Load Temporary Add-on** → pick `dist/firefox-mv3/manifest.json` (see `strict_min_version` in `manifests/manifest.firefox.mv3.json`).

Chromium uses MV3 `background.service_worker` and loads shared code via `importScripts` in `background.js`. Firefox’s build merges in `background.scripts` (shared + routes + `background.js` in order) because `service_worker` is not used there—same as the pattern in [multi-pass](https://github.com/M4n0x/multi-pass/blob/main/manifests/manifest.firefox.mv3.json).

## Manifest layout

| File | Role |
|------|------|
| `manifests/manifest.base.mv3.json` | Shared MV3 fields |
| `manifests/manifest.chromium.json` | Chromium overlay (empty `{}` today) |
| `manifests/manifest.firefox.mv3.json` | Firefox: `browser_specific_settings.gecko` and `background.scripts` (replaces `service_worker`) |

Edit those files, then run `npm run build` again.

For a permanent add-on id when publishing to [addons.mozilla.org](https://addons.mozilla.org/), set `browser_specific_settings.gecko.id` in `manifests/manifest.firefox.mv3.json` and rebuild.

## Configuration

- Trigger text is configurable in extension options (default: `cc`).
- Allowed origins are exact HTTPS origins only (for example `https://gitlab.com` or `https://github.com`).
- Wildcards, paths, query strings, and hashes are not allowed in allowed origins.
- Debug mode can be enabled from options to log matching and injection decisions.
- Save is enabled only when settings are valid and changed.

## Unreleased

- repo layout aligned with multi-pass (`src/` sources, `dist/` builds + zips)
- Firefox MV3: `browser_specific_settings.gecko` (Chrome-compatible `service_worker` background only)
- split core runtime responsibilities into dedicated state, render, and bindings modules
- reduce dropdown/observer overhead with delegated handlers and earlier DOM short-circuiting
- improve dropdown accessibility with stable option IDs and `aria-activedescendant`

## 0.2.1

- fix shared route globals for MV3 service worker compatibility
- tune dropdown viewport to show a partial next item as a scroll hint
- align GitHub dropdown non-color styling with GitLab defaults

## 0.2.0

- split comment UI logic into a shared core with GitLab/GitHub platform adapters
- add GitHub support for pull request conversation, files, and changes tabs
- split dropdown styling into `styles/core.css`, `styles/gitlab.css`, and `styles/github.css`
- reset defaults now include both `https://gitlab.com` and `https://github.com`

## 0.1.3

- improve options UX: reordered fields, clearer helper copy, and version shown in footer
- require trigger text and add inline field errors
- disable Save when options are invalid or unchanged
- enforce exact HTTPS origin validation in options
- keep injection cache lifecycle safe across reload/navigation events

## 0.1.2

- avoid missed reinjection by resetting/cleaning tab injection cache
- filter MR history-state events to reduce unnecessary injection checks

## 0.1.1

- add storage fallbacks for trigger and allowed patterns
- harden trigger matching by escaping regex characters
- reduce dropdown reposition work

## 0.1.0

- fix `DEFAULT_TRIGGER is not defined`
- `Escape` in decorations goes back to label selection
- `Escape` in labels closes the dropdown
- configurable trigger text (default: `cc`)
