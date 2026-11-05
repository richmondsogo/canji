// src/background.js
import { RatesEngine, calculateRate, convertAmount, getOfflineFallbackData } from './shared/rates.js';
import { SettingsManager, DEFAULT_SETTINGS, getSiteMode, getSiteCurrencies, shouldAutoConvertPage, normalizeHost } from './shared/settings.js';
import { formatCurrency } from './shared/format.js';
import { detectCurrency, extractAmount } from './shared/parser.js';
import { MSG } from './shared/messaging.js';
import { getBrowser, sendTabMessage, ensureInjected, injectContentScript } from './shared/browser.js';

const api = getBrowser();
const ratesEngine = new RatesEngine();
const settingsManager = new SettingsManager();

// Cache of active tab status: tabId -> { isConverted, count, targetCurrency }
const tabStatusMap = new Map();
// Session-scoped set of hostnames where the user dismissed the Ask Mode offer prompt
const DISMISSED_OFFERS_SESSION_KEY = 'canji_dismissed_offer_hosts_v1';
const dismissedOfferHosts = new Set();
let dismissedOffersHydrated = false;

async function ensureDismissedOffersLoaded() {
  if (dismissedOffersHydrated) return;
  dismissedOffersHydrated = true;
  try {
    if (api && api.storage && api.storage.session) {
      const data = await api.storage.session.get(DISMISSED_OFFERS_SESSION_KEY);
      const list = data && data[DISMISSED_OFFERS_SESSION_KEY];
      if (Array.isArray(list)) {
        for (const h of list) {
          if (typeof h === 'string' && h) dismissedOfferHosts.add(h);
        }
      }
    }
  } catch {
    // Fallback to in-memory Set if storage.session is unavailable
  }
}

async function saveDismissedOffers() {
  try {
    if (api && api.storage && api.storage.session) {
      await api.storage.session.set({
        [DISMISSED_OFFERS_SESSION_KEY]: Array.from(dismissedOfferHosts)
      });
    }
  } catch {
    // Non-fatal
  }
}

// -----------------------------------------------------------------------------
// 1. NOTIFICATIONS
// -----------------------------------------------------------------------------
function notify(title, message) {
  if (!api || !api.notifications) return;
  const notifId = `cc-notif-${Date.now()}`;
  try {
    api.notifications.create(notifId, {
      type: 'basic',
      iconUrl: api.runtime.getURL('icons/icon48.png'),
      title,
      message
    }, () => {
      if (api.runtime.lastError) {
        // Ignored
      }
    });
  } catch (err) {
    console.warn('[Canji] Notification failed:', err);
  }
}

// -----------------------------------------------------------------------------
// 2. CONTEXT MENUS (Selection conversion + Page-level actions)
// -----------------------------------------------------------------------------
async function buildMenus() {
  if (!api || !api.contextMenus) return;

  api.contextMenus.removeAll(async () => {
    try {
      const settings = await settingsManager.getSettings();
      const pinned = settings.pinnedCurrencies || DEFAULT_SETTINGS.pinnedCurrencies;
      const defaultTarget = settings.targetCurrency || 'USD';

      // 1. Selection Parent Menu (v1 compatibility)
      api.contextMenus.create({
        id: 'cc-parent',
        title: 'Convert currency',
        contexts: ['selection']
      }, () => {
        if (api.runtime.lastError) {}
      });

      // Selection submenus for pinned currencies
      for (const cur of pinned) {
        api.contextMenus.create({
          id: `cc-sel-${cur}`,
          parentId: 'cc-parent',
          title: `To ${cur}`,
          contexts: ['selection']
        }, () => {
          if (api.runtime.lastError) {}
        });
      }

      // 2. Page-level Actions
      api.contextMenus.create({
        id: 'cc-page-convert',
        title: `Convert prices on this page to ${defaultTarget}`,
        contexts: ['page']
      }, () => {
        if (api.runtime.lastError) {}
      });

      api.contextMenus.create({
        id: 'cc-page-revert',
        title: 'Show original prices',
        contexts: ['page']
      }, () => {
        if (api.runtime.lastError) {}
      });
    } catch (err) {
      console.warn('[Canji] Failed to build context menus:', err);
    }
  });
}

