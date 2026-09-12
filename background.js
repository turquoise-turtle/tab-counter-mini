/* background.js
 * Originally created 3/10/2017 by DaAwesomeP
 * This is the background task file of the extension
 * https://github.com/DaAwesomeP/tab-counter
 *
 * Copyright 2017-present DaAwesomeP
 *
 * Modified 2026: removed underscore import and inlined debounce; added
 * formatBadgeText() using scaled suffixes (1k, 1.2k, 1M etc.) for counts
 * above 999; moved source to project root; changed var to const/let; added
 * Object.prototype.hasOwnProperty guards; added windows.onCreated/onRemoved/
 * onFocusChanged listeners; tooltip always shows exact count separately from
 * the formatted badge text.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/**
 * Minimal debounce. Supports the `leading` option used for tab-activation
 * updates (shows the count immediately on the leading edge, then suppresses
 * repeated calls within the delay window).
 *
 * Replaces the `underscore` npm dependency, which was the sole reason the
 * extension required a Browserify/Babel build pipeline.
 *
 * @param {Function} fn
 * @param {number}   delay   milliseconds
 * @param {object}   [opts]
 * @param {boolean}  [opts.leading=false]
 * @returns {Function}
 */
function debounce(fn, delay, { leading = false } = {}) {
  let timer = null
  return function (...args) {
    const callNow = leading && timer === null
    clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      if (!leading) fn.apply(this, args)
    }, delay)
    if (callNow) fn.apply(this, args)
  }
}

/**
 * Format a tab/window count for display in the badge.
 *
 * Toolbar badges fit roughly four characters. Counts above 999 are rendered
 * using scaled suffixes: 1k, 1.2k, 3.8k, 1M etc. The exact count is always
 * available in the toolbar-button tooltip.
 *
 * @param {number} n
 * @returns {string}
 */
function formatBadgeText(n) {
  if (n < 1000) return String(n)
  if (n < 1000000) return Math.floor(n / 100) / 10 + 'k'
  return Math.floor(n / 100000) / 10 + 'M'
}

// ---------------------------------------------------------------------------
// Core badge update
// ---------------------------------------------------------------------------

const updateIcon = async function updateIcon() {
  // Get settings
  const settings = await browser.storage.local.get()

  // Get tab counter setting (default: current-window count)
  const counterPreference = settings.counter !== undefined ? settings.counter : 0

  // Nothing to do if badge is disabled
  if (counterPreference === 3) return

  // Active tab in the current window — badge is set per-tab so it shows the
  // right count for whichever window the user is looking at.
  const currentTab = (await browser.tabs.query({ currentWindow: true, active: true }))[0]

  // Collect counts (kept as numbers; formatted only at the display call)
  const currentWindowCount = (await browser.tabs.query({ currentWindow: true })).length
  const allTabsCount = (await browser.tabs.query({})).length
  const allWindowsCount = (await browser.windows.getAll({ populate: false, windowTypes: ['normal'] })).length

  if (typeof currentTab === 'undefined') return

  // Determine badge text based on user preference.
  // Mode 2 ("both") combines two numbers; each component is individually
  // capped so neither half overflows the badge on its own.
  let text
  if (counterPreference === 0) text = formatBadgeText(currentWindowCount)
  else if (counterPreference === 1) text = formatBadgeText(allTabsCount)
  else if (counterPreference === 2) text = `${formatBadgeText(currentWindowCount)}/${formatBadgeText(allTabsCount)}`
  else if (counterPreference === 4) text = formatBadgeText(allWindowsCount)

  // Update badge text on the toolbar button for the active tab
  browser.action.setBadgeText({ text, tabId: currentTab.id })

  // Tooltip always shows exact counts so users with many tabs can read the
  // real number even though the badge shows an abbreviated value.
  browser.action.setTitle({
    title: `Tab Counter\nTabs in this window:  ${currentWindowCount}\nTabs in all windows: ${allTabsCount}\nNumber of windows:   ${allWindowsCount}`,
    tabId: currentTab.id
  })
}

