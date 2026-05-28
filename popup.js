/* popup.js
 * Originally created 3/10/2017 by DaAwesomeP
 * This is the popup script file
 * https://github.com/DaAwesomeP/tab-counter
 *
 * Copyright 2017-present DaAwesomeP
 *
 * Modified 2026: removed Opera/webextension-polyfill shim; changed var to
 * const; counts kept as numbers and converted to strings at display time;
 * moved source to project root.
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

async function start () {
  const currentWindow = (await browser.tabs.query({ currentWindow: true })).length
  const allTabs = (await browser.tabs.query({})).length
  const allWindows = (await browser.windows.getAll({ populate: false, windowTypes: ['normal'] })).length

  document.getElementById('currentWindow').textContent = currentWindow
  document.getElementById('allTabs').textContent = allTabs
  document.getElementById('allWindows').textContent = allWindows
}

start()