// -----------------------------------------------------------------------------
// 3. PAGE INJECTION & CONVERSION ORCHESTRATION
// -----------------------------------------------------------------------------
function extractNormalizedHost(rawUrl) {
  if (!rawUrl) return '';
  try {
    const u = new URL(rawUrl);
    return u.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

async function sendTabMessageWithRetry(tabId, message, maxAttempts = 4) {
  let response = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      response = await sendTabMessage(tabId, message);
      if (response !== null && response !== undefined) {
        return response;
      }
    } catch {}
    if (attempt === 1) {
      await injectContentScript(tabId);
    }
    await new Promise((r) => setTimeout(r, 90 * (2 ** (attempt - 1))));
  }
  return response;
}

async function convertPageOnTab(tabId, targetCurrency = null, tabUrl = null) {
  const injected = await ensureInjected(tabId);
  if (!injected) return;

  const settings = await settingsManager.getSettings();
  const host = extractNormalizedHost(tabUrl);
  const { assumedCurrency: siteOverride, targetCurrency: siteTarget } = getSiteCurrencies(settings, host);
  const target = targetCurrency || siteTarget || settings.targetCurrency || 'USD';
  let ratesData;
  try {
    ratesData = await ratesEngine.getRates();
  } catch (err) {
    console.warn('[Canji] getRates failed, using fallback:', err.message);
    ratesData = getOfflineFallbackData();
  }

  const response = await sendTabMessageWithRetry(tabId, {
    type: MSG.CONVERT_PAGE,
    payload: {
      targetCurrency: target,
      ratesTable: ratesData ? ratesData.rates : null,
      rateDate: ratesData ? ratesData.date : null,
      provider: ratesData ? ratesData.provider : null,
      displayMode: settings.displayMode,
      roundWhole: settings.roundWhole,
      showInPageBar: settings.showInPageBar,
      siteOverride: siteOverride || undefined,
      ambiguousDollarSetting: settings.ambiguousDollar || 'USD'
    }
  });

  if (response && response.success) {
    tabStatusMap.set(tabId, {
      isConverted: true,
      count: response.count,
      targetCurrency: target
    });
  }
}

async function offerPageOnTab(tabId, targetCurrency = null, tabUrl = null) {
  const injected = await ensureInjected(tabId);
  if (!injected) return;

  const settings = await settingsManager.getSettings();
  const host = extractNormalizedHost(tabUrl);
  const { assumedCurrency: siteOverride, targetCurrency: siteTarget } = getSiteCurrencies(settings, host);
  const target = targetCurrency || siteTarget || settings.targetCurrency || 'USD';

  await sendTabMessageWithRetry(tabId, {
    type: MSG.OFFER_PAGE,
    payload: {
      targetCurrency: target,
      showInPageBar: settings.showInPageBar,
      siteOverride: siteOverride || undefined,
      ambiguousDollarSetting: settings.ambiguousDollar || 'USD'
    }
  });
}

async function revertPageOnTab(tabId) {
  const response = await sendTabMessage(tabId, { type: MSG.REVERT_PAGE });
  if (response && response.success) {
    tabStatusMap.set(tabId, {
      isConverted: false,
      count: 0,
      targetCurrency: null
    });
  }
}

// -----------------------------------------------------------------------------
// 4. SELECTION CONVERSION (v1 feature)
// -----------------------------------------------------------------------------
async function handleSelectionConversion(text, targetCurrency, tabUrl = null) {
  const raw = (text || '').trim();
  if (!raw) {
    notify('Canji', 'No text selected. Highlight a price and try again.');
    return;
  }

  const amount = extractAmount(raw);
  if (amount === null) {
    notify('Canji', `Couldn't find a price in "${raw.slice(0, 40)}".`);
    return;
  }

  const settings = await settingsManager.getSettings();
  const host = extractNormalizedHost(tabUrl);
  const { assumedCurrency: siteOverride } = getSiteCurrencies(settings, host);
  const ambiguousDollarSetting = settings.ambiguousDollar || 'USD';
  const fromCurrency = detectCurrency(raw, {
    siteOverride,
    tld: host || undefined,
    ambiguousDollarSetting
  });

  try {
    const ratesData = await ratesEngine.getRates();
    const rate = calculateRate(fromCurrency, targetCurrency, ratesData.rates);
    const converted = amount * rate;

    const formattedFrom = formatCurrency(amount, fromCurrency);
    const formattedTo = formatCurrency(converted, targetCurrency, {
      roundWhole: Boolean(settings.roundWhole)
    });
    const formattedUnit = formatCurrency(rate, targetCurrency);

    notify(
      'Canji',
      `${formattedFrom} = ${formattedTo}\nRate: 1 ${fromCurrency} = ${formattedUnit}`
    );
  } catch (err) {
    console.error('[Canji] Selection conversion failed:', err);
    notify(
      'Canji',
      `Couldn't convert ${fromCurrency} to ${targetCurrency}. Check your internet connection.`
    );
  }
}