// ---------------------------------------------------------------------------
// Debounced update variants
// ---------------------------------------------------------------------------

// General updates: wait 250 ms after the last event before recomputing.
// This prevents a flood of queries during bulk operations (e.g. session restore).
const lazyUpdateIcon = debounce(updateIcon, 250)

// Tab-activation updates: fire immediately on the leading edge so the badge
// feels responsive when switching tabs, then suppress for 1 s afterwards.
const lazyActivateUpdateIcon = debounce(updateIcon, 1000, { leading: true })

// onActivated fires slightly before onRemoved, so a removed tab is still
// counted. Waiting 150 ms lets the removal complete first.
const update = function update() { setTimeout(lazyUpdateIcon, 150) }

// ---------------------------------------------------------------------------
// Icon paths
// ---------------------------------------------------------------------------

// Chrome cannot rasterize SVG for action icons, so every icon "style" is
// shipped as a pre-rendered PNG set instead. Sizes match the existing
// icons/tabcounter-*.png assets.
const ICON_SIZES = [16, 32, 38, 64, 96, 128]

function iconPathMap(base) {
  const map = {}
  for (const size of ICON_SIZES) {
    // "clear" reuses the single 1x1 transparent pixel at every size — an
    // established trick for a badge-only, no-visible-icon style.
    map[size] = base === 'clear' ? 'icons/clear-1.png' : `icons/${base}-${size}.png`
  }
  return map
}

// ---------------------------------------------------------------------------
// Initialisation badge
// ---------------------------------------------------------------------------

// Neutral gray rather than black: a black badge blends into the toolbar and
// becomes invisible in a dark browser theme, before checkSettings() applies
// the user's actual (or default) badge color a moment later.
browser.action.setBadgeText({ text: 'wait' })
browser.action.setBadgeBackgroundColor({ color: '#999999' })

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

const tabOnActivatedHandler = function tabOnActivatedHandler() {
  update()
  lazyActivateUpdateIcon()
}

// Registered unconditionally and synchronously at the top level (rather than
// after an async settings load) so Chrome's MV3 service worker — which can be
// evicted and re-spawned at any time — always re-attaches these listeners on
// the very first turn of the event loop. updateIcon() already no-ops when the
// counter is disabled, so a live listener costs one cheap storage read per
// event instead of needing a separate attach/detach dance.
browser.tabs.onActivated.addListener(tabOnActivatedHandler)
browser.tabs.onAttached.addListener(update)
browser.tabs.onCreated.addListener(update)
browser.tabs.onDetached.addListener(update)
browser.tabs.onMoved.addListener(update)
browser.tabs.onReplaced.addListener(update)
browser.tabs.onRemoved.addListener(update)
browser.tabs.onUpdated.addListener(update)
browser.windows.onCreated.addListener(update)
browser.windows.onRemoved.addListener(update)
browser.windows.onFocusChanged.addListener(update)

// ---------------------------------------------------------------------------
// Settings application
// ---------------------------------------------------------------------------

