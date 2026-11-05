// src/content/content.js
import { PageScanner } from './scanner.js';
import { InPageUI } from './ui.js';
import { MSG } from '../shared/messaging.js';
import { sendMessage, getBrowser } from '../shared/browser.js';
import {
  getSiteMode,
  getSiteCurrencies,
  migrateSettings,
  SETTINGS_STORAGE_KEY
} from '../shared/settings.js';
import { RATES_CACHE_KEY, getOfflineFallbackData } from '../shared/rates.js';

// Inlined ui.css for complete self-contained Shadow DOM isolation
import uiCssText from './ui.css';

let currentScanner = null;
let currentUI = null;
let isConverted = false;
let isConverting = false;
let globalRates = null;
let rateDate = null;
let rateProvider = null;
let currentSettings = null;
let cachedSettings = null;
let lastTooltipHideTime = 0;
let offerObserver = null;
let offerDebounceTimer = null;
let offerTimers = [];
let conversionFollowupTimers = [];

// Theme and crypto settings for the in-page pill. Loaded on demand so the
// first paint already matches the user's choice.
let pillThemeSetting = null;
let pillCryptoSetting = null;

const api = getBrowser();

const THEME_LOAD_TIMEOUT_MS = 800;

function getNormalizedPageHost() {
  if (typeof window !== 'undefined' && window.location?.hostname) {
    return window.location.hostname.replace(/^www\./, '').toLowerCase();
  }
  return '';
}

function resolvePillTheme() {
  return currentSettings?.theme || pillThemeSetting || 'system';
}

function resolvePillCrypto() {
  if (typeof currentSettings?.showCrypto === 'boolean') return currentSettings.showCrypto;
  if (typeof pillCryptoSetting === 'boolean') return pillCryptoSetting;
  return false;
}

async function readStorageLocalKey(key) {
  if (!api || !api.storage || !api.storage.local) return null;
  try {
    const p = api.storage.local.get(key);
    if (p && typeof p.then === 'function') {
      const data = await p;
      return data ? data[key] : null;
    }
    return await new Promise((resolve) => {
      api.storage.local.get(key, (data) => {
        if (api.runtime?.lastError) resolve(null);
        else resolve(data ? data[key] : null);
      });
    });
  } catch {
    return null;
  }
}

/**
 * Fetches the saved settings (theme, showCrypto, perSite, targetCurrency) once.
 * Reads directly from chrome.storage.local first so cold service-worker startups
 * never block or drop auto-convert rules, falling back to runtime messaging.
 */
async function ensurePillSettings() {
  if (
    cachedSettings &&
    (currentSettings?.theme || pillThemeSetting) &&
    (currentSettings?.showCrypto !== undefined || pillCryptoSetting !== null)
  ) {
    return cachedSettings;
  }

  try {
    const rawStored = await readStorageLocalKey(SETTINGS_STORAGE_KEY);
    if (rawStored && typeof rawStored === 'object') {
      const migrated = migrateSettings(rawStored);
      cachedSettings = migrated;
      if (typeof migrated.theme === 'string') {
        pillThemeSetting = migrated.theme;
      }
      if (typeof migrated.showCrypto === 'boolean') {
        pillCryptoSetting = migrated.showCrypto;
      }
      return cachedSettings;
    }
  } catch {}

  try {
    const settings = await Promise.race([
      sendMessage({ type: MSG.GET_SETTINGS }),
      new Promise((resolve) => setTimeout(() => resolve(null), THEME_LOAD_TIMEOUT_MS))
    ]);
    if (settings && !settings.error) {
      cachedSettings = settings;
      if (typeof settings.theme === 'string') {
        pillThemeSetting = settings.theme;
      }
      if (typeof settings.showCrypto === 'boolean') {
        pillCryptoSetting = settings.showCrypto;
      }
    }
  } catch {
    // Non-fatal: keep following default settings.
  }
  return cachedSettings;
}

function stopOfferObserver() {
  if (offerObserver) {
    try {
      offerObserver.disconnect();
    } catch {}
    offerObserver = null;
  }
  if (offerDebounceTimer) {
    clearTimeout(offerDebounceTimer);
    offerDebounceTimer = null;
  }
  if (offerTimers.length > 0) {
    for (const t of offerTimers) clearTimeout(t);
    offerTimers = [];
  }
}

function stopConversionFollowupTimers() {
  if (conversionFollowupTimers.length > 0) {
    for (const t of conversionFollowupTimers) clearTimeout(t);
    conversionFollowupTimers = [];
  }
}