// -----------------------------------------------------------------------------
// 5. EVENT LISTENERS
// -----------------------------------------------------------------------------

// Context Menu Clicks
if (api && api.contextMenus && api.contextMenus.onClicked) {
  api.contextMenus.onClicked.addListener(async (info, tab) => {
    const menuId = info.menuItemId;

    // Selection conversion
    if (menuId.startsWith('cc-sel-')) {
      const targetCurrency = menuId.replace('cc-sel-', '');
      await handleSelectionConversion(info.selectionText, targetCurrency, tab?.url);
      return;
    }

    // Page level convert
    if (menuId === 'cc-page-convert' && tab && tab.id) {
      await convertPageOnTab(tab.id, null, tab.url);
      return;
    }

    // Page level revert
    if (menuId === 'cc-page-revert' && tab && tab.id) {
      await revertPageOnTab(tab.id);
      return;
    }
  });
}

// Runtime Messaging Dispatcher
if (api && api.runtime && api.runtime.onMessage) {
  api.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || !message.type) return;

    // Rates query
    if (message.type === MSG.GET_RATES) {
      ratesEngine.getRates()
        .then(ratesData => sendResponse(ratesData))
        .catch(err => sendResponse({ error: err.message }));
      return true;
    }

    // Settings query
    if (message.type === MSG.GET_SETTINGS) {
      settingsManager.getSettings()
        .then(settings => sendResponse(settings))
        .catch(err => sendResponse({ error: err.message }));
      return true;
    }

    // Settings update - restricted to extension internal pages (popup, options)
    if (message.type === MSG.UPDATE_SETTINGS) {
      const isInternal = sender.id === api.runtime.id && (!sender.url || sender.url.startsWith('chrome-extension://') || sender.url.startsWith('moz-extension://'));
      if (!isInternal) {
        sendResponse({ success: false, error: 'Unauthorized: Settings cannot be modified by content scripts' });
        return false;
      }
      settingsManager.updateSettings(message.payload || {})
        .then(updated => {
          buildMenus();
          sendResponse({ success: true, settings: updated });
        })
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true;
    }

    // Ask-mode offer prompt: user clicked [Always on this site]
    if (message.type === MSG.ACCEPT_ALWAYS_SITE) {
      const host = normalizeHost(message.payload?.hostname || extractNormalizedHost(sender?.tab?.url));
      if (!host) {
        sendResponse({ success: false, error: 'Invalid hostname' });
        return false;
      }
      settingsManager.setSiteMode(host, 'always')
        .then(async (updated) => {
          await ensureDismissedOffersLoaded();
          dismissedOfferHosts.delete(host);
          await saveDismissedOffers();
          buildMenus();
          sendResponse({ success: true, settings: updated });
        })
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true;
    }

    // Ask-mode offer prompt: user clicked [×] to dismiss offer for this session
    if (message.type === MSG.DISMISS_OFFER) {
      const host = normalizeHost(message.payload?.hostname || extractNormalizedHost(sender?.tab?.url));
      (async () => {
        if (host) {
          await ensureDismissedOffersLoaded();
          dismissedOfferHosts.add(host);
          await saveDismissedOffers();
        }
        sendResponse({ success: true });
      })();
      return true;
    }

    // Ask-mode offer eligibility check from content script
    if (message.type === MSG.CHECK_OFFER_ELIGIBILITY) {
      const host = normalizeHost(message.payload?.hostname || extractNormalizedHost(sender?.tab?.url));
      (async () => {
        await ensureDismissedOffersLoaded();
        const dismissed = Boolean(host && dismissedOfferHosts.has(host));
        sendResponse({ eligible: !dismissed, dismissed });
      })();
      return true;
    }

    // Page status reported by content script
    if (message.type === MSG.PAGE_STATUS) {
      if (sender && sender.tab && sender.tab.id) {
        tabStatusMap.set(sender.tab.id, message.payload);
      }
      sendResponse({ received: true });
      return false;
    }
  });
}