const checkSettings = async function checkSettings() {
  let settings = await browser.storage.local.get()

  // getBrowserInfo is Firefox-specific; guard for environments where it may
  // not exist (e.g. automated test harnesses).
  let browserInfo
  if (Object.prototype.hasOwnProperty.call(browser.runtime, 'getBrowserInfo')) {
    browserInfo = await browser.runtime.getBrowserInfo()
  } else {
    browserInfo = { version: '0', vendor: '', name: '' }
  }
  const browserVersionSplit = browserInfo.version.split('.').map((n) => parseInt(n, 10))

  // First-run defaults
  if (!Object.prototype.hasOwnProperty.call(settings, 'version')) {
    settings = {
      version: '0.0.0',
      icon: 'auto',
      counter: 0,
      badgeColor: '#999999'
    }
  }

  // Incremental settings migrations
  if (settings.version !== browser.runtime.getManifest().version) {
    const versionSplit = settings.version.split('.').map((n) => parseInt(n, 10))

    // v0.3.0: icons now adapt to theme; reset icon setting
    if (versionSplit[0] === 0 && versionSplit[1] < 3) settings.icon = 'auto'

    // v0.6.0: icon setting moved from an SVG filename to a base name backing
    // a PNG size map (SVG can't be used as a Chrome action icon). The old
    // default SVG was theme-adaptive in Firefox via context-fill, so it maps
    // to 'auto' rather than to a static PNG, which would be a regression.
    if (versionSplit[0] === 0 && versionSplit[1] < 6) {
      if (Object.prototype.hasOwnProperty.call(settings, 'icon')) {
        settings.icon = settings.icon === 'tabcounter.plain.min.svg'
          ? 'auto'
          : settings.icon.replace(/\.plain\.min\.svg$/, '')
      }
    }

    // v0.3.0: disable the "both" counter option (four-character badge limit)
    if (versionSplit[0] === 0 && versionSplit[1] < 3) {
      if (Object.prototype.hasOwnProperty.call(settings, 'counter')) {
        if (settings.counter === 2) settings.counter = 0
      }
    }

    // v0.4.0: add badgeTextColor support for Firefox 63+
    if (
      versionSplit[0] === 0 && versionSplit[1] < 4 &&
      browserInfo.vendor === 'Mozilla' && browserInfo.name === 'Firefox' &&
      browserVersionSplit[0] >= 63
    ) {
      settings.badgeTextColorAuto = true
      settings.badgeTextColor = '#000000'
    }
  }

  browser.storage.local.set(Object.assign(settings, {
    version: browser.runtime.getManifest().version
  }))

  // Apply badge background colour
  if (Object.prototype.hasOwnProperty.call(settings, 'badgeColor')) {
    browser.action.setBadgeBackgroundColor({ color: settings.badgeColor })
  } else {
    browser.action.setBadgeBackgroundColor({ color: '#999999' })
  }

  // Apply badge text colour
  if (Object.prototype.hasOwnProperty.call(settings, 'badgeTextColor')) {
    if (settings.badgeTextColorAuto !== true) {
      browser.action.setBadgeTextColor({ color: settings.badgeTextColor })
    } else {
      browser.action.setBadgeTextColor({ color: null })
    }
  }

  // Apply icon. 'auto' hands control back to the manifest, which is what lets
  // Firefox's theme_icons switch between the light and dark variants on its
  // own; Chrome ignores theme_icons and keeps the manifest default_icon.
  const iconPreference = Object.prototype.hasOwnProperty.call(settings, 'icon')
    ? settings.icon
    : 'auto'

  if (iconPreference === 'auto') {
    try {
      // Firefox resets to the manifest icon on a null path.
      await browser.action.setIcon({ path: null })
    } catch {
      // Chrome rejects a null path, so name the manifest default explicitly —
      // same image, it just cannot be un-set.
      await browser.action.setIcon({ path: iconPathMap('tabcounter') })
    }
  } else {
    browser.action.setIcon({ path: iconPathMap(iconPreference) })
  }

  const counterPreference = Object.prototype.hasOwnProperty.call(settings, 'counter')
    ? settings.counter
    : 0

  if (counterPreference === 3) {
    // Badge disabled: clear any badge text/title that was previously set
    // per-tab. The tab/window listeners stay attached (see top-level
    // registration above) — updateIcon() itself no-ops while disabled.
    browser.action.setBadgeText({ text: '' })
    browser.action.setTitle({ title: 'Tab Counter' })

    const allTabs = await browser.tabs.query({})
    allTabs.forEach((tab) => {
      browser.action.setBadgeText({ text: '', tabId: tab.id })
      browser.action.setTitle({ title: 'Tab Counter', tabId: tab.id })
    })
  }
}

// ---------------------------------------------------------------------------
// Startup and messaging
// ---------------------------------------------------------------------------

const applyAll = async function applyAll() {
  await checkSettings()
  await update()
}
applyAll()

const messageHandler = async function messageHandler(request) {
  if (Object.prototype.hasOwnProperty.call(request, 'updateSettings')) {
    if (request.updateSettings) applyAll()
  }
}
browser.runtime.onMessage.addListener(messageHandler)
