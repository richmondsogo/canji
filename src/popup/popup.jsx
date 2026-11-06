// src/popup/popup.jsx
import * as React from "react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { createRoot } from "react-dom/client";
import { Button } from "@/ui/components/ui/button";
import { Badge } from "@/ui/components/ui/badge";
import { Separator } from "@/ui/components/ui/separator";
import { SiteModeControl } from "@/ui/components/SiteModeControl";
import { CurrencyCombobox } from "@/ui/components/CurrencyCombobox";
import { CanjiLockup } from "@/ui/components/CanjiLogo";
import { getEffectiveSiteCaption } from "@/ui/lib/site-rules";
import {
  ClockCounterClockwise,
  Faders,
  WarningCircle,
  ArrowRight,
  ArrowsLeftRight,
  ArrowUUpLeft,
  GlobeHemisphereWest,
} from "@phosphor-icons/react";
import { getAllCurrencies } from "../shared/currencies.js";
import { MSG } from "../shared/messaging.js";
import {
  sendMessage,
  sendTabMessage,
  getActiveTab,
  requestOriginPermission,
  ensureInjected,
  injectContentScript,
  getBrowser,
} from "../shared/browser.js";
import {
  setSiteMode,
  getSiteCurrencies,
  normalizeHost,
  DEFAULT_SETTINGS,
} from "../shared/settings.js";
import {
  classifyConversionError,
  getConversionErrorMessage,
  isRestrictedPage,
} from "./popup-errors.js";
import { applyTheme, subscribeSystemTheme } from "../shared/theme.js";
import { playTactileClick, playErrorChime } from "../shared/audio.js";

const api = getBrowser();

function openOptionsPage(e) {
  if (e) e.preventDefault();
  if (api && api.runtime && api.runtime.openOptionsPage) {
    api.runtime.openOptionsPage();
  } else if (api && api.tabs && api.tabs.create) {
    api.tabs.create({ url: api.runtime.getURL("options/options.html") });
  }
}

