// src/options/options.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "@/ui/components/ui/sonner";
import { toast } from "sonner";
import { Button } from "@/ui/components/ui/button";
import { Card } from "@/ui/components/ui/card";
import { Input } from "@/ui/components/ui/input";
import { Label } from "@/ui/components/ui/label";
import { Switch } from "@/ui/components/ui/switch";
import { SegmentedControl } from "@/ui/components/ui/segmented-control";
import { Separator } from "@/ui/components/ui/separator";
import { Badge } from "@/ui/components/ui/badge";
import { ScrollArea } from "@/ui/components/ui/scroll-area";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/ui/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/ui/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/ui/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/ui/components/ui/command";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/ui/components/ui/alert-dialog";
import {
  Faders,
  Coins,
  GlobeHemisphereWest,
  Swatches,
  Archive,
  Compass,
  Check,
  CaretUpDown,
  ArrowSquareOut,
  DownloadSimple,
  UploadSimple,
  ArrowCounterClockwise,
  WarningCircle,
} from "@phosphor-icons/react";
import { getAllCurrencies, getCurrencyMeta } from "../shared/currencies.js";
import { MSG } from "../shared/messaging.js";
import { sendMessage, getBrowser, requestOriginPermission } from "../shared/browser.js";
import {
  SETTINGS_STORAGE_KEY,
  DEFAULT_SETTINGS,
  setSiteMode,
  validateSettings,
  SettingsManager,
} from "../shared/settings.js";
import { SiteModeControl } from "@/ui/components/SiteModeControl";
import { CurrencyCombobox, CurrencyPairChip } from "@/ui/components/CurrencyCombobox";
import { CanjiSymbol, CanjiLockup } from "@/ui/components/CanjiLogo";
import { FieldArray } from "@/ui/components/ui/field-array";
import {
  validateDomainInput,
  validateImportContent,
} from "@/ui/lib/site-rules";
import { applyTheme, subscribeSystemTheme } from "../shared/theme.js";
import { playTactileClick } from "../shared/audio.js";

const api = getBrowser();

const SECTIONS = [
  {
    id: "general",
    title: "General",
    description: "Your default currency and how Canji behaves across the web.",
    icon: Faders,
  },
  {
    id: "currencies",
    title: "Currencies",
    description: "Quick-pick currencies for the popup and right-click menu.",
    icon: Coins,
  },
  {
    id: "sites",
    title: "Sites",
    description: "Choose how Canji converts prices on specific websites.",
    icon: GlobeHemisphereWest,
  },
  {
    id: "appearance",
    title: "Appearance",
    description: "Theme and how converted prices appear on the page.",
    icon: Swatches,
  },
  {
    id: "data",
    title: "Backup & reset",
    description: "Export, import, or reset your settings.",
    icon: Archive,
  },
  {
    id: "about",
    title: "About",
    description: "Version, rate sources, and links.",
    icon: Compass,
  },
];

const SUGGESTED_PINNED = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "NGN", "INR"];
const DOLLAR_CURRENCIES = ["USD", "CAD", "AUD", "NZD", "SGD", "HKD", "MXN"];

const THEME_OPTIONS = [
  {
    value: "light",
    label: "Light",
    ariaLabel: "Light theme",
  },
  {
    value: "dark",
    label: "Dark",
    ariaLabel: "Dark theme",
  },
  {
    value: "system",
    label: "System",
    ariaLabel: "System theme",
  },
];

const NEW_SITE_OPTIONS = [
  { value: "ask", label: "Ask", ariaLabel: "Ask on new sites" },
  { value: "always", label: "Always", ariaLabel: "Always convert on new sites" },
];