function notifyBackgroundOfStatus() {
  try {
    sendMessage({
      type: MSG.PAGE_STATUS,
      payload: {
        isConverted,
        count: currentScanner ? currentScanner.convertedCount : 0,
        targetCurrency: currentScanner ? currentScanner.targetCurrency : null
      }
    }).catch(() => {});
  } catch {}
}

function ensureHighlightStyles(doc = document) {
  if (!doc || doc.getElementById('cc-highlight-styles')) return;
  const style = doc.createElement('style');
  style.id = 'cc-highlight-styles';
  style.textContent = `
    .cc-price-highlight {
      background-color: rgba(30, 107, 82, 0.10) !important;
      border-bottom: 1.5px dashed #1E6B52 !important;
      border-radius: 2px !important;
      padding: 0 2px !important;
      box-decoration-break: clone;
      -webkit-box-decoration-break: clone;
      cursor: help !important;
      transition: background-color 140ms ease !important;
    }
    @media (hover: hover) and (pointer: fine) {
      .cc-price-highlight:hover {
        background-color: rgba(30, 107, 82, 0.18) !important;
      }
    }
    @media (prefers-color-scheme: dark) {
      .cc-price-highlight {
        background-color: rgba(111, 211, 166, 0.15) !important;
        border-bottom-color: #6FD3A6 !important;
      }
      @media (hover: hover) and (pointer: fine) {
        .cc-price-highlight:hover {
          background-color: rgba(111, 211, 166, 0.25) !important;
        }
      }
    }
  `;
  (doc.head || doc.documentElement).appendChild(style);
}

function createPillCallbacks(hostname) {
  return {
    onShowOriginal: () => {
      performRevert();
    },
    onConvert: (cur) => {
      performConversion({ targetCurrency: cur, manual: true });
    },
    onChangeCurrency: (newCur) => {
      performConversion({ targetCurrency: newCur, manual: true });
    },
    onAcceptOffer: (cur) => {
      performConversion({ targetCurrency: cur, manual: true });
    },
    onAlwaysOnSite: (cur) => {
      if (hostname) {
        sendMessage({ type: MSG.ACCEPT_ALWAYS_SITE, payload: { hostname } }).catch(() => {});
      }
      performConversion({ targetCurrency: cur, manual: true });
    },
    onDismissOffer: () => {
      stopOfferObserver();
      if (hostname) {
        sendMessage({ type: MSG.DISMISS_OFFER, payload: { hostname } }).catch(() => {});
      }
    }
  };
}

function syncConvertedPill({
  convertedCount,
  targetCurrency,
  primarySourceCurrency,
  showInPageBar,
  isManual = false,
  hostname = ''
}) {
  const shouldShowPill = showInPageBar && (convertedCount > 0 || isManual);
  const effectiveCrypto = resolvePillCrypto();

  if (shouldShowPill) {
    if (!currentUI) {
      currentUI = new InPageUI({
        doc: document,
        mode: 'converted',
        targetCurrency,
        sourceCurrency: primarySourceCurrency,
        isConverted: true,
        convertedCount,
        rateDate,
        provider: rateProvider,
        theme: resolvePillTheme(),
        showCrypto: effectiveCrypto,
        autoCollapse: true,
        ...createPillCallbacks(hostname)
      });
      currentUI.mount(uiCssText);
    } else {
      currentUI.update({
        mode: 'converted',
        isConverted: true,
        targetCurrency,
        sourceCurrency: primarySourceCurrency,
        count: convertedCount,
        rateDate,
        provider: rateProvider,
        theme: resolvePillTheme(),
        showCrypto: effectiveCrypto
      });
    }

    if (isManual) {
      currentUI.show();
    } else if (convertedCount > 0 && !currentUI.isDismissedForSession) {
      currentUI.show();
    }
  } else if (currentUI && convertedCount === 0 && !isManual) {
    currentUI.hide();
  }
}

