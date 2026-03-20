# Conventional Comments for GitLab and GitHub

Browser extension (Chrome, Edge, Firefox) that adds conventional comment label/decorator autocomplete for GitLab merge requests and GitHub pull requests.

## Firefox

Use a recent Firefox (121+). The manifest lists both `background.service_worker` (Chrome/Edge) and `background.scripts` (Firefox); each browser picks the entry it supports.

1. Clone or unpack this repository.
2. Open `about:debugging` → **This Firefox** → **Load Temporary Add-on**.
3. Choose the project’s `manifest.json`.

For a permanent add-on id when publishing to [addons.mozilla.org](https://addons.mozilla.org/), change `browser_specific_settings.gecko.id` in `manifest.json` to your reserved id.

## Configuration

- Trigger text is configurable in extension options (default: `cc`).
- Allowed origins are exact HTTPS origins only (for example `https://gitlab.com` or `https://github.com`).
- Wildcards, paths, query strings, and hashes are not allowed in allowed origins.
- Debug mode can be enabled from options to log matching and injection decisions.
- Save is enabled only when settings are valid and changed.

## Unreleased

- Firefox MV3: dual `background` entries (`service_worker` + `scripts`) and `browser_specific_settings.gecko`
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
- reduce unnecessary dropdown reposition work

## 0.1.0

- fix `DEFAULT_TRIGGER is not defined`
- `Escape` in decorations goes back to label selection
- `Escape` in labels closes the dropdown
- configurable trigger text (default: `cc`)