export function OptionsApp() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [currentSection, setCurrentSection] = useState(() => {
    const hash = window.location.hash.replace(/^#/, "").toLowerCase();
    const match = SECTIONS.find((s) => s.id === hash);
    return match ? match.id : "general";
  });

  // Rates metadata for About section
  const [ratesInfo, setRatesInfo] = useState(null);

  // Combobox popover states
  const [pinnedComboboxOpen, setPinnedComboboxOpen] = useState(false);
  const [pinnedSearch, setPinnedSearch] = useState("");

  // Sites section state
  const [newSiteDomain, setNewSiteDomain] = useState("");
  const [newSiteMode, setNewSiteMode] = useState("always");
  const [newSiteCurrency, setNewSiteCurrency] = useState(null);
  const [newSiteTargetCurrency, setNewSiteTargetCurrency] = useState(null);
  const [newSiteError, setNewSiteError] = useState("");
  const [rulesSearch, setRulesSearch] = useState("");

  const importFileInputRef = useRef(null);

  // 1. Hash routing listener
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#/, "").toLowerCase();
      const match = SECTIONS.find((s) => s.id === hash);
      if (match) {
        setCurrentSection(match.id);
      }
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // Sync document.title and URL hash with currentSection
  useEffect(() => {
    const active = SECTIONS.find((s) => s.id === currentSection) || SECTIONS[0];
    document.title = active.title;
    if (window.location.hash !== `#${currentSection}`) {
      window.location.hash = `#${currentSection}`;
    }
  }, [currentSection]);

  // 2. Load settings on mount
  const loadInitialSettings = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      let loaded = null;
      try {
        loaded = await sendMessage({ type: MSG.GET_SETTINGS });
      } catch (err) {
        console.warn("[Options] Messaging GET_SETTINGS failed, trying SettingsManager:", err);
        const mgr = new SettingsManager();
        loaded = await mgr.getSettings();
      }
      if (!loaded) throw new Error("No settings returned from service worker or storage");
      const validated = validateSettings(loaded);
      setSettings(validated);
      applyTheme(validated.theme);
    } catch (err) {
      console.error("[Options] Failed to load settings:", err);
      setLoadError("Canji couldn't reach its background service. Please try again.");
      setSettings({ ...DEFAULT_SETTINGS });
      applyTheme(DEFAULT_SETTINGS.theme);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialSettings();
  }, [loadInitialSettings]);

  // 3. Storage change listener (syncs popup edits live)
  useEffect(() => {
    const handleStorageChange = (changes, area) => {
      if (area === "local" && changes[SETTINGS_STORAGE_KEY]) {
        const next = changes[SETTINGS_STORAGE_KEY].newValue;
        if (next) {
          const validated = validateSettings(next);
          setSettings(validated);
          applyTheme(validated.theme);
        }
      }
    };

    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener(handleStorageChange);
      return () => chrome.storage.onChanged.removeListener(handleStorageChange);
    } else if (typeof browser !== "undefined" && browser.storage && browser.storage.onChanged) {
      browser.storage.onChanged.addListener(handleStorageChange);
      return () => browser.storage.onChanged.removeListener(handleStorageChange);
    }
  }, []);

  // 4. System theme listener
  useEffect(() => {
    if (!settings || settings.theme !== "system") return;
    return subscribeSystemTheme(() => {
      applyTheme("system");
    });
  }, [settings?.theme]);

  // 5. Fetch live rates for About section
  useEffect(() => {
    async function fetchMetadata() {
      try {
        const ratesRes = await sendMessage({ type: MSG.GET_RATES });
        if (ratesRes) {
          setRatesInfo(ratesRes);
        }
      } catch (e) {
        console.warn("[Options] Could not fetch rates metadata:", e);
      }
    }
    fetchMetadata();
  }, []);

  // Central update function
  const updateSettings = useCallback(
    async (partial, successMessage = "Saved") => {
      if (!settings) return;
      const nextSettings = validateSettings({ ...settings, ...partial });
      setSettings(nextSettings);

      if (partial.theme) {
        applyTheme(partial.theme);
      }

      try {
        let res = null;
        try {
          res = await sendMessage({
            type: MSG.UPDATE_SETTINGS,
            payload: partial,
          });
        } catch {
          const mgr = new SettingsManager();
          res = { settings: await mgr.updateSettings(partial) };
        }
        if (res && res.settings) {
          setSettings(validateSettings(res.settings));
        }
        toast.success(successMessage, { duration: 1600 });
      } catch (err) {
        console.error("[Options] Update settings error:", err);
        toast.error("Couldn't save changes", { description: "Please try again." });
      }
    },
    [settings]
  );

  // Available currencies
  const allCurrencies = useMemo(() => {
    const showCrypto = Boolean(settings?.showCrypto);
    return getAllCurrencies({ includeCrypto: showCrypto }).sort((a, b) =>
      a.code.localeCompare(b.code)
    );
  }, [settings?.showCrypto]);

  const availableUnpinnedCurrencies = useMemo(() => {
    const pinned = settings?.pinnedCurrencies || [];
    const unpinned = allCurrencies.filter((c) => !pinned.includes(c.code));
    if (!pinnedSearch) return unpinned;
    const q = pinnedSearch.toLowerCase().trim();
    return unpinned.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.symbol.toLowerCase().includes(q)
    );
  }, [allCurrencies, settings?.pinnedCurrencies, pinnedSearch]);

  // Handlers for Pinned Currencies
  const handleRemovePinned = (code) => {
    const current = settings.pinnedCurrencies || [];
    const next = current.filter((c) => c !== code);
    updateSettings({ pinnedCurrencies: next }, `Unpinned ${code}`);
  };

  const handleAddPinned = (code) => {
    const current = settings.pinnedCurrencies || [];
    if (current.length >= 8) {
      toast.error("Pin limit reached", { description: "You can pin up to 8 currencies." });
      return;
    }
    if (!current.includes(code)) {
      updateSettings({ pinnedCurrencies: [...current, code] }, `Pinned ${code}`);
    }
    setPinnedComboboxOpen(false);
  };

  const handleSwapPinned = (idx, nextCode) => {
    if (!nextCode) return;
    const current = [...(settings.pinnedCurrencies || [])];
    const prevCode = current[idx];
    if (prevCode === nextCode) return;
    const existingIdx = current.indexOf(nextCode);
    if (existingIdx !== -1) {
      // Swap positions if already pinned
      current[existingIdx] = prevCode;
      current[idx] = nextCode;
      updateSettings({ pinnedCurrencies: current }, `Swapped ${prevCode} and ${nextCode}`);
    } else {
      current[idx] = nextCode;
      updateSettings(
        { pinnedCurrencies: current },
        prevCode ? `Replaced ${prevCode} with ${nextCode}` : `Pinned ${nextCode}`
      );
    }
  };

  const handlePinnedRowsChange = (nextRows) => {
    const current = settings.pinnedCurrencies || [];
    const nextCodes = nextRows.map((r) => r.value);
    if (nextCodes.length < current.length) {
      const removed = current.find((c) => !nextCodes.includes(c));
      updateSettings(
        { pinnedCurrencies: nextCodes },
        removed ? `Unpinned ${removed}` : "Updated pinned currencies"
      );
      return;
    }
    updateSettings({ pinnedCurrencies: nextCodes }, "Reordered pinned currencies");
  };

  // Handlers for Site Rules
  const handleAddSiteRule = async (e) => {
    e.preventDefault();
    setNewSiteError("");
    const check = validateDomainInput(newSiteDomain, settings.perSite);
    if (!check.ok) {
      setNewSiteError(check.error);
      return;
    }
    const clean = check.clean;

    if (newSiteMode === "always") {
      void requestOriginPermission(`https://${clean}/*`);
    }

    const updatedPerSite = { ...(settings.perSite || {}) };
    const nextRule = {
      mode: newSiteMode,
      assumedCurrency: newSiteCurrency || null,
    };
    if (newSiteTargetCurrency && newSiteTargetCurrency !== settings.targetCurrency) {
      nextRule.targetCurrency = newSiteTargetCurrency;
    }
    updatedPerSite[clean] = nextRule;
    updateSettings({ perSite: updatedPerSite }, `Added ${clean}`);
    setNewSiteDomain("");
    setNewSiteMode("always");
    setNewSiteCurrency(null);
    setNewSiteTargetCurrency(null);
    setNewSiteError("");
  };

  const handleUpdateSiteMode = async (host, mode) => {
    if (mode === "always") {
      void requestOriginPermission(`https://${host}/*`);
    }
    const updated = { ...(settings.perSite || {}) };
    setSiteMode({ perSite: updated }, host, mode);
    updateSettings({ perSite: updated }, `${host} set to ${mode.charAt(0).toUpperCase() + mode.slice(1)}`);
  };

  const handleResetSiteMode = (host) => {
    const updated = { ...(settings.perSite || {}) };
    setSiteMode({ perSite: updated }, host, null);
    updateSettings({ perSite: updated }, `${host} reset to default`);
  };

  const handleSetAssumedCurrency = (host, currency) => {
    const updated = { ...(settings.perSite || {}) };
    if (!updated[host]) {
      updated[host] = {};
    }
    updated[host] = {
      ...updated[host],
      assumedCurrency: currency || null,
    };
    updateSettings(
      { perSite: updated },
      `${host} source currency set to ${currency || "Auto-detect"}`
    );
  };

  const handleSetSiteTargetCurrency = (host, currency) => {
    const updated = { ...(settings.perSite || {}) };
    const existing = updated[host] || {};
    const nextRule = {
      ...existing,
      assumedCurrency: existing.assumedCurrency || null,
    };
    if (currency && currency !== settings.targetCurrency) {
      nextRule.targetCurrency = currency;
    } else {
      delete nextRule.targetCurrency;
    }
    updated[host] = nextRule;
    updateSettings(
      { perSite: updated },
      `${host} target currency set to ${currency || `Default (${settings.targetCurrency})`}`
    );
  };

  const handleRemoveSiteRule = (host) => {
    const updated = { ...(settings.perSite || {}) };
    delete updated[host];
    updateSettings({ perSite: updated }, `Removed ${host}`);
  };

  // Handlers for Data Export/Import/Reset
  const handleExportJson = () => {
    const jsonStr = JSON.stringify(settings, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `canji-settings-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Settings exported");
  };

  const handleImportJson = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const migrated = validateImportContent(event.target.result);
        await updateSettings(migrated, "Settings imported");
      } catch (err) {
        console.error("[Options] Import failed:", err);
        toast.error("Couldn't import settings", { description: "Choose a settings file exported from Canji." });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleResetDefaults = async () => {
    try {
      const mgr = new SettingsManager();
      const defaults = await mgr.resetDefaults();
      setSettings(defaults);
      applyTheme(defaults.theme);
      toast.success("Settings reset");
    } catch (err) {
      console.error("[Options] Reset defaults failed:", err);
      toast.error("Couldn't reset settings", { description: "Please try again." });
    }
  };

  const activeSection = SECTIONS.find((s) => s.id === currentSection) || SECTIONS[0];

  // Loading state
  if (loading && !settings) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center font-sans">
        <div className="space-y-3 text-center">
          <div className="mx-auto flex items-center justify-center animate-pulse">
            <CanjiSymbol cut="main" size={32} />
          </div>
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  // Error state
  if (loadError && !settings) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center font-sans p-6">
        <div className="max-w-md w-full space-y-4 text-center">
          <WarningCircle weight="fill" className="h-10 w-10 text-destructive mx-auto" />
          <h1 className="text-lg font-semibold tracking-tight text-foreground">Couldn't load your settings</h1>
          <p className="text-sm text-muted-foreground">{loadError}</p>
          <Button onClick={loadInitialSettings} variant="default" className="mt-2">
            Try again
          </Button>
        </div>
      </div>
    );
  }

  const selectedTargetMeta = getCurrencyMeta(settings.targetCurrency);

  // Filter site rules
  const perSiteEntries = Object.entries(settings.perSite || {});
  const filteredSiteEntries = rulesSearch
    ? perSiteEntries.filter(([host]) => host.toLowerCase().includes(rulesSearch.toLowerCase()))
    : perSiteEntries;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen w-full bg-background text-foreground font-sans selection:bg-accent/20 flex flex-col items-center justify-start p-4 sm:p-8 md:py-10">
        <div className="w-full max-w-4xl">
          {/* Unified Settings2 Shell Card */}
          <Card className="p-0 overflow-hidden bg-background border-border">
            <SidebarProvider
              className="min-h-[600px]"
              style={{ "--sidebar-width": "14rem" }}
            >
              <Sidebar collapsible="none" className="hidden border-r border-border sm:flex">
                <SidebarHeader className="min-h-[68px] px-4 py-3.5 border-b border-border flex flex-col justify-center">
                  <div className="flex items-center gap-2.5 px-1">
                    <CanjiLockup cut="main" size={24} wordmarkClassName="text-base font-bold" />
                  </div>
                </SidebarHeader>

                <SidebarContent>
                  <SidebarGroup>
                    <SidebarGroupLabel>Settings</SidebarGroupLabel>
                    <nav aria-label="Settings sections">
                      <SidebarMenu>
                        {SECTIONS.map((sec) => {
                          const Icon = sec.icon;
                          const isActive = currentSection === sec.id;
                          return (
                            <SidebarMenuItem key={sec.id}>
                              <SidebarMenuButton asChild isActive={isActive}>
                                <a
                                  href={`#${sec.id}`}
                                  aria-current={isActive ? "page" : undefined}
                                  onClick={() => setCurrentSection(sec.id)}
                                >
                                  <Icon
                                    aria-hidden="true"
                                    weight={isActive ? "duotone" : "regular"}
                                    className={
                                      isActive
                                        ? "size-4 shrink-0 text-accent fill-accent/20"
                                        : "size-4 shrink-0"
                                    }
                                  />
                                  <span>{sec.title}</span>
                                </a>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          );
                        })}
                      </SidebarMenu>
                    </nav>
                  </SidebarGroup>
                </SidebarContent>

                <SidebarFooter className="border-t border-border p-3">
                  <SegmentedControl
                    label="Theme"
                    options={THEME_OPTIONS}
                    value={settings.theme}
                    onValueChange={(val) => val && updateSettings({ theme: val })}
                    size="sm"
                    className="w-full"
                  />
                </SidebarFooter>
              </Sidebar>

              {/* Main Content Pane */}
              <main className="flex flex-1 flex-col overflow-auto">
                <header className="min-h-[68px] px-6 sm:px-8 py-3.5 border-b border-border flex items-center justify-between gap-4 shrink-0">
                  <div className="min-w-0">
                    <h1 className="text-base font-semibold tracking-tight text-foreground leading-tight">
                      {activeSection.title}
                    </h1>
                    <p className="text-muted-foreground text-xs mt-0.5 leading-snug">
                      {activeSection.description}
                    </p>
                  </div>

                  {currentSection === "sites" && perSiteEntries.length > 1 && (
                    <div className="flex items-center gap-2 shrink-0">
                      <Input
                        placeholder="Filter sites…"
                        value={rulesSearch}
                        onChange={(e) => setRulesSearch(e.target.value)}
                        className="h-[32px] w-40 text-xs font-mono bg-background rounded-[8px]"
                        aria-label="Filter sites"
                      />
                    </div>
                  )}
                </header>

                <div className="flex-1 p-6 sm:p-8">
                  {/* SECTION 1: GENERAL */}
                  {currentSection === "general" && (
                    <div className="divide-y divide-border">
                      {/* 2-Column Grid for Primary Currency Defaults */}
                      <div className="grid gap-4 sm:grid-cols-2 pb-4">
                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor="select-target-currency" className="text-sm font-medium text-foreground">
                            Default currency
                          </Label>
                          <CurrencyCombobox
                            triggerId="select-target-currency"
                            value={settings.targetCurrency}
                            onChange={(code) => {
                              updateSettings(
                                { targetCurrency: code, lastUsedTarget: code },
                                `Default currency set to ${code}`
                              );
                            }}
                            currencies={allCurrencies}
                            ariaLabel="Default currency"
                            align="start"
                            className="w-full h-[34px] rounded-[9px]"
                            scrollHeight="h-60"
                            placeholder="Search currencies…"
                          />
                          <span className="text-muted-foreground text-xs">
                            Prices convert to this currency unless overridden for a site.
                          </span>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor="select-ambiguous-dollar" className="text-sm font-medium text-foreground">
                            Which dollar is "$"?
                          </Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                id="select-ambiguous-dollar"
                                variant="outline"
                                role="combobox"
                                aria-label="Currency used for the dollar sign"
                                className="w-full justify-between font-mono text-xs h-[34px] rounded-[9px] bg-background"
                              >
                                <span className="truncate">
                                  {settings.ambiguousDollar} — {getCurrencyMeta(settings.ambiguousDollar)?.name || "Dollar"}
                                </span>
                                <CaretUpDown weight="bold" className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[240px] p-0" align="end">
                              <Command>
                                <CommandList>
                                  <CommandGroup heading="Dollar currencies">
                                    {DOLLAR_CURRENCIES.map((code) => {
                                      const meta = getCurrencyMeta(code);
                                      return (
                                        <CommandItem
                                          key={code}
                                          data-currency-code={code}
                                          value={code}
                                          onSelect={() => {
                                            updateSettings({ ambiguousDollar: code });
                                          }}
                                          onClick={() => {
                                            updateSettings({ ambiguousDollar: code });
                                          }}
                                          className="text-xs font-mono flex items-center justify-between py-1.5 cursor-pointer"
                                        >
                                          <div className="flex items-center">
                                            <Check
                                              weight="bold"
                                              className={`mr-2 h-3.5 w-3.5 text-accent ${
                                                settings.ambiguousDollar === code
                                                  ? "opacity-100"
                                                  : "opacity-0"
                                              }`}
                                            />
                                            <span>{code}</span>
                                            <span className="ml-2 font-sans text-muted-foreground">
                                              {meta?.symbol}
                                            </span>
                                          </div>
                                          <span className="text-muted-foreground text-xs truncate max-w-[90px]">
                                            {meta?.name}
                                          </span>
                                        </CommandItem>
                                      );
                                    })}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          <span className="text-muted-foreground text-xs">
                            Used when a page shows "$" without saying which country.
                          </span>
                        </div>
                      </div>

                      {/* On new sites */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3.5">
                        <div className="flex flex-col gap-0.5 pr-4">
                          <span className="text-sm font-medium text-foreground">
                            On new sites
                          </span>
                          <span className="text-muted-foreground text-xs">
                            Ask shows a prompt in the top toolbar first. Always converts automatically.
                          </span>
                        </div>

                        <SegmentedControl
                          label="Behavior on new sites"
                          options={NEW_SITE_OPTIONS}
                          value={settings.autoConvertAll ? "always" : "ask"}
                          onValueChange={async (val) => {
                            if (!val) return;
                            const isAlways = val === "always";
                            if (isAlways) {
                              void requestOriginPermission("<all_urls>");
                            }
                            updateSettings(
                              { autoConvertAll: isAlways },
                              `New sites set to ${isAlways ? "Always" : "Ask"}`
                            );
                          }}
                          className="shrink-0"
                        />
                      </div>

                      {/* Switch Rows */}
                      <div className="flex items-center justify-between gap-4 py-3.5">
                        <div className="flex flex-col gap-0.5 pr-4">
                          <Label
                            htmlFor="switch-show-pill"
                            className="text-sm font-medium text-foreground cursor-pointer"
                          >
                            Show on-page toolbar
                          </Label>
                          <span className="text-muted-foreground text-xs">
                            Show a small toolbar at the top of the page with conversion controls and prompts.
                          </span>
                        </div>
                        <Switch
                          id="switch-show-pill"
                          aria-label="Show on-page toolbar"
                          checked={settings.showInPageBar !== false}
                          onCheckedChange={(checked) => updateSettings({ showInPageBar: checked })}
                        />
                      </div>

                      <div className="flex items-center justify-between gap-4 py-3.5">
                        <div className="flex flex-col gap-0.5 pr-4">
                          <Label
                            htmlFor="switch-round-whole"
                            className="text-sm font-medium text-foreground cursor-pointer"
                          >
                            Round to whole numbers
                          </Label>
                          <span className="text-muted-foreground text-xs">
                            Hide cents on converted prices (e.g. $25 instead of $25.43).
                          </span>
                        </div>
                        <Switch
                          id="switch-round-whole"
                          aria-label="Round to whole numbers"
                          checked={Boolean(settings.roundWhole)}
                          onCheckedChange={(checked) => updateSettings({ roundWhole: checked })}
                        />
                      </div>

                      <div className="flex items-center justify-between gap-4 py-3.5">
                        <div className="flex flex-col gap-0.5 pr-4">
                          <Label
                            htmlFor="switch-sound-feedback"
                            className="text-sm font-medium text-foreground cursor-pointer"
                          >
                            Sound effects
                          </Label>
                          <span className="text-muted-foreground text-xs">
                            Play a soft sound when prices convert or something goes wrong.
                          </span>
                        </div>
                        <Switch
                          id="switch-sound-feedback"
                          aria-label="Sound effects"
                          checked={Boolean(settings.soundFeedback)}
                          onCheckedChange={(checked) => {
                            updateSettings(
                              { soundFeedback: checked },
                              `Sound effects ${checked ? "on" : "off"}`
                            );
                            if (checked) {
                              playTactileClick();
                            }
                          }}
                        />
                      </div>

                      <div className="flex items-center justify-between gap-4 pt-3.5">
                        <div className="flex flex-col gap-0.5 pr-4">
                          <Label
                            htmlFor="switch-show-crypto"
                            className="text-sm font-medium text-foreground cursor-pointer"
                          >
                            Show cryptocurrencies
                          </Label>
                          <span className="text-muted-foreground text-xs">
                            Include Bitcoin, Ethereum and other major crypto in currency lists.
                          </span>
                        </div>
                        <Switch
                          id="switch-show-crypto"
                          aria-label="Show cryptocurrencies"
                          checked={Boolean(settings.showCrypto)}
                          onCheckedChange={(checked) => updateSettings({ showCrypto: checked })}
                        />
                      </div>
                    </div>
                  )}

                  {/* SECTION 2: CURRENCIES (Draft 1B — Unified FieldArray with Direct-Swap Combobox Rows) */}
                  {currentSection === "currencies" && (
                    <FieldArray
                      aria-label="Pinned currencies"
                      hideHeader={true}
                      rows={settings.pinnedCurrencies.map((code) => ({
                        id: code,
                        value: code,
                      }))}
                      onRowsChange={handlePinnedRowsChange}
                      maxRows={8}
                      minRows={0}
                      showMove={true}
                      getMoveUpAriaLabel={(row) => `Move ${row.value} up`}
                      getMoveDownAriaLabel={(row) => `Move ${row.value} down`}
                      getDeleteAriaLabel={(row) => `Remove ${row.value} from pinned`}
                      emptyState={
                        <div className="py-8 text-center text-xs text-muted-foreground space-y-1">
                          <p className="font-medium text-foreground text-sm">Nothing pinned yet</p>
                          <p>Click "Add currency" below or choose a popular pick.</p>
                        </div>
                      }
                      renderRow={(row, idx) => (
                        <CurrencyCombobox
                          value={row.value}
                          onChange={(nextCode) => handleSwapPinned(idx, nextCode)}
                          currencies={allCurrencies}
                          ariaLabel={`Pinned currency ${idx + 1} (${row.value})`}
                          align="start"
                          className="h-[34px] rounded-[7px] flex-1 text-xs font-mono bg-background border-input"
                          popoverClassName="w-64"
                          scrollHeight="h-56"
                          placeholder="Search currencies…"
                        />
                      )}
                      renderAdd={({ disabled }) => (
                        <Popover
                          open={pinnedComboboxOpen}
                          onOpenChange={(open) => {
                            setPinnedComboboxOpen(open);
                            if (!open) setPinnedSearch("");
                          }}
                        >
                          <PopoverTrigger asChild>
                            <button
                              id="select-add-pinned"
                              type="button"
                              disabled={disabled}
                              aria-label="Pin a currency"
                              className="w-full h-[34px] rounded-[9px] border border-dashed border-border bg-secondary/20 font-sans text-xs font-medium text-muted-foreground transition-colors hover:border-accent hover:text-accent hover:bg-[color-mix(in_srgb,var(--accent)_4%,transparent)] disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring motion-reduce:transition-none"
                            >
                              {disabled ? "Pin limit reached (8 of 8)" : "Add currency"}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[280px] p-0" align="center">
                            <Command>
                              <CommandInput
                                placeholder="Search by code or name…"
                                value={pinnedSearch}
                                onValueChange={setPinnedSearch}
                                className="h-9 text-xs"
                              />
                              <CommandList>
                                <CommandEmpty className="py-4 text-center text-xs text-muted-foreground">
                                  No matching currency.
                                </CommandEmpty>
                                <CommandGroup heading="Available currencies">
                                  <ScrollArea className="h-56">
                                    {availableUnpinnedCurrencies.map((c) => (
                                      <CommandItem
                                        key={c.code}
                                        data-currency-code={c.code}
                                        value={`${c.code} ${c.name} ${c.symbol}`}
                                        onSelect={() => handleAddPinned(c.code)}
                                        onClick={() => handleAddPinned(c.code)}
                                        className="text-xs font-mono flex items-center justify-between py-1.5 cursor-pointer"
                                      >
                                        <div className="flex items-center min-w-0">
                                          <span className="font-medium text-foreground">{c.code}</span>
                                          <span className="ml-2 font-sans text-muted-foreground truncate max-w-[130px]">
                                            {c.name}
                                          </span>
                                        </div>
                                        <span className="font-mono text-xs text-muted-foreground ml-auto pl-2">
                                          {c.symbol}
                                        </span>
                                      </CommandItem>
                                    ))}
                                  </ScrollArea>
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      )}
                      footer={
                        <div className="space-y-2.5 pt-1">
                          {settings.pinnedCurrencies.length >= 8 && (
                            <p className="text-xs text-warning font-medium flex items-center gap-1.5">
                              <WarningCircle weight="bold" className="h-3.5 w-3.5 shrink-0" />
                              You've pinned the maximum of 8. Unpin one to add another.
                            </p>
                          )}
                          {SUGGESTED_PINNED.some((code) => !settings.pinnedCurrencies.includes(code)) && (
                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                              <span className="text-xs text-muted-foreground mr-1">
                                Popular picks:
                              </span>
                              {SUGGESTED_PINNED.map((code) => {
                                if (settings.pinnedCurrencies.includes(code)) return null;
                                return (
                                  <Button
                                    key={code}
                                    variant="secondary"
                                    size="sm"
                                    disabled={settings.pinnedCurrencies.length >= 8}
                                    onClick={() => handleAddPinned(code)}
                                    className="h-[30px] rounded-[7px] px-2.5 text-xs font-mono"
                                    aria-label={`Pin ${code}`}
                                  >
                                    {code}
                                  </Button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      }
                    />
                  )}

                  {/* SECTION 3: SITES (Type 4 — Calm Single-Chip Currency Pair + Full-Focus SegmentedControl) */}
                  {currentSection === "sites" && (
                    <div className="flex flex-col">
                      {/* Clean Flat Top Add-Site Bar */}
                      <form
                        onSubmit={handleAddSiteRule}
                        className="pb-4 border-b border-border space-y-2"
                      >
                        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                          <Input
                            id="input-new-site"
                            aria-label="Website"
                            placeholder="Website (e.g. ebay.com)"
                            value={newSiteDomain}
                            aria-invalid={Boolean(newSiteError)}
                            aria-describedby={newSiteError ? "new-site-error-msg" : undefined}
                            onChange={(e) => {
                              setNewSiteDomain(e.target.value);
                              if (newSiteError) setNewSiteError("");
                            }}
                            className="font-mono text-xs h-[34px] rounded-[9px] bg-background border-border flex-1 min-w-[140px]"
                          />

                          <CurrencyPairChip
                            fromValue={newSiteCurrency}
                            onFromChange={setNewSiteCurrency}
                            toValue={newSiteTargetCurrency}
                            onToChange={setNewSiteTargetCurrency}
                            defaultTargetCurrency={settings.targetCurrency}
                            currencies={allCurrencies}
                            fromAriaLabel="Convert from currency for new site"
                            toAriaLabel="Convert to currency for new site"
                          />

                          <SiteModeControl
                            value={newSiteMode}
                            onChange={setNewSiteMode}
                            size="sm"
                            ariaLabel="Conversion mode for the new site"
                          />

                          <Button
                            type="submit"
                            aria-label="Add site"
                            className="h-[34px] rounded-[9px] px-3.5 text-xs font-medium bg-primary text-primary-foreground shadow-pine-button hover:bg-primary/90 shrink-0"
                          >
                            Add site
                          </Button>
                        </div>

                        {newSiteError && (
                          <p
                            id="new-site-error-msg"
                            role="alert"
                            className="text-xs text-destructive font-medium flex items-center gap-1.5"
                          >
                            <WarningCircle weight="bold" className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            <span>{newSiteError}</span>
                          </p>
                        )}
                      </form>

                      {/* Site Rules List */}
                      {perSiteEntries.length === 0 ? (
                        <div className="py-10 text-center text-muted-foreground text-xs space-y-1">
                          <p className="font-medium text-foreground text-sm">No site rules yet</p>
                          <p>
                            Canji will {settings.autoConvertAll ? "convert automatically" : "ask first"} on every site unless you add a website above.
                          </p>
                        </div>
                      ) : filteredSiteEntries.length === 0 ? (
                        <div className="py-10 text-center text-xs text-muted-foreground">
                          No sites match "{rulesSearch}".
                        </div>
                      ) : (
                        <div className="divide-y divide-border" role="list" aria-label="Site rules">
                          {filteredSiteEntries.map(([host, rule]) => {
                            const effectiveSiteTarget =
                              rule.targetCurrency || settings.targetCurrency || "USD";
                            const effectiveSiteMode =
                              rule.mode || (settings.autoConvertAll ? "always" : "ask");
                            const isSameFromTo =
                              Boolean(rule.assumedCurrency) &&
                              rule.assumedCurrency.toUpperCase() ===
                                effectiveSiteTarget.toUpperCase();

                            return (
                              <div
                                key={host}
                                role="listitem"
                                className="py-3 flex flex-col gap-1.5"
                              >
                                <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3">
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <GlobeHemisphereWest
                                      weight="duotone"
                                      className="size-4 text-muted-foreground fill-accent/20 shrink-0"
                                      aria-hidden="true"
                                    />
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="font-mono text-xs font-semibold text-foreground truncate">
                                          {host}
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent className="font-mono text-xs">
                                        {host}
                                      </TooltipContent>
                                    </Tooltip>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <CurrencyPairChip
                                      fromValue={rule.assumedCurrency || null}
                                      onFromChange={(currency) =>
                                        handleSetAssumedCurrency(host, currency)
                                      }
                                      toValue={rule.targetCurrency || null}
                                      onToChange={(currency) =>
                                        handleSetSiteTargetCurrency(host, currency)
                                      }
                                      defaultTargetCurrency={settings.targetCurrency}
                                      currencies={allCurrencies}
                                      fromAriaLabel={`Currency used on ${host}`}
                                      toAriaLabel={`Target currency for ${host}`}
                                    />

                                    <SiteModeControl
                                      value={effectiveSiteMode}
                                      onChange={(val) => handleUpdateSiteMode(host, val)}
                                      domain={host}
                                      size="sm"
                                      ariaLabel={`Conversion mode for ${host}`}
                                    />

                                    <button
                                      type="button"
                                      onClick={() => handleRemoveSiteRule(host)}
                                      aria-label={`Remove ${host}`}
                                      title={`Remove ${host}`}
                                      className="h-[34px] w-[34px] rounded-[9px] inline-flex items-center justify-center text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring shrink-0"
                                    >
                                      <svg
                                        width="12"
                                        height="12"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        aria-hidden="true"
                                      >
                                        <path d="M18 6L6 18M6 6l12 12" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>

                                {isSameFromTo && (
                                  <p className="text-xs text-warning flex items-center gap-1.5 pl-6">
                                    <WarningCircle
                                      weight="fill"
                                      className="h-3.5 w-3.5 shrink-0"
                                      aria-hidden="true"
                                    />
                                    <span>
                                      From and To are both {effectiveSiteTarget}. Set From to Auto-detect unless {host} only shows {effectiveSiteTarget} prices.
                                    </span>
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* SECTION 4: APPEARANCE */}
                  {currentSection === "appearance" && (
                    <div className="divide-y divide-border">
                      {/* Theme Selector */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
                        <div className="flex flex-col gap-0.5 pr-4">
                          <Label className="text-sm font-medium text-foreground">Theme</Label>
                          <span className="text-xs text-muted-foreground">
                            Choose light, dark, or match your device.
                          </span>
                        </div>

                        <SegmentedControl
                          label="Theme selector"
                          options={THEME_OPTIONS}
                          value={settings.theme}
                          onValueChange={(val) => val && updateSettings({ theme: val })}
                          size="default"
                          className="shrink-0"
                        />
                      </div>

                      {/* Display Mode — Interactive Visual Preview Cards (Pine Green Cohesion) */}
                      <div className="space-y-3 pt-4">
                        <div>
                          <Label className="text-sm font-medium text-foreground">Display mode</Label>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Choose how converted prices appear on the page.
                          </p>
                        </div>

                        <div
                          role="radiogroup"
                          aria-label="Display mode"
                          className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1"
                        >
                          {[
                            {
                              value: "replace",
                              title: "Replace in place",
                              desc: "Swaps the price in place. Hover a price to see the original and the rate used.",
                              preview: (
                                <span className="font-mono text-xs font-semibold text-foreground border-b border-dotted border-border pb-0.5">
                                  {selectedTargetMeta?.symbol || "$"}277.14
                                </span>
                              ),
                            },
                            {
                              value: "append",
                              title: "Beside original",
                              desc: "Keeps the original price and adds the converted amount in parentheses.",
                              preview: (
                                <span className="font-mono text-xs inline-flex flex-wrap items-center gap-1">
                                  <span className="text-muted-foreground">€249</span>
                                  <span className="px-1.5 py-0.5 rounded bg-secondary text-foreground font-medium">
                                    ({selectedTargetMeta?.symbol || "$"}277.14)
                                  </span>
                                </span>
                              ),
                            },
                            {
                              value: "replace_highlight",
                              title: "Replace and highlight",
                              desc: "Swaps the price and adds a soft highlight so converted prices stand out.",
                              preview: (
                                <span className="font-mono text-xs font-medium px-1.5 py-0.5 rounded-[2px] bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-accent border-b-[1.5px] border-dashed border-accent">
                                  {selectedTargetMeta?.symbol || "$"}277.14
                                </span>
                              ),
                            },
                          ].map((opt) => {
                            const isSelected = settings.displayMode === opt.value;
                            return (
                              <button
                                type="button"
                                role="radio"
                                aria-checked={isSelected}
                                key={opt.value}
                                onClick={() => updateSettings({ displayMode: opt.value })}
                                className={`w-full min-w-0 overflow-hidden text-left p-3.5 rounded-xl border cursor-pointer transition-[border-color,background-color,box-shadow,transform] flex flex-col justify-between gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 motion-safe:active:scale-[0.99] ${
                                  isSelected
                                    ? "border-accent bg-[color-mix(in_srgb,var(--accent)_6%,var(--card))] shadow-[0_0_0_1px_var(--accent)]"
                                    : "border-border/80 bg-card hover:bg-secondary/30 hover:border-border"
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="space-y-1 min-w-0">
                                    <div className="text-sm font-semibold tracking-tight text-foreground">
                                      {opt.title}
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                      {opt.desc}
                                    </p>
                                  </div>
                                  <div
                                    className={`w-4 h-4 rounded-full border shrink-0 mt-0.5 flex items-center justify-center transition-colors ${
                                      isSelected
                                        ? "border-accent bg-accent"
                                        : "border-muted-foreground/40 bg-transparent"
                                    }`}
                                    aria-hidden="true"
                                  >
                                    {isSelected && (
                                      <div className="w-1.5 h-1.5 rounded-full bg-accent-foreground" />
                                    )}
                                  </div>
                                </div>

                                <div className="w-full min-w-0 overflow-hidden px-3 py-2 rounded-lg bg-background border border-border/70 flex flex-col gap-1">
                                  <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                                    Preview
                                  </span>
                                  <div className="min-w-0 truncate">{opt.preview}</div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SECTION 5: BACKUP & RESET */}
                  {currentSection === "data" && (
                    <div className="divide-y divide-border">
                      {/* Export JSON */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3.5">
                        <div className="flex flex-col gap-0.5 pr-4">
                          <Label className="text-sm font-medium text-foreground">Export settings</Label>
                          <span className="text-xs text-muted-foreground">
                            Download a backup of your settings, site rules and pinned currencies.
                          </span>
                        </div>
                        <Button
                          id="btn-export-settings"
                          variant="outline"
                          onClick={handleExportJson}
                          className="text-xs h-[34px] rounded-[9px] px-3.5 shrink-0 gap-1.5"
                        >
                          <DownloadSimple weight="bold" className="h-3.5 w-3.5" />
                          <span>Export</span>
                        </Button>
                      </div>

                      {/* Import JSON */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3.5">
                        <div className="flex flex-col gap-0.5 pr-4">
                          <Label className="text-sm font-medium text-foreground">Import settings</Label>
                          <span className="text-xs text-muted-foreground">
                            Restore your settings from a backup you exported earlier.
                          </span>
                        </div>
                        <div>
                          <input
                            type="file"
                            ref={importFileInputRef}
                            id="input-import-settings"
                            accept=".json"
                            onChange={handleImportJson}
                            style={{ display: "none" }}
                          />
                          <Button
                            variant="outline"
                            onClick={() => importFileInputRef.current?.click()}
                            className="text-xs h-[34px] rounded-[9px] px-3.5 shrink-0 gap-1.5"
                          >
                            <UploadSimple weight="bold" className="h-3.5 w-3.5" />
                            <span>Import</span>
                          </Button>
                        </div>
                      </div>

                      {/* Reset Defaults */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3.5">
                        <div className="flex flex-col gap-0.5 pr-4">
                          <Label className="text-sm font-medium text-foreground">Reset settings</Label>
                          <span className="text-xs text-muted-foreground">
                            Clear your site rules and pinned currencies and restore the defaults.
                          </span>
                        </div>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              id="btn-reset-defaults"
                              variant="destructive"
                              className="text-xs h-[34px] rounded-[9px] px-3.5 shrink-0 gap-1.5"
                            >
                              <ArrowCounterClockwise weight="bold" className="h-3.5 w-3.5" />
                              <span>Reset…</span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Reset all settings?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This clears your site rules and pinned currencies and restores the defaults. This can't be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                id="btn-confirm-reset"
                                variant="destructive"
                                onClick={handleResetDefaults}
                              >
                                Reset settings
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  )}

                  {/* SECTION 6: ABOUT */}
                  {currentSection === "about" && (
                    <div className="flex flex-col gap-5">
                      {/* Brand Hero with Main 2-Layer Cut (matching product header logo) */}
                      <div className="flex items-center gap-4 p-4 rounded-xl bg-secondary/40 border border-border/80">
                        <CanjiSymbol cut="main" size={44} className="shrink-0" />
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-sans font-bold text-lg tracking-[-0.03em] text-foreground">
                              canji
                            </span>
                          </div>
                          <p className="text-sm font-medium text-foreground">
                            Prices, in your currency.
                          </p>
                          <p className="text-xs text-muted-foreground">
                            From Hausa <em>canji</em>, meaning change or exchange.
                          </p>
                        </div>
                      </div>

                      {/* Exchange Rates Metadata */}
                      <div className="space-y-2.5">
                        <h2 className="text-sm font-medium text-foreground">Exchange rates</h2>
                        <p className="text-xs text-muted-foreground">
                          Rates come from the European Central Bank and refresh every few hours. If that source is unavailable, Canji switches to a backup.
                        </p>
                        <div className="divide-y divide-border border-y border-border text-xs">
                          <div className="flex items-center justify-between py-2.5">
                            <span className="text-muted-foreground">Main source</span>
                            <span className="font-medium">European Central Bank</span>
                          </div>
                          <div className="flex items-center justify-between py-2.5">
                            <span className="text-muted-foreground">Backup source</span>
                            <span className="font-medium">Open exchange-rate data (Fawaz Ahmed)</span>
                          </div>
                          {ratesInfo && ratesInfo.timestamp && (
                            <div className="flex items-center justify-between py-2.5 font-mono text-xs">
                              <span className="text-muted-foreground">Last updated</span>
                              <span>{new Date(ratesInfo.timestamp).toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Links */}
                      <div className="space-y-2.5 pt-1">
                        <h2 className="text-sm font-medium text-foreground">Help &amp; privacy</h2>
                        <div className="flex flex-col sm:flex-row gap-2.5">
                          <a
                            href="https://github.com/richmondsogo/canji/blob/main/PRIVACY_POLICY.md"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center space-x-1.5 px-3 py-2 rounded-lg border border-border text-xs font-medium hover:bg-secondary/40 transition-colors"
                          >
                            <span>Privacy Policy</span>
                            <ArrowSquareOut weight="bold" className="h-3 w-3 opacity-60" />
                          </a>
                          <a
                            href="https://github.com/richmondsogo/canji/issues"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center space-x-1.5 px-3 py-2 rounded-lg border border-border text-xs font-medium hover:bg-secondary/40 transition-colors"
                          >
                            <span>Report an issue</span>
                            <ArrowSquareOut weight="bold" className="h-3 w-3 opacity-60" />
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </main>
            </SidebarProvider>
          </Card>
        </div>

        <Toaster position="bottom-right" />
      </div>
    </TooltipProvider>
  );
}

const rootEl = document.getElementById("root");
if (rootEl) {
  createRoot(rootEl).render(<OptionsApp />);
}
