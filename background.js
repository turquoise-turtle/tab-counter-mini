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
 * Firefox badges fit roughly four characters. Counts above 999 are rendered
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
  browser.browserAction.setBadgeText({ text, tabId: currentTab.id })

  // Tooltip always shows exact counts so users with many tabs can read the
  // real number even though the badge shows an abbreviated value.
  browser.browserAction.setTitle({
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
// Initialisation badge
// ---------------------------------------------------------------------------

browser.browserAction.setBadgeText({ text: 'wait' })
browser.browserAction.setBadgeBackgroundColor({ color: '#000000' })

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

const tabOnActivatedHandler = function tabOnActivatedHandler() {
  update()
  lazyActivateUpdateIcon()
}

// ---------------------------------------------------------------------------
// Settings application
// ---------------------------------------------------------------------------

const checkSettings = async function checkSettings(settingsUpdate) {
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
      icon: 'tabcounter.plain.min.svg',
      counter: 0,
      badgeColor: '#999999'
    }
  }

  // Incremental settings migrations
  if (settings.version !== browser.runtime.getManifest().version) {
    const versionSplit = settings.version.split('.').map((n) => parseInt(n, 10))

    // v0.3.0: icons now adapt to theme; reset icon setting
    if (versionSplit[0] === 0 && versionSplit[1] < 3) settings.icon = 'tabcounter.plain.min.svg'

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
    browser.browserAction.setBadgeBackgroundColor({ color: settings.badgeColor })
  } else {
    browser.browserAction.setBadgeBackgroundColor({ color: '#000000' })
  }

  // Apply badge text colour (Firefox 63+)
  if (Object.prototype.hasOwnProperty.call(settings, 'badgeTextColor')) {
    if (settings.badgeTextColorAuto !== true) {
      browser.browserAction.setBadgeTextColor({ color: settings.badgeTextColor })
    } else {
      browser.browserAction.setBadgeTextColor({ color: null })
    }
  }

  // Apply icon
  if (Object.prototype.hasOwnProperty.call(settings, 'icon')) {
    browser.browserAction.setIcon({ path: `icons/${settings.icon}` })
  } else {
    browser.browserAction.setIcon({ path: 'icons/tabcounter.plain.min.svg' })
  }

  const counterPreference = Object.prototype.hasOwnProperty.call(settings, 'counter')
    ? settings.counter
    : 0

  if (counterPreference !== 3) {
    // Register event listeners after a delay on browser startup so we do not
    // flood the tabs API during session restore. When triggered by a settings
    // update (not startup) add listeners immediately.
    setTimeout(() => {
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
    }, settingsUpdate ? 1 : 5000)
  } else {
    // Remove all listeners when badge is disabled
    browser.tabs.onActivated.removeListener(tabOnActivatedHandler)
    browser.tabs.onAttached.removeListener(update)
    browser.tabs.onCreated.removeListener(update)
    browser.tabs.onDetached.removeListener(update)
    browser.tabs.onMoved.removeListener(update)
    browser.tabs.onReplaced.removeListener(update)
    browser.tabs.onRemoved.removeListener(update)
    browser.tabs.onUpdated.removeListener(update)
    browser.windows.onCreated.removeListener(update)
    browser.windows.onRemoved.removeListener(update)
    browser.windows.onFocusChanged.removeListener(update)

    // Clear any badge text that was previously set per-tab
    browser.browserAction.setBadgeText({ text: '' })
    browser.browserAction.setTitle({ title: 'Tab Counter' })

    const allTabs = await browser.tabs.query({})
    allTabs.forEach((tab) => {
      browser.browserAction.setBadgeText({ text: '', tabId: tab.id })
      browser.browserAction.setTitle({ title: 'Tab Counter', tabId: tab.id })
    })
  }
}

// ---------------------------------------------------------------------------
// Startup and messaging
// ---------------------------------------------------------------------------

const applyAll = async function applyAll(settingsUpdate) {
  await checkSettings(settingsUpdate)
  await update()
}
applyAll()

const messageHandler = async function messageHandler(request) {
  if (Object.prototype.hasOwnProperty.call(request, 'updateSettings')) {
    if (request.updateSettings) applyAll(true)
  }
}
browser.runtime.onMessage.addListener(messageHandler)