async function performConversion(options = {}) {
  isConverting = true;
  stopOfferObserver();
  stopConversionFollowupTimers();

  try {
    if (!currentSettings && !cachedSettings) {
      await ensurePillSettings();
    }
  const settingsSource = currentSettings || cachedSettings;
  const hostname = getNormalizedPageHost();
  const { assumedCurrency: siteAssumed, targetCurrency: siteTarget } = getSiteCurrencies(settingsSource, hostname);

  const targetCurrency = options.targetCurrency || siteTarget || settingsSource?.targetCurrency || 'USD';
  const displayMode = options.displayMode || settingsSource?.displayMode || 'replace';
  if (displayMode === 'replace_highlight') {
    ensureHighlightStyles(document);
  }
  const roundWhole = options.roundWhole !== undefined ? options.roundWhole : (settingsSource?.roundWhole || false);
  const showInPageBar = options.showInPageBar !== undefined ? options.showInPageBar : (settingsSource?.showInPageBar !== false);
  const siteOverride = options.siteOverride !== undefined
    ? options.siteOverride
    : (siteAssumed ?? currentScanner?.context?.siteOverride ?? null);
  const ambiguousDollarSetting = options.ambiguousDollarSetting !== undefined
    ? options.ambiguousDollarSetting
    : (settingsSource?.ambiguousDollar ?? currentScanner?.context?.ambiguousDollarSetting ?? 'USD');

  // Fetch rates if not cached in memory
  if (options.ratesTable) {
    globalRates = options.ratesTable;
    rateDate = options.rateDate || rateDate;
    rateProvider = options.provider || rateProvider;
  } else if (!globalRates || options.forceRefreshRates) {
    try {
      const response = await sendMessage({ type: MSG.GET_RATES });
      if (response && response.rates) {
        globalRates = response.rates;
        rateDate = response.date;
        rateProvider = response.provider;
      }
    } catch (err) {
      if (typeof window !== 'undefined' && window.mockRates) {
        globalRates = window.mockRates;
        rateDate = new Date().toISOString().split('T')[0];
        rateProvider = 'ECB (Mock)';
      }
    }

    // Fallback to local storage cached rates or offline fallback so cold starts never fail
    if (!globalRates) {
      const storedRates = await readStorageLocalKey(RATES_CACHE_KEY);
      if (storedRates && storedRates.rates) {
        globalRates = storedRates.rates;
        rateDate = storedRates.date || new Date().toISOString().split('T')[0];
        rateProvider = storedRates.provider || 'ECB';
      } else {
        const fallback = getOfflineFallbackData();
        globalRates = fallback.rates;
        rateDate = fallback.date;
        rateProvider = fallback.provider;
      }
    }
  }

  if (!globalRates) {
    return { success: false, error: 'Rates unavailable' };
  }

  // Recreate scanner if target currency, display mode, rounding, or currency disambiguation context changed
  const scannerNeedsRecreate =
    !currentScanner ||
    currentScanner.targetCurrency !== targetCurrency.toUpperCase() ||
    currentScanner.displayMode !== displayMode ||
    Boolean(currentScanner.roundWhole) !== Boolean(roundWhole) ||
    (currentScanner.context?.siteOverride || null) !== (siteOverride || null) ||
    (currentScanner.context?.ambiguousDollarSetting || 'USD') !== (ambiguousDollarSetting || 'USD');

  if (scannerNeedsRecreate) {
    if (currentScanner) {
      currentScanner.revert();
    }

    currentScanner = new PageScanner({
      doc: document,
      targetCurrency,
      ratesTable: globalRates,
      displayMode,
      roundWhole,
      context: {
        siteOverride: siteOverride || null,
        ambiguousDollarSetting: ambiguousDollarSetting || 'USD'
      },
      rateDate,
      provider: rateProvider,
      onConvertedCountChange: (count) => {
        const liveSettings = currentSettings || cachedSettings;
        const liveShowBar = liveSettings ? liveSettings.showInPageBar !== false : showInPageBar;
        const sourceCur =
          currentScanner?.primarySourceCurrency ||
          (currentScanner?.detectedCurrencies && Array.from(currentScanner.detectedCurrencies)[0]) ||
          null;
        syncConvertedPill({
          convertedCount: count,
          targetCurrency: currentScanner?.targetCurrency || targetCurrency,
          primarySourceCurrency: sourceCur,
          showInPageBar: liveShowBar,
          isManual: false,
          hostname
        });
        notifyBackgroundOfStatus();
      }
    });

    currentScanner.convert();
  } else {
    // Same configuration: scan incrementally for newly added elements or after revert
    currentScanner.convert();
  }

  isConverted = true;
  currentScanner.startObserving();

  const convertedCount = currentScanner.convertedCount;
  const isManual = Boolean(options.manual);
  const primarySourceCurrency =
    currentScanner?.primarySourceCurrency ||
    (currentScanner?.detectedCurrencies && Array.from(currentScanner.detectedCurrencies)[0]) ||
    null;

  if (!currentUI && showInPageBar && (convertedCount > 0 || isManual)) {
    await ensurePillSettings();
  }

  syncConvertedPill({
    convertedCount,
    targetCurrency,
    primarySourceCurrency,
    showInPageBar,
    isManual,
    hostname
  });

  // Schedule lightweight follow-up scans for dynamic/hydrated pages (eBay, SPAs)
  if (!isManual) {
    for (const delayMs of [600, 1800]) {
      const timer = setTimeout(() => {
        if (isConverted && currentScanner) {
          currentScanner.convert();
        }
      }, delayMs);
      conversionFollowupTimers.push(timer);
    }
  }

  notifyBackgroundOfStatus();
  return {
    success: true,
    count: convertedCount,
    convertedCount,
    targetCurrency,
    alreadyTarget: convertedCount === 0,
    ratesDate: rateDate,
    ratesProvider: rateProvider
  };
  } finally {
    isConverting = false;
  }
}

