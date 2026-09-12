# Changelog

## [0.6.0] — 2026-09-12 (Chrome support)

### Added

- **Chrome support** — migrated to Manifest V3 (`browser_action` → `action`, non-persistent event-page background instead of a persistent background page) and added `make_chrome_manifest.py`, a small script that rewrites the Firefox-shaped `manifest.json` into a Chrome-compatible one (`background.scripts` → `background.service_worker`, drops Firefox-only `browser_specific_settings`, sets `minimum_chrome_version`). The extension still calls the native `browser.*` API in both browsers — no `chrome.*` rewrite or polyfill — relying on Chrome's own native promise-based `browser` namespace.
- **`generate_icon_variants.py`** — one-off script that rasterizes the icon color-variant SVGs to PNG, since Chrome cannot use SVG for toolbar action icons.

- **Automatic icon mode** — new default "Automatic" icon style leaves the manifest in charge of the toolbar icon instead of overriding it at runtime, which is what lets Firefox's `theme_icons` switch between the light and dark variants by itself. Chrome has no manifest equivalent and keeps the default icon. Existing installs using the old default SVG (theme-adaptive via `context-fill`) migrate to this mode rather than to a static PNG.

### Fixed

- **Toolbar icon not rendering in Chrome** — `default_icon` pointed at an SVG, which Chrome cannot rasterize for action icons; it now points at a PNG size map. The options page's "Icon Color & Style" picker likewise now switches between pre-rendered PNGs instead of SVGs at runtime.
- **Initial badge invisible in dark themes** — the placeholder badge shown before settings load used a pure black background, which disappeared against a dark toolbar. Now a neutral gray.
- **Popup and options page layout** — the popup had no minimum width, so its title and labels wrapped onto several lines; the options page forced a 400px minimum on every table cell, making it far wider than the space Chrome gives it. Both now size sensibly.
- **Firefox-specific wording** — options page copy no longer describes browser-neutral features as Firefox-only.
- **Popup rendering in serif on Firefox** — MV3 dropped `browser_style`, which is what used to apply Firefox's own extension stylesheet; the popup and options page now set their own system font and declare `color-scheme: light dark` so they follow the browser theme.
- **Manifest warnings on Firefox** — removed `action.browser_style` (unsupported in MV3) and `browser_specific_settings.gecko_android.data_collection_permissions` (only valid under `gecko`).

### Changed

- **Minimum Firefox version raised to 109.0** — the version that shipped Manifest V3 general availability, including the `action` manifest key and API the extension now uses. The previous floor of 63.0 dated from the MV2 era and could not run this build at all. Android stays at 120.0.
- **Background page is no longer persistent** — the 11 tab/window listeners are now registered synchronously at top level on every script evaluation instead of behind an async settings load and a 5-second startup delay. This is required for Chrome's MV3 service worker (which can be evicted and re-spawned at any time) and also lowers idle memory/CPU usage in Firefox.

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

---

## [0.4.1] — 2018-10-11

Previous release. See repository history for earlier changes.
