# tab-counter

[![Mozilla Add-on](https://img.shields.io/amo/v/tab-counter-mini.svg?style=flat-square)](https://addons.mozilla.org/en-US/firefox/addon/tab-counter-mini/)
[![Mozilla Add-on](https://img.shields.io/amo/d/tab-counter-mini.svg?style=flat-square)](https://addons.mozilla.org/en-US/firefox/addon/tab-counter-mini/)

A toolbar button badge that shows the number of tabs open in the current window (or across all windows, configurable). Works with both Firefox's classic horizontal tab bar and the newer vertical tabs sidebar.

## Install

**[Firefox Add-ons (AMO)](https://addons.mozilla.org/en-US/firefox/addon/tab-counter-mini/)** — recommended for most users.

## Badge behaviour

| Open tabs    | Badge shows |
|--------------|-------------|
| 0 – 999      | Exact count |
| 1,000–9,999  | e.g. `1k`, `3.8k`, `9.9k` |
| 10,000–999,999 | e.g. `10k`, `123k` |
| 1,000,000+   | e.g. `1M`, `1.2M` |

Hovering the toolbar button always shows the exact count in the tooltip, regardless of how many tabs are open.

## Development

### Prerequisites

- [Firefox](https://www.mozilla.org/firefox/)

### Setup

```bash
git clone https://github.com/turquoise-turtle/tab-counter-mini.git
cd tab-counter-mini
```

### Commands

The extension loads directly from source — no compilation or bundling step is required.

### What changed in v0.5.0 (maintenance release)

- Removed the Gulp + Browserify + Babel build pipeline entirely. The extension now runs directly in Firefox without transpilation.
- Removed the `underscore` and `webextension-polyfill` runtime dependencies. Debounce is inlined; Firefox provides the `browser` global natively.
- Replaced `manifest.firefox.json` + `manifest.opera.json` with a single canonical `manifest.json`.
- Changed `browser_action` placement from `tabstrip` to `navbar`, so the button stays on the toolbar when Firefox vertical tabs are enabled.
- Badge text for counts above 999 is abbreviated using scaled suffixes (`1k`, `3.8k`, `1.2M` etc.). The exact count is always in the tooltip.
- Dropped Opera support (extension was already Firefox-only on AMO).

## Options

Click the toolbar button to see a popup with current counts. Right-click → *Manage Extension* → *Preferences* to configure:

- **Counter mode** — current window, all windows, both, number of windows, or disabled
- **Badge colour**
- **Badge text colour** (Firefox 63+)
- **Icon style**

## License

[Apache 2.0](LICENSE)