function performRevert() {
  stopOfferObserver();
  stopConversionFollowupTimers();
  if (currentScanner) {
    currentScanner.revert();
    currentScanner.stopObserving();
  }
  isConverted = false;
  if (currentUI) {
    currentUI.update({ mode: 'converted', isConverted: false, count: 0 });
  }
  notifyBackgroundOfStatus();
  return { success: true, count: 0 };
}

function mountOfferPill({ count, primaryCurrency, targetCurrency, hostname }) {
  const effectiveCrypto = resolvePillCrypto();

  if (!currentUI) {
    currentUI = new InPageUI({
      doc: document,
      mode: 'offer',
      targetCurrency,
      sourceCurrency: primaryCurrency,
      isConverted: false,
      convertedCount: count,
      theme: resolvePillTheme(),
      showCrypto: effectiveCrypto,
      autoCollapse: true,
      ...createPillCallbacks(hostname)
    });
    currentUI.mount(uiCssText);
  } else {
    currentUI.update({
      mode: 'offer',
      isConverted: false,
      targetCurrency,
      sourceCurrency: primaryCurrency,
      count,
      theme: resolvePillTheme(),
      showCrypto: effectiveCrypto
    });
  }

  if (!currentUI.isDismissedForSession) {
    currentUI.show();
  }
}

function startOfferObserver({
  targetCurrency,
  siteOverride,
  ambiguousDollarSetting,
  minThreshold,
  hostname
}) {
  stopOfferObserver();
  if (typeof MutationObserver === 'undefined' || !document.body) return;

  const checkCandidates = () => {
    if (isConverted || isConverting || currentUI?.isDismissedForSession || !document.body) {
      stopOfferObserver();
      return;
    }
    const liveSettings = currentSettings || cachedSettings;
    if (liveSettings && liveSettings.showInPageBar === false) {
      stopOfferObserver();
      return;
    }
    const scanner = new PageScanner({
      doc: document,
      targetCurrency,
      context: {
        siteOverride: siteOverride || null,
        ambiguousDollarSetting: ambiguousDollarSetting || 'USD'
      }
    });
    const { count, primaryCurrency } = scanner.scanCandidates(document.body);
    if (count >= minThreshold) {
      stopOfferObserver();
      mountOfferPill({ count, primaryCurrency, targetCurrency, hostname });
    }
  };

  offerObserver = new MutationObserver((mutations) => {
    if (isConverted) {
      stopOfferObserver();
      return;
    }
    let hasRelevantAddition = false;
    for (const m of mutations) {
      if (m.type === 'childList' && m.addedNodes.length > 0) {
        hasRelevantAddition = true;
        break;
      }
      if (m.type === 'characterData') {
        hasRelevantAddition = true;
        break;
      }
    }
    if (!hasRelevantAddition) return;
    if (offerDebounceTimer) clearTimeout(offerDebounceTimer);
    offerDebounceTimer = setTimeout(checkCandidates, 250);
  });

  try {
    offerObserver.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
  } catch {}

  for (const delayMs of [600, 1800, 3500]) {
    const t = setTimeout(checkCandidates, delayMs);
    offerTimers.push(t);
  }
}