async function evaluateTabForAutoAction(tabId, rawUrl) {
  if (!tabId || !rawUrl || !rawUrl.startsWith('http')) return;
  try {
    await ensureDismissedOffersLoaded();
    const url = new URL(rawUrl);
    const settings = await settingsManager.getSettings();
    const { mode } = getSiteMode(settings, url.hostname);
    const { targetCurrency } = getSiteCurrencies(settings, url.hostname);
    const normHost = normalizeHost(url.hostname);

    if (mode === 'always') {
      await convertPageOnTab(tabId, targetCurrency, rawUrl);
    } else if (mode === 'ask' && normHost && !dismissedOfferHosts.has(normHost) && settings.showInPageBar !== false) {
      await offerPageOnTab(tabId, targetCurrency, rawUrl);
    }
  } catch (err) {
    console.error('[Canji] Auto-convert/offer failed on tab:', tabId, err);
  }
}

// tabs.onUpdated auto-convert ('always') & Ask-Mode offer prompt ('ask')
if (api && api.tabs && api.tabs.onUpdated) {
  api.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    const isComplete = changeInfo.status === 'complete';
    const isSpaUrlChange = Boolean(changeInfo.url && tab?.status === 'complete');
    if (isComplete || isSpaUrlChange) {
      const rawUrl = changeInfo.url || tab?.url;
      await evaluateTabForAutoAction(tabId, rawUrl);
    }
  });
}

// tabs.onActivated: ensure restored or switched-to tabs evaluate their site rule if not yet converted
if (api && api.tabs && api.tabs.onActivated) {
  api.tabs.onActivated.addListener(async (activeInfo) => {
    if (!activeInfo || !activeInfo.tabId || !api.tabs.get) return;
    try {
      const currentStatus = tabStatusMap.get(activeInfo.tabId);
      if (currentStatus && currentStatus.isConverted) return;
      const tab = await new Promise((resolve) => {
        try {
          const p = api.tabs.get(activeInfo.tabId);
          if (p && typeof p.then === 'function') {
            p.then(resolve).catch(() => resolve(null));
          } else {
            api.tabs.get(activeInfo.tabId, (t) => resolve(api.runtime?.lastError ? null : t));
          }
        } catch {
          resolve(null);
        }
      });
      if (tab && tab.status === 'complete' && tab.url && tab.url.startsWith('http')) {
        await evaluateTabForAutoAction(tab.id, tab.url);
      }
    } catch {}
  });
}

// Tab removal cleanup
if (api && api.tabs && api.tabs.onRemoved) {
  api.tabs.onRemoved.addListener((tabId) => {
    tabStatusMap.delete(tabId);
  });
}

async function evaluateActiveTabsOnStartup() {
  if (!api || !api.tabs || !api.tabs.query) return;
  try {
    const tabs = await new Promise((resolve) => {
      try {
        const p = api.tabs.query({ active: true });
        if (p && typeof p.then === 'function') {
          p.then(resolve).catch(() => resolve([]));
        } else {
          api.tabs.query({ active: true }, (res) => resolve(res || []));
        }
      } catch {
        resolve([]);
      }
    });
    for (const tab of tabs) {
      if (tab && tab.id && tab.url && tab.url.startsWith('http')) {
        void evaluateTabForAutoAction(tab.id, tab.url);
      }
    }
  } catch {}
}

// Startup & install hooks
if (api && api.runtime && api.runtime.onInstalled) {
  api.runtime.onInstalled.addListener(() => {
    buildMenus();
    if (api.scripting && api.scripting.unregisterContentScripts) {
      api.scripting.unregisterContentScripts({ ids: ['cc-autoconvert-sites'] }).catch(() => {});
    }
  });
}

if (api && api.runtime && api.runtime.onStartup) {
  api.runtime.onStartup.addListener(() => {
    buildMenus();
    if (api.scripting && api.scripting.unregisterContentScripts) {
      api.scripting.unregisterContentScripts({ ids: ['cc-autoconvert-sites'] }).catch(() => {});
    }
    void evaluateActiveTabsOnStartup();
  });
}
