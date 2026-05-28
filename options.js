/* options.js
 * Originally created 3/11/2017 by DaAwesomeP
 * This is the options page script file
 * https://github.com/DaAwesomeP/tab-counter
 *
 * Copyright 2017-present DaAwesomeP
 *
 * Modified 2026: removed Opera/webextension-polyfill shim; changed var to
 * const/let; added null guard for missing option elements; moved source to
 * project root.
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

// Firefox always provides the `browser` global natively in extension contexts.
// The Opera/polyfill code path from the original has been removed since this
// extension now targets Firefox only.

let domReady = false
let browserReady = false
let restored = false

function checkBadgeColorManualSetting () {
  const autoSelect = document.querySelector('#badgeTextColorAuto').checked
  document.querySelector('#badgeTextColor').disabled = autoSelect
}

async function saveOptions () {
  checkBadgeColorManualSetting()
  const settings = await browser.storage.local.get()
  for (const setting in settings) {
    if (setting !== 'version') {
      const el = document.querySelector(`#${setting}`)
      if (!el) continue
      if (el.getAttribute('type') === 'checkbox') settings[setting] = el.checked
      else settings[setting] = el.value
      const optionType = el.getAttribute('optionType')
      if (optionType === 'number' && typeof settings[setting] !== 'number') {
        settings[setting] = parseInt(settings[setting], 10)
      } else if (optionType === 'string' && typeof settings[setting] !== 'string') {
        settings[setting] = settings[setting].toString()
      } else if (optionType === 'boolean' && typeof settings[setting] !== 'boolean') {
        settings[setting] = (settings[setting].toLowerCase() === 'true')
      }
    }
  }
  browser.storage.local.set(settings)
  await browser.runtime.sendMessage({ updateSettings: true })
}

async function restoreOptions () {
  restored = true
  const settings = await browser.storage.local.get()
  for (const setting in settings) {
    if (setting !== 'version') {
      const el = document.querySelector(`#${setting}`)
      if (!el) continue
      if (el.getAttribute('type') === 'checkbox') el.checked = settings[setting]
      else el.value = settings[setting]
      el.parentElement.parentElement.style.display = 'block'
    }
  }
  checkBadgeColorManualSetting()
}

function start () {
  browserReady = true
  if (domReady && !restored) restoreOptions()
  for (const el of document.querySelectorAll('input, select')) {
    el.addEventListener('change', saveOptions)
  }
}

document.addEventListener('DOMContentLoaded', () => {
  domReady = true
  if (browserReady && !restored) restoreOptions()
})

start()