async function performOffer(options = {}) {
  if (isConverted || isConverting) {
    return { success: true, offered: false, alreadyConverted: true };
  }
  if (!currentSettings && !cachedSettings) {
    await ensurePillSettings();
  }
  const settingsSource = currentSettings || cachedSettings;
  const showInPageBar = options.showInPageBar !== undefined
    ? options.showInPageBar
    : (settingsSource?.showInPageBar !== false);
  if (!showInPageBar) {
    return { success: true, offered: false, count: 0 };
  }

  const hostname = getNormalizedPageHost();
  const { assumedCurrency: siteAssumed, targetCurrency: siteTarget } = getSiteCurrencies(settingsSource, hostname);
  const targetCurrency = options.targetCurrency || siteTarget || settingsSource?.targetCurrency || 'USD';
  const siteOverride = options.siteOverride !== undefined
    ? options.siteOverride
    : (siteAssumed ?? null);
  const ambiguousDollarSetting = options.ambiguousDollarSetting !== undefined
    ? options.ambiguousDollarSetting
    : (settingsSource?.ambiguousDollar ?? 'USD');
  const minThreshold = options.minCandidateThreshold !== undefined ? options.minCandidateThreshold : 1;

  const dryScanner = new PageScanner({
    doc: document,
    targetCurrency,
    context: {
      siteOverride: siteOverride || null,
      ambiguousDollarSetting: ambiguousDollarSetting || 'USD'
    }
  });

  const { count, primaryCurrency } = dryScanner.scanCandidates(document.body);
  if (count < minThreshold) {
    startOfferObserver({
      targetCurrency,
      siteOverride,
      ambiguousDollarSetting,
      minThreshold,
      hostname
    });
    return { success: true, offered: false, count };
  }

  stopOfferObserver();
  await ensurePillSettings();
  mountOfferPill({ count, primaryCurrency, targetCurrency, hostname });

  return {
    success: true,
    offered: !currentUI.isDismissedForSession,
    count,
    primaryCurrency,
    targetCurrency
  };
}

async function autoEvaluateOnLoad() {
  if (typeof window === 'undefined' || !window.location?.protocol?.startsWith('http')) {
    return;
  }
  const hostname = getNormalizedPageHost();
  if (!hostname) return;

  const settings = await ensurePillSettings();
  if (!settings || isConverted) return;

  const { mode } = getSiteMode(settings, hostname);
  const { assumedCurrency, targetCurrency } = getSiteCurrencies(settings, hostname);

  if (mode === 'always') {
    if (!isConverted) {
      await performConversion({
        targetCurrency,
        siteOverride: assumedCurrency
      });
    }
  } else if (mode === 'ask' && settings.showInPageBar !== false) {
    let eligible = true;
    try {
      const check = await Promise.race([
        sendMessage({ type: MSG.CHECK_OFFER_ELIGIBILITY, payload: { hostname } }),
        new Promise((resolve) => setTimeout(() => resolve({ eligible: true }), 500))
      ]);
      if (check && check.dismissed) {
        eligible = false;
      }
    } catch {}

    if (eligible && !isConverted) {
      await performOffer({
        targetCurrency,
        siteOverride: assumedCurrency
      });
    }
  }
}

