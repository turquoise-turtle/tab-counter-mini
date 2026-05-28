# Changelog

## [0.5.0] — 2026-05-27 (maintenance release)

### Fixed

- **Toolbar button placement** — `browser_action` was declared with `"default_area": "tabstrip"`, which placed the button inside the tab strip. With Firefox's vertical tabs feature the tab strip moves into the sidebar, making the badge invisible. Changed to `"navbar"` so the button is always on the main toolbar regardless of tab orientation.
- **Badge overflow for large tab counts** — counts above 999 are now abbreviated using scaled suffixes: `1k`, `1.2k`, `3.8k`, `1.2M` etc. Previously the raw number was passed through, producing text too wide for the badge area. The exact count is always available in the toolbar button tooltip.

### Changed

- **Tooltip shows exact count** — the toolbar button title (shown on hover) now always displays the precise tab count, even when the badge shows an abbreviated value like `1.2k`.
- **Manifest consolidated** — `manifest.firefox.json` and `manifest.opera.json` replaced by a single `manifest.json`. The `applications` key updated to the current `browser_specific_settings`. Minimum Firefox version raised to 63.0 (required for `setBadgeTextColor`, which was already being called).
- **Permissions explicit** — added `"tabs"` permission to the manifest to correctly declare use of the tabs API.
- **Options page copy updated** — badge overflow note updated to describe scaled suffix behaviour; Opera-specific icon option removed.

### Removed

- **Gulp build pipeline** — `gulpfile.js`, `gulp`, `gulp-bro`, `gulp-eslint`, `gulp-line-ending-corrector`, `gulp-rename`, `gulp-sourcemaps`, `gulp-zip`, `del`, `babelify` removed entirely.
- **Babel transpilation** — `.babelrc`, `@babel/core`, `@babel/polyfill`, `@babel/preset-env` removed. The extension runs directly in Firefox without a compilation step.
- **`underscore` runtime dependency** — used only for `debounce`. Replaced with a minimal (~15 line) inline implementation, eliminating the need for Browserify bundling.
- **`webextension-polyfill` runtime dependency** — used only for Opera compatibility. Firefox provides the `browser` global natively.
- **Opera support** — `manifest.opera.json`, Opera-specific icon option, polyfill loading shims in `popup.js` and `options.js` all removed.
- **Travis CI** — `.travis.yml` removed.
- **`src/` build directory** — source files moved to the project root; `dist/` output directory no longer exists.
- **`.browserslistrc`** — not needed without a transpiler.

### Developer workflow

Replaced Gulp with `web-ext` (Mozilla's official extension CLI):

| Old command       | New command       |
|-------------------|-------------------|
| `npm run build`   | `npm run build`   |
| `npm run check`   | `npm run lint`    |
| `npm run watch`   | `npm run start`   |

`npm install` now installs one dev dependency (`web-ext`) instead of ~20.

---

## [0.4.1] — 2018-10-11

Previous release. See repository history for earlier changes.