export function PopupApp() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState(null);
  const [hostname, setHostname] = useState("");
  const [origin, setOrigin] = useState("");
  const [isRestricted, setIsRestricted] = useState(false);

  // Active site/page conversion currencies (two-way synced with settings.perSite[hostname])
  const [pageTargetCurrency, setPageTargetCurrency] = useState("USD");
  const [isPageConverted, setIsPageConverted] = useState(false);
  const [converting, setConverting] = useState(false);

  // Live status
  const [statusMessage, setStatusMessage] = useState("Ready to convert");
  const [statusType, setStatusType] = useState("ready"); // "ready" | "converting" | "converted" | "error"

  // Rates metadata
  const [ratesInfo, setRatesInfo] = useState(null);
  const [ratesError, setRatesError] = useState(false);
  const [ratesLoading, setRatesLoading] = useState(false);

  // Site rule local state
  const [siteMode, setSiteModeState] = useState(""); // explicit "ask"|"always"|"never" or ""
  const [assumedCurrency, setAssumedCurrencyState] = useState(null);

  // Fetch rates
  const loadRates = useCallback(async () => {
    setRatesLoading(true);
    setRatesError(false);
    try {
      const res = await sendMessage({ type: MSG.GET_RATES });
      if (res && res.rates) {
        setRatesInfo(res);
        setRatesError(false);
      } else {
        setRatesError(true);
      }
    } catch (e) {
      console.warn("[Popup] Failed to fetch rates:", e);
      setRatesError(true);
    } finally {
      setRatesLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    async function init() {
      const ratesP = loadRates();
      const settingsP = (async () => {
        try {
          const loaded = await sendMessage({ type: MSG.GET_SETTINGS });
          if (loaded) {
            setSettings(loaded);
            applyTheme(loaded.theme);
            if (loaded.targetCurrency) {
              setPageTargetCurrency(loaded.targetCurrency);
            }
            return loaded;
          }
        } catch (e) {
          console.warn("[Popup] Failed to load settings:", e);
        }
        return DEFAULT_SETTINGS;
      })();

      const tabP = getActiveTab().catch((error) => {
        console.warn("[Popup] Could not get active tab:", error);
        return null;
      });

      const [loadedSettings, tab] = await Promise.all([settingsP, tabP]);

      setCurrentTab(tab);

      const tabUrl = tab?.url || "";
      const restricted = isRestrictedPage(tabUrl);
      setIsRestricted(restricted);

      if (restricted) {
        setStatusType("ready");
        setStatusMessage("Canji can't run on this page");
        setLoading(false);
        return;
      }

      let host = "";
      let orig = "";
      if (tabUrl) {
        try {
          const parsed = new URL(tabUrl);
          host = parsed.hostname.replace(/^www\./, "");
          orig = parsed.origin;
          setHostname(host);
          setOrigin(orig);
        } catch {
          host = "";
          setHostname("");
        }
      }

      // Initialize site rules & per-site currencies from settings
      if (host && loadedSettings) {
        const norm = normalizeHost(host);
        const rule = (loadedSettings.perSite && loadedSettings.perSite[norm]) || {};
        const { assumedCurrency: resolvedAssumed, targetCurrency: resolvedTarget } =
          getSiteCurrencies(loadedSettings, norm);
        setSiteModeState(rule.mode || "");
        setAssumedCurrencyState(resolvedAssumed || null);
        if (resolvedTarget) {
          setPageTargetCurrency(resolvedTarget);
        }
      }

      // Query active page conversion status
      if (tab && tab.id) {
        try {
          let status = await sendTabMessage(tab.id, { type: MSG.GET_PAGE_STATUS });
          if (!status) {
            await injectContentScript(tab.id);
            await new Promise((r) => setTimeout(r, 100));
            status = await sendTabMessage(tab.id, { type: MSG.GET_PAGE_STATUS });
          }

          if (status && status.isConverted) {
            setIsPageConverted(true);
            setStatusType("converted");
            setStatusMessage(
              `${status.count} ${status.count === 1 ? "price" : "prices"} converted to ${status.targetCurrency || "USD"}`
            );
            if (status.targetCurrency) {
              setPageTargetCurrency(status.targetCurrency);
            }
          } else {
            setIsPageConverted(false);
            setStatusType("ready");
            setStatusMessage("Ready to convert");
          }
        } catch {
          setIsPageConverted(false);
          setStatusType("ready");
          setStatusMessage("Ready to convert");
        }
      }

      setLoading(false);
      void ratesP;
    }

    init();
  }, [loadRates]);

  // Live system theme listener when theme is set to 'system'
  useEffect(() => {
    if (!settings || settings.theme !== "system") return;
    return subscribeSystemTheme(() => {
      applyTheme("system");
    });
  }, [settings?.theme]);

  // Sync settings when storage changes (two-way sync with Options page)
  useEffect(() => {
    const handleStorageChange = (changes, area) => {
      if ((area === "local" || area === "sync") && changes.currency_converter_settings_v2) {
        const next = changes.currency_converter_settings_v2.newValue;
        if (next) {
          setSettings(next);
          applyTheme(next.theme);
          if (hostname) {
            const norm = normalizeHost(hostname);
            const rule = (next.perSite && next.perSite[norm]) || {};
            const { assumedCurrency: nextAssumed, targetCurrency: nextTarget } =
              getSiteCurrencies(next, norm);
            setSiteModeState(rule.mode || "");
            setAssumedCurrencyState(nextAssumed || null);
            if (nextTarget) {
              setPageTargetCurrency(nextTarget);
            }
          } else if (next.targetCurrency) {
            setPageTargetCurrency(next.targetCurrency);
          }
        }
      }
    };

    if (api && api.storage && api.storage.onChanged) {
      api.storage.onChanged.addListener(handleStorageChange);
      return () => api.storage.onChanged.removeListener(handleStorageChange);
    }
  }, [hostname]);

  // Handle conversion action
  const triggerConvert = useCallback(
    async (targetCur, siteOverrideArg) => {
      const activeTab = currentTab?.id ? currentTab : await getActiveTab();
      if (!activeTab?.id) {
        setStatusType("error");
        setStatusMessage("Open a web page to convert its prices");
        return;
      }
      if (!currentTab?.id) {
        setCurrentTab(activeTab);
      }
      if (isRestricted || isRestrictedPage(activeTab.url)) {
        setStatusType("error");
        setStatusMessage("Canji can't run on this page");
        return;
      }

      setConverting(true);
      setStatusType("converting");
      setStatusMessage("Converting…");

      try {
        const injected = await ensureInjected(activeTab.id);
        if (!injected) {
          throw new Error("Could not prepare this page");
        }

        const ratesData = ratesInfo || (await sendMessage({ type: MSG.GET_RATES }));
        const activeHostname = hostname || new URL(activeTab.url).hostname.replace(/^www\./, "");
        const norm = normalizeHost(activeHostname);
        const siteRule = settings?.perSite && settings.perSite[norm];
        const resolvedSiteOverride =
          siteOverrideArg !== undefined
            ? siteOverrideArg
            : assumedCurrency !== null
            ? assumedCurrency
            : siteRule?.assumedCurrency || null;

        const convertPayload = {
          manual: true,
          targetCurrency: targetCur,
          ratesTable: ratesData ? ratesData.rates : null,
          rateDate: ratesData ? ratesData.date : null,
          provider: ratesData ? ratesData.provider : null,
          displayMode: settings?.displayMode || "replace",
          roundWhole: settings?.roundWhole || false,
          showInPageBar: settings?.showInPageBar !== false,
          siteOverride: resolvedSiteOverride,
          ambiguousDollarSetting: settings?.ambiguousDollar || "USD",
        };

        let response = null;
        for (let attempt = 1; attempt <= 4; attempt++) {
          try {
            response = await sendTabMessage(activeTab.id, {
              type: MSG.CONVERT_PAGE,
              payload: convertPayload,
            });
            if (response) break;
          } catch {}
          if (attempt === 1) {
            await injectContentScript(activeTab.id);
          }
          await new Promise((r) => setTimeout(r, 90 * (2 ** (attempt - 1))));
        }

        if (response && response.success) {
          const count =
            response.convertedCount !== undefined
              ? response.convertedCount
              : response.count;
          if (count === 0 || response.alreadyTarget) {
            setIsPageConverted(false);
            setStatusType("ready");
            setStatusMessage(`Page is already in ${targetCur}`);
          } else {
            setIsPageConverted(true);
            setStatusType("converted");
            setStatusMessage(`${count} ${count === 1 ? "price" : "prices"} converted`);
            if (settings?.soundFeedback) playTactileClick();
          }
        } else {
          setIsPageConverted(false);
          setStatusType("error");
          if (settings?.soundFeedback) playErrorChime();
          const errorClass = classifyConversionError({
            isRestricted: false,
            hasHostPermission: true,
            ratesAvailable: Boolean(ratesData?.rates),
            hasResponse: Boolean(response),
            rawError: response?.error,
          });
          setStatusMessage(getConversionErrorMessage(errorClass));
        }
      } catch {
        setIsPageConverted(false);
        setStatusType("error");
        if (settings?.soundFeedback) playErrorChime();
        setStatusMessage("Couldn't convert this page. Try reloading it.");
      } finally {
        setConverting(false);
      }
    },
    [currentTab, isRestricted, hostname, settings, ratesInfo, assumedCurrency]
  );

  const triggerRevert = useCallback(async () => {
    if (!currentTab || !currentTab.id) return;
    setConverting(true);
    setStatusType("converting");
    setStatusMessage("Restoring original prices…");

    try {
      let response = await sendTabMessage(currentTab.id, { type: MSG.REVERT_PAGE });
      if (!response) {
        await injectContentScript(currentTab.id);
        await new Promise((r) => setTimeout(r, 100));
        response = await sendTabMessage(currentTab.id, { type: MSG.REVERT_PAGE });
      }

      if (response && response.success) {
        setIsPageConverted(false);
        setStatusType("ready");
        setStatusMessage("Showing original prices");
        if (settings?.soundFeedback) playTactileClick();
      } else {
        setStatusType("error");
        if (settings?.soundFeedback) playErrorChime();
        setStatusMessage("Couldn't restore the original prices");
      }
    } catch {
      setStatusType("error");
      if (settings?.soundFeedback) playErrorChime();
      setStatusMessage("Couldn't restore the original prices");
    } finally {
      setConverting(false);
    }
  }, [currentTab, settings]);

  const handleConvertToggle = () => {
    if (isPageConverted) {
      triggerRevert();
    } else {
      triggerConvert(pageTargetCurrency);
    }
  };

  // Persist per-site rule update to storage so Popup and Settings stay in sync
  const persistSiteRulePatch = useCallback(
    async (patch) => {
      if (!hostname || !settings) return;
      const norm = normalizeHost(hostname);
      if (!norm) return;
      const updatedPerSite = { ...(settings.perSite || {}) };
      const existing = updatedPerSite[norm] || {};
      const merged = {
        ...existing,
        ...patch,
      };
      const cleanMode = ["ask", "always", "never"].includes(merged.mode)
        ? merged.mode
        : undefined;
      const cleanAssumed = merged.assumedCurrency || null;
      const cleanTarget =
        merged.targetCurrency && merged.targetCurrency !== settings.targetCurrency
          ? merged.targetCurrency
          : merged.targetCurrency === settings.targetCurrency && existing.targetCurrency
          ? null
          : merged.targetCurrency || null;

      if (!cleanMode && !cleanAssumed && !cleanTarget) {
        delete updatedPerSite[norm];
      } else {
        const nextEntry = { assumedCurrency: cleanAssumed };
        if (cleanMode) nextEntry.mode = cleanMode;
        if (cleanTarget) nextEntry.targetCurrency = cleanTarget;
        updatedPerSite[norm] = nextEntry;
      }

      try {
        await sendMessage({
          type: MSG.UPDATE_SETTINGS,
          payload: { perSite: updatedPerSite },
        });
        setSettings((prev) => (prev ? { ...prev, perSite: updatedPerSite } : prev));
      } catch (err) {
        console.warn("[Popup] Failed to persist site rule:", err);
      }
    },
    [hostname, settings]
  );

  // Change active site target currency ("To") and sync with site rule
  const handlePageTargetCurrencyChange = async (newCode) => {
    if (!newCode || newCode === pageTargetCurrency) return;
    setPageTargetCurrency(newCode);
    await persistSiteRulePatch({
      targetCurrency: newCode === settings?.targetCurrency ? null : newCode,
    });
    if (isPageConverted || siteMode === "always") {
      void triggerConvert(newCode);
    }
  };

  // Site mode changes ("Ask" | "Always" | "Never")
  const handleSiteModeChange = async (newMode) => {
    if (!hostname || !settings) return;
    if (newMode === "always") {
      const granted = await requestOriginPermission(origin);
      if (!granted) {
        setStatusType("error");
        setStatusMessage("Canji needs permission to run on this site");
        return;
      }
    }

    setSiteModeState(newMode);
    await persistSiteRulePatch({
      mode: newMode,
      targetCurrency:
        pageTargetCurrency && pageTargetCurrency !== settings.targetCurrency
          ? pageTargetCurrency
          : null,
    });

    if (newMode === "always" && !isPageConverted) {
      void triggerConvert(pageTargetCurrency);
    } else if (newMode === "never" && isPageConverted) {
      void triggerRevert();
    }
  };

  const handleResetSiteMode = async () => {
    if (!hostname || !settings) return;
    const updatedPerSite = { ...(settings.perSite || {}) };
    setSiteMode({ perSite: updatedPerSite }, hostname, null);
    setSiteModeState("");

    try {
      await sendMessage({
        type: MSG.UPDATE_SETTINGS,
        payload: { perSite: updatedPerSite },
      });
      setSettings((prev) => ({ ...prev, perSite: updatedPerSite }));
    } catch (err) {
      console.warn("[Popup] Failed to reset site mode:", err);
    }
  };

  // Site assumed currency changes ("From")
  const handleAssumedCurrencyChange = async (currency) => {
    if (!hostname || !settings) return;
    const nextAssumed = currency || null;
    setAssumedCurrencyState(nextAssumed);
    await persistSiteRulePatch({ assumedCurrency: nextAssumed });
    if (isPageConverted || siteMode === "always") {
      await triggerConvert(pageTargetCurrency, nextAssumed);
    }
  };

  const allCurrencies = useMemo(() => {
    return getAllCurrencies({ includeCrypto: Boolean(settings?.showCrypto) }).sort(
      (a, b) => a.code.localeCompare(b.code)
    );
  }, [settings?.showCrypto]);

  const pinnedCodes = useMemo(() => {
    return settings?.pinnedCurrencies || ["USD", "EUR", "GBP", "JPY"];
  }, [settings?.pinnedCurrencies]);

  const effectiveCaption = useMemo(() => {
    const autoConvertAll = Boolean(settings?.autoConvertAll);
    const norm = normalizeHost(hostname);
    const rule = settings?.perSite && settings.perSite[norm];
    return getEffectiveSiteCaption(rule, autoConvertAll);
  }, [settings, hostname]);

  // Rates text display
  const ratesFreshnessText = useMemo(() => {
    if (ratesLoading) return "Updating…";
    if (ratesError || !ratesInfo) return "Rates unavailable";
    const rawProvider = ratesInfo.provider || "ECB";
    const provider = rawProvider.startsWith("ECB") ? "ECB" : "Live rates";
    const date = ratesInfo.date || "Today";
    const staleNotice = ratesInfo.isStale ? " (saved copy)" : "";
    return `${provider} · ${date}${staleNotice}`;
  }, [ratesLoading, ratesError, ratesInfo]);

  const isSameFromAndTo =
    Boolean(assumedCurrency) &&
    Boolean(pageTargetCurrency) &&
    assumedCurrency.toUpperCase() === pageTargetCurrency.toUpperCase();

  return (
    <div className="w-[360px] max-h-[580px] overflow-y-auto bg-background text-foreground font-sans p-4 flex flex-col gap-3.5 select-none selection:bg-accent/20">
      {/* 1. Header with Canji Lockup + Settings */}
      <header className="flex items-center justify-between">
        <CanjiLockup cut="small" size={20} wordmarkClassName="text-[15px]" />

        <Button
          id="btn-open-options"
          variant="ghost"
          size="icon"
          onClick={openOptionsPage}
          title="Settings"
          aria-label="Open settings"
          className="hit-target-44 h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-secondary/70 rounded-md transition-colors"
        >
          <Faders weight="regular" className="size-4 text-muted-foreground hover:text-foreground transition-colors cursor-pointer" aria-hidden="true" />
        </Button>
      </header>

      {/* 2. Unsupported / Restricted Notice */}
      {isRestricted && (
        <div
          id="unsupported-notice"
          className="rounded-lg bg-[color-mix(in_srgb,var(--warning)_12%,transparent)] px-3 py-2 text-xs text-foreground flex items-start gap-2.5"
        >
          <WarningCircle weight="fill" className="h-4 w-4 text-warning shrink-0 mt-0.5" aria-hidden="true" />
          <span className="leading-relaxed">
            Canji can't convert prices on browser or store pages.
          </span>
        </div>
      )}

      {/* 3. Main Controls */}
      <main id="main-controls" className="flex flex-col gap-3.5">
        {/* Explicit From -> To Converter Block */}
        <section className="space-y-2" aria-labelledby="target-heading">
          <div className="flex items-center justify-between">
            <h2 id="target-heading" className="text-xs font-medium text-muted-foreground">
              Convert prices on {hostname || "this page"}
            </h2>
            {pageTargetCurrency === settings?.targetCurrency && (
              <Badge
                variant="secondary"
                className="text-xs font-mono font-medium text-muted-foreground bg-secondary/80 px-1.5 py-0 rounded border border-border/50"
              >
                Default ({settings.targetCurrency})
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
            <div className="flex flex-col gap-1 min-w-0">
              <label
                htmlFor="site-currency-override"
                className="text-xs font-medium text-muted-foreground"
              >
                From
              </label>
              <div id="from-display" className="min-w-0">
                <CurrencyCombobox
                  triggerId="site-currency-override"
                  value={assumedCurrency}
                  onChange={handleAssumedCurrencyChange}
                  currencies={allCurrencies}
                  allowAutoDetect={true}
                  autoDetectLabel="Auto-detect"
                  triggerText={assumedCurrency || "Auto-detect"}
                  ariaLabel={`Convert from currency on ${hostname || "this site"}`}
                  align="start"
                  disabled={isRestricted}
                  className="w-full h-8 px-2.5 text-xs font-mono"
                  popoverClassName="w-[260px]"
                  scrollHeight="h-44"
                  placeholder="Search currencies…"
                />
              </div>
            </div>

            <div className="pb-2 flex items-center justify-center">
              <ArrowRight
                weight="bold"
                className="h-3.5 w-3.5 text-muted-foreground shrink-0"
                aria-hidden="true"
              />
            </div>

            <div className="flex flex-col gap-1 min-w-0">
              <label
                htmlFor="picker-to-btn"
                className="text-xs font-medium text-muted-foreground"
              >
                To
              </label>
              <div className="min-w-0">
                <CurrencyCombobox
                  triggerId="picker-to-btn"
                  searchInputId="currency-search-input"
                  value={pageTargetCurrency}
                  onChange={handlePageTargetCurrencyChange}
                  currencies={allCurrencies}
                  ariaLabel="Select target currency for this page"
                  align="end"
                  disabled={isRestricted}
                  onPrefetch={loadRates}
                  className="w-full h-8 px-2.5 font-mono text-xs"
                  popoverClassName="w-[260px]"
                  placeholder="Search currencies…"
                />
              </div>
            </div>
          </div>

          {isSameFromAndTo && (
            <p className="text-xs text-warning flex items-center gap-1.5 pt-0.5">
              <WarningCircle weight="fill" className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>From and To are both {pageTargetCurrency}. Set From to Auto-detect unless this site only uses {assumedCurrency}.</span>
            </p>
          )}

          {/* Pinned currencies: balanced 4-column grid with tactile micro-elevation */}
          <div
            role="group"
            aria-label="Pinned currencies"
            className="grid grid-cols-4 gap-1.5 pt-0.5"
          >
            {pinnedCodes.map((code) => {
              const isSelected = pageTargetCurrency === code;
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => handlePageTargetCurrencyChange(code)}
                  onPointerEnter={loadRates}
                  onFocus={loadRates}
                  disabled={isRestricted}
                  aria-pressed={isSelected}
                  className={`h-7 w-full px-1 text-xs font-mono rounded-md flex items-center justify-center transition-[background-color,color,box-shadow,border-color,transform] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background motion-safe:active:scale-[0.98] ${
                    isSelected
                      ? "bg-background text-foreground font-semibold shadow-xs border border-border/90"
                      : "bg-secondary/45 text-muted-foreground border border-transparent hover:bg-secondary/80 hover:text-foreground"
                  }`}
                >
                  {code}
                </button>
              );
            })}
          </div>
        </section>

        {/* 4. Primary Action */}
        <Button
          id="btn-convert-toggle"
          type="button"
          disabled={converting || isRestricted}
          onClick={handleConvertToggle}
          className={`w-full h-10 text-sm font-medium gap-2 transition-[background-color,transform,box-shadow] motion-safe:active:scale-[0.98] ${
            isPageConverted
              ? "bg-secondary text-foreground hover:bg-secondary/80 ring-1 ring-inset ring-border"
              : "bg-primary text-primary-foreground shadow-pine-button hover:bg-primary/90"
          }`}
        >
          {!converting && !isRestricted && (
            isPageConverted ? (
              <ArrowUUpLeft weight="bold" className="h-4 w-4 shrink-0" aria-hidden="true" />
            ) : (
              <ArrowsLeftRight weight="bold" className="h-4 w-4 shrink-0" aria-hidden="true" />
            )
          )}
          <span>
            {converting
              ? "Converting…"
              : isRestricted
              ? "Unavailable on this page"
              : isPageConverted
              ? "Show original"
              : `Convert to ${pageTargetCurrency}`}
          </span>
        </Button>

        {/* 5. Live Status */}
        <div
          id="live-status"
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 text-xs tabular-nums"
        >
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              statusType === "converted"
                ? "bg-accent"
                : statusType === "converting"
                ? "bg-muted-foreground motion-safe:animate-ping"
                : statusType === "error"
                ? "bg-destructive"
                : "bg-muted-foreground opacity-60"
            }`}
            aria-hidden="true"
          />
          <span
            className={`truncate ${
              statusType === "error"
                ? "text-destructive"
                : statusType === "converted"
                ? "text-foreground font-medium"
                : "text-muted-foreground"
            }`}
          >
            {statusMessage}
          </span>
        </div>

        {/* 6. Unified "This site" control group — flat hairline layout */}
        {!isRestricted && (
          <section
            className="border-t border-border/70 pt-3 space-y-2"
            aria-labelledby="site-heading"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <GlobeHemisphereWest
                  weight="duotone"
                  className="size-3.5 text-muted-foreground fill-accent/20"
                  aria-hidden="true"
                />
                <h2 id="site-heading" className="text-xs font-medium text-muted-foreground shrink-0">
                  On
                </h2>
                <span
                  id="current-domain-label"
                  className="font-mono text-xs font-medium text-foreground truncate max-w-[180px]"
                  title={hostname || "Current site"}
                >
                  {hostname || "Current site"}
                </span>
              </div>

              {siteMode && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetSiteMode}
                  className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                  title="Reset to default"
                >
                  Reset
                </Button>
              )}
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-foreground">When visiting</span>
              <SiteModeControl
                value={siteMode}
                onChange={handleSiteModeChange}
                domain={hostname}
                size="sm"
                ariaLabel={`Conversion rule for ${hostname || "current site"}`}
              />
            </div>

            {!siteMode && (
              <div className="text-xs text-muted-foreground text-right">
                {effectiveCaption}
              </div>
            )}
          </section>
        )}
      </main>

      {/* 7. Footer */}
      <Separator />
      <footer className="flex items-center justify-between gap-3 text-xs text-muted-foreground -mt-1">
        <div id="rates-meta" className="flex items-center gap-1.5 min-w-0">
          <ClockCounterClockwise weight="duotone" className="size-3.5 text-muted-foreground fill-accent/20" aria-hidden="true" />
          <span id="rates-freshness-text" className="truncate tabular-nums">
            {ratesFreshnessText}
          </span>
          {ratesError && (
            <button
              id="btn-retry-rates"
              type="button"
              onClick={loadRates}
              className="text-foreground font-medium underline underline-offset-2 ml-1 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Retry
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <a
            id="link-options"
            href="#"
            onClick={openOptionsPage}
            className="text-foreground font-medium hover:underline underline-offset-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Settings
          </a>
        </div>
      </footer>
    </div>
  );
}

const rootEl = document.getElementById("root");
if (rootEl) {
  createRoot(rootEl).render(<PopupApp />);
}