function initContentScript() {
  // Tooltip event delegation with 0ms warmup when moving between prices within 400ms
  document.addEventListener('mouseover', (e) => {
    if (!isConverted || !currentScanner || !currentUI) return;
    const target = e.target;
    if (!target || target.nodeType !== 1) return;

    const hoverHit = currentScanner.getHoverMetadata(target);
    if (!hoverHit) return;

    const { element: anchorEl, meta } = hoverHit;
    if (meta) {
      const isWarm = (Date.now() - lastTooltipHideTime) <= 400 || currentUI.tooltipElement?.classList.contains('visible');
      if (currentUI.tooltipElement) {
        currentUI.tooltipElement.style.transition = isWarm ? 'none' : '';
      }
      currentUI.showTooltip({
        originalAmount: meta.originalAmount,
        originalCurrency: meta.originalCurrency,
        convertedAmount: meta.convertedAmount,
        rate: meta.rate,
        date: meta.date,
        targetElement: anchorEl,
        x: e.clientX,
        y: e.clientY
      });
    }
  }, { passive: true });

  document.addEventListener('mouseout', (e) => {
    if (!isConverted || !currentScanner || !currentUI) return;
    const target = e.target;
    if (!target || target.nodeType !== 1) return;

    if (currentScanner.getHoverMetadata(target)) {
      lastTooltipHideTime = Date.now();
      currentUI.hideTooltip();
    }
  }, { passive: true });

  // Message receiver from popup and background
  if (api && api.runtime && api.runtime.onMessage) {
    api.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (!message || !message.type) return;

      if (message.type === MSG.CONVERT_PAGE) {
        performConversion(message.payload || {})
          .then(result => sendResponse(result))
          .catch(err => sendResponse({ success: false, error: err.message }));
        return true; // Keep channel open for async response
      }

      if (message.type === MSG.OFFER_PAGE) {
        performOffer(message.payload || {})
          .then(result => sendResponse(result))
          .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
      }

      if (message.type === MSG.REVERT_PAGE) {
        const res = performRevert();
        sendResponse(res);
        return false;
      }

      if (message.type === MSG.GET_PAGE_STATUS) {
        sendResponse({
          isConverted,
          count: currentScanner ? currentScanner.convertedCount : 0,
          targetCurrency: currentScanner ? currentScanner.targetCurrency : null,
          rateDate,
          rateProvider
        });
        return false;
      }
    });
  }

  // Live storage synchronization from options and popup
  if (api && api.storage && api.storage.onChanged) {
    api.storage.onChanged.addListener((changes, area) => {
      if ((area === 'local' || area === 'sync') && changes[SETTINGS_STORAGE_KEY]) {
        const rawNext = changes[SETTINGS_STORAGE_KEY].newValue;
        if (!rawNext) return;
        const nextSettings = migrateSettings(rawNext);
        currentSettings = nextSettings;
        cachedSettings = nextSettings;
        if (currentUI) {
          if (currentSettings.theme) {
            pillThemeSetting = currentSettings.theme;
          }
          if (typeof currentSettings.showCrypto === 'boolean') {
            pillCryptoSetting = currentSettings.showCrypto;
          }
          currentUI.update({
            theme: currentSettings.theme,
            showCrypto: currentSettings.showCrypto
          });
        }

        const host = getNormalizedPageHost();
        const { mode: nextMode } = getSiteMode(nextSettings, host);
        const {
          assumedCurrency: nextSiteOverride,
          targetCurrency: nextSiteTarget,
          hasSiteTarget
        } = getSiteCurrencies(nextSettings, host);
        const nextAmbiguous = nextSettings.ambiguousDollar || 'USD';

        if (nextMode === 'never') {
          stopOfferObserver();
          if (isConverted) {
            performRevert();
          }
          if (currentUI) {
            currentUI.hide();
          }
          return;
        }

        if (nextMode === 'always' && !isConverted) {
          void performConversion({
            targetCurrency: nextSiteTarget,
            displayMode: nextSettings.displayMode,
            roundWhole: nextSettings.roundWhole,
            siteOverride: nextSiteOverride,
            ambiguousDollarSetting: nextAmbiguous
          });
          return;
        }

        if (isConverted && currentScanner) {
          const effectiveTargetForPage = hasSiteTarget
            ? nextSiteTarget
            : currentScanner.targetCurrency;
          const configChanged =
            (nextSettings.displayMode && nextSettings.displayMode !== currentScanner.displayMode) ||
            (typeof nextSettings.roundWhole === 'boolean' && nextSettings.roundWhole !== Boolean(currentScanner.roundWhole)) ||
            nextSiteOverride !== (currentScanner.context?.siteOverride || null) ||
            effectiveTargetForPage.toUpperCase() !== currentScanner.targetCurrency.toUpperCase() ||
            nextAmbiguous !== (currentScanner.context?.ambiguousDollarSetting || 'USD');
          if (configChanged) {
            void performConversion({
              targetCurrency: effectiveTargetForPage,
              displayMode: nextSettings.displayMode,
              roundWhole: nextSettings.roundWhole,
              siteOverride: nextSiteOverride,
              ambiguousDollarSetting: nextAmbiguous
            });
          }
        }
      }
    });
  }

  // Self-evaluate current page against saved rules on load
  void autoEvaluateOnLoad();
}

// Top-level idempotency guard: re-injection is a clean no-op leaving existing instance intact
// Top frame only: iframes are not converted for now
if (typeof window !== 'undefined') {
  if (window !== window.top) {
    // Child frame / iframe: do not mount or run
  } else if (window.__CC_CONTENT_SCRIPT_INJECTED__) {
    // Already initialized in this frame; do nothing
  } else {
    window.__CC_CONTENT_SCRIPT_INJECTED__ = true;
    initContentScript();
  }
}
