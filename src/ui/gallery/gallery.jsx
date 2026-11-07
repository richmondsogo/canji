import React, { useState, useEffect } from "react"
import { createRoot } from "react-dom/client"
import { Toaster } from "../components/ui/sonner"
import { toast } from "sonner"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Switch } from "../components/ui/switch"
import { SegmentedControl } from "../components/ui/segmented-control"
import { Separator } from "../components/ui/separator"
import { Badge } from "../components/ui/badge"
import { ScrollArea } from "../components/ui/scroll-area"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../components/ui/tooltip"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../components/ui/command"
import {
  Sun,
  Moon,
  Laptop,
  Check,
  ChevronsUpDown,
  Search,
  Globe,
  Settings,
  Shield,
  Coins,
  Palette,
  Info,
  ExternalLink,
  Plus,
  Trash2
} from "lucide-react"
import { CURRENCIES_DATA } from "../../shared/currencies-data"

const CURRENCY_SYMBOLS = [
  { code: "NGN", symbol: "₦", amount: "₦12,500.00", name: "Nigerian Naira" },
  { code: "EUR", symbol: "€", amount: "€49.99", name: "Euro" },
  { code: "GBP", symbol: "£", amount: "£35.00", name: "British Pound" },
  { code: "JPY", symbol: "¥", amount: "¥5,800", name: "Japanese Yen" },
  { code: "INR", symbol: "₹", amount: "₹1,499.00", name: "Indian Rupee" },
  { code: "TRY", symbol: "₺", amount: "₺250.00", name: "Turkish Lira" },
  { code: "RUB", symbol: "₽", amount: "₽3,200.00", name: "Russian Ruble" },
  { code: "KRW", symbol: "₩", amount: "₩45,000", name: "South Korean Won" },
  { code: "GHS", symbol: "₵", amount: "₵320.00", name: "Ghanaian Cedi" },
  { code: "PHP", symbol: "₱", amount: "₱1,850.00", name: "Philippine Peso" },
]

const COLOR_TOKENS = [
  {
    theme: "Light Palette",
    tokens: [
      { name: "Background", hex: "#F7F5F0", role: "Page canvas", surface: true },
      { name: "Raised / Hover", hex: "#EFECE5", role: "Interactive surfaces", surface: true },
      { name: "Hairline", hex: "#E2DED4", role: "Section borders", surface: true },
      { name: "Text (Foreground)", hex: "#191815", role: "Primary typography", ratio: 16.30, contrast: "16.30:1", level: "AAA" },
      { name: "Muted Text", hex: "#67635A", role: "Secondary labels", ratio: 5.49, contrast: "5.49:1", level: "AA" },
      { name: "Accent (Pine)", hex: "#1E6B52", role: "Active / Focus / Link", ratio: 5.88, contrast: "5.88:1", level: "AA" },
      { name: "Warning", hex: "#A15C07", role: "Stale rates / alerts", ratio: 4.76, contrast: "4.76:1", level: "AA" },
      { name: "Danger", hex: "#B3261E", role: "Errors / removal", ratio: 6.00, contrast: "6.00:1", level: "AA" },
    ]
  },
  {
    theme: "Dark Palette",
    tokens: [
      { name: "Background", hex: "#10100E", role: "Page canvas", surface: true },
      { name: "Raised / Hover", hex: "#181816", role: "Interactive surfaces", surface: true },
      { name: "Hairline", hex: "#2A2926", role: "Section borders", surface: true },
      { name: "Text (Foreground)", hex: "#ECE9E2", role: "Primary typography", ratio: 15.71, contrast: "15.71:1", level: "AAA" },
      { name: "Muted Text", hex: "#9B968B", role: "Secondary labels", ratio: 6.47, contrast: "6.47:1", level: "AA" },
      { name: "Accent (Mint Pine)", hex: "#6FD3A6", role: "Active / Focus / Link", ratio: 10.47, contrast: "10.47:1", level: "AAA" },
      { name: "Warning", hex: "#E5A038", role: "Stale rates / alerts", ratio: 8.54, contrast: "8.54:1", level: "AAA" },
      { name: "Danger", hex: "#E87068", role: "Errors / removal", ratio: 6.30, contrast: "6.30:1", level: "AA" },
    ]
  }
]

export function Gallery() {
  const [theme, setTheme] = useState("system")
  const [targetCurrency, setTargetCurrency] = useState("NGN")
  const [currencyOpen, setCurrencyOpen] = useState(false)
  const [currencySearch, setCurrencySearch] = useState("")
  const [autoConvert, setAutoConvert] = useState(true)
  const [customApi, setCustomApi] = useState("")
  const [newSite, setNewSite] = useState("")
  const [sites, setSites] = useState([
    { domain: "amazon.com", mode: "always" },
    { domain: "ebay.co.uk", mode: "ask" },
    { domain: "aliexpress.com", mode: "never" },
  ])

  // Apply theme to document root
  useEffect(() => {
    const root = document.documentElement
    root.classList.remove("light", "dark")
    if (theme === "dark") {
      root.classList.add("dark")
      root.setAttribute("data-theme", "dark")
    } else if (theme === "light") {
      root.classList.add("light")
      root.setAttribute("data-theme", "light")
    } else {
      root.removeAttribute("data-theme")
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        root.classList.add("dark")
      }
    }
  }, [theme])

  const allCurrencies = Object.values(CURRENCIES_DATA).sort((a, b) =>
    a.code.localeCompare(b.code)
  )

  const filteredCurrencies = allCurrencies.filter(c =>
    c.code.toLowerCase().includes(currencySearch.toLowerCase()) ||
    c.name.toLowerCase().includes(currencySearch.toLowerCase())
  )

  const selectedCurrencyObj = CURRENCIES_DATA[targetCurrency] || {
    code: targetCurrency,
    name: "Unknown",
    symbol: targetCurrency
  }

  const handleAddSite = (e) => {
    e?.preventDefault()
    if (!newSite.trim()) return
    const cleanDomain = newSite.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "")
    if (sites.some(s => s.domain === cleanDomain)) {
      toast.error(`Rule for ${cleanDomain} already exists`)
      return
    }
    setSites([...sites, { domain: cleanDomain, mode: "always" }])
    setNewSite("")
    toast.success(`Rule added for ${cleanDomain}`)
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen bg-background text-foreground font-sans selection:bg-accent/20">
        {/* Navigation & Header */}
        <header className="border-b border-border bg-background/90 backdrop-blur sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-mono font-bold text-sm">
                ₦€
              </span>
              <div>
                <h1 className="font-semibold text-md tracking-tight">Canji</h1>
                <p className="text-xs text-muted-foreground">UI Foundation & Design System Gallery</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <span className="text-xs text-muted-foreground">Theme:</span>
              <SegmentedControl
                label="Theme"
                value={theme}
                onValueChange={(val) => val && setTheme(val)}
                size="sm"
                options={[
                  { value: "light", label: "Light", ariaLabel: "Light theme", icon: <Sun className="h-3.5 w-3.5" /> },
                  { value: "dark", label: "Dark", ariaLabel: "Dark theme", icon: <Moon className="h-3.5 w-3.5" /> },
                  { value: "system", label: "System", ariaLabel: "System theme", icon: <Laptop className="h-3.5 w-3.5" /> },
                ]}
              />
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-8 space-y-12">
          {/* Section 1: Typography Specimen */}
          <section id="typography" className="space-y-6">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold tracking-tight">1. Typography Specimen</h2>
                <Badge variant="outline" className="font-mono text-xs">Native UI Sans + Tabular Mono</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Native UI Sans for UI structure and text (400, 500, 600, 700); Tabular Mono for rates, hostnames, and financial figures.
              </p>
            </div>
            <Separator />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Native UI Sans */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Main Font (ui-sans-serif)
                </h3>
                <div className="space-y-3 bg-secondary/40 p-4 rounded-lg border border-border">
                  <div>
                    <span className="text-xs text-muted-foreground block mb-1">22px Bold (700)</span>
                    <p className="text-xl font-bold font-sans">Convert prices anywhere instantly</p>
                  </div>
                  <Separator />
                  <div>
                    <span className="text-xs text-muted-foreground block mb-1">16px SemiBold (600)</span>
                    <p className="text-md font-semibold font-sans">Settings & Site-Specific Conversion Rules</p>
                  </div>
                  <Separator />
                  <div>
                    <span className="text-xs text-muted-foreground block mb-1">14px Medium (500)</span>
                    <p className="text-base font-medium font-sans">Default target currency: NGN (Nigerian Naira)</p>
                  </div>
                  <Separator />
                  <div>
                    <span className="text-xs text-muted-foreground block mb-1">13px Regular (400)</span>
                    <p className="text-sm font-normal font-sans">Automatically convert prices when browsing Always-active domains.</p>
                  </div>
                  <Separator />
                  <div>
                    <span className="text-xs text-muted-foreground block mb-1">12px Regular (400)</span>
                    <p className="text-xs font-normal text-muted-foreground font-sans">Last updated 5 minutes ago • European Central Bank source</p>
                  </div>
                </div>
              </div>

              {/* Native Tabular Mono */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Mono Font (ui-monospace)
                </h3>
                <div className="space-y-3 bg-secondary/40 p-4 rounded-lg border border-border">
                  <div>
                    <span className="text-xs text-muted-foreground block mb-1">22px Monospace</span>
                    <p className="text-xl font-mono">1 USD = 1,485.50 NGN</p>
                  </div>
                  <Separator />
                  <div>
                    <span className="text-xs text-muted-foreground block mb-1">16px Monospace</span>
                    <p className="text-md font-mono">1 EUR = 1,612.20 NGN • 1.0850 USD</p>
                  </div>
                  <Separator />
                  <div>
                    <span className="text-xs text-muted-foreground block mb-1">14px Monospace</span>
                    <p className="text-base font-mono">domain: https://store.apple.com/us/buy-mac</p>
                  </div>
                  <Separator />
                  <div>
                    <span className="text-xs text-muted-foreground block mb-1">13px Monospace</span>
                    <p className="text-sm font-mono">hash: 83e7632 • rate_timestamp: 1729598400</p>
                  </div>
                  <Separator />
                  <div>
                    <span className="text-xs text-muted-foreground block mb-1">12px Monospace</span>
                    <p className="text-xs font-mono text-muted-foreground">CACHE_HIT [age: 182s, stale_limit: 86400s]</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 2: Currency-Symbol Line (Proof of Local Glyphs) */}
          <section id="currency-symbols" className="space-y-6">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold tracking-tight">2. Currency Symbol Specimen</h2>
                <Badge variant="outline" className="font-mono text-xs">Glyph Coverage Proof</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                10 international currency symbols rendered in bundled Familjen Grotesk (UI) and Fragment Mono (Amounts).
              </p>
            </div>
            <Separator />

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {CURRENCY_SYMBOLS.map((c) => (
                <div
                  key={c.code}
                  data-currency={c.code}
                  className="p-4 rounded-lg border border-border bg-secondary/30 space-y-2 hover:border-accent/40 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold px-1.5 py-0.5 rounded bg-secondary text-foreground">
                      {c.code}
                    </span>
                    <span
                      id={`symbol-grotesk-${c.code.toLowerCase()}`}
                      className="font-sans text-xl font-bold text-foreground"
                    >
                      {c.symbol}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{c.name}</p>
                  <p
                    id={`amount-mono-${c.code.toLowerCase()}`}
                    className="font-mono text-sm font-medium text-foreground tracking-tight"
                  >
                    {c.amount}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Section 3: Palette "Paper & Pine" Swatches & Contrast Ratios */}
          <section id="palette" className="space-y-6">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold tracking-tight">3. Color Palette "Paper & Pine"</h2>
                <Badge variant="outline" className="font-mono text-xs">Text-on-Background Ratios</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Warm paper background, ink primary, pine green semantic accent. Strict &ge; 4.5:1 text-to-background contrast across both themes.
              </p>
            </div>
            <Separator />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {COLOR_TOKENS.map((palette) => (
                <div key={palette.theme} className="space-y-3">
                  <h3 className="text-sm font-semibold tracking-wider uppercase text-muted-foreground">
                    {palette.theme}
                  </h3>
                  <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
                    {palette.tokens.map((token) => (
                      <div
                        key={token.name}
                        className="p-3 bg-secondary/30 flex items-center justify-between text-sm"
                      >
                        <div className="flex items-center space-x-3">
                          <span
                            className="w-6 h-6 rounded border border-black/10 shadow-inner inline-block"
                            style={{ backgroundColor: token.hex }}
                          />
                          <div>
                            <span className="font-medium text-foreground block">{token.name}</span>
                            <span className="text-xs text-muted-foreground font-mono">{token.hex} • {token.role}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          {token.surface ? (
                            <span className="font-mono text-xs text-muted-foreground block">
                              Surface
                            </span>
                          ) : (
                            <>
                              <span className="font-mono text-xs font-semibold text-foreground block">
                                {token.contrast}
                              </span>
                              <span className="text-[11px] text-accent font-medium">
                                {token.level} (Passes WCAG)
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Section 4: Realistic Settings Layout (Sidebar + Settings Column) */}
          <section id="settings-layout" className="space-y-6">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold tracking-tight">4. Realistic Options Page Layout</h2>
                <Badge variant="outline" className="font-mono text-xs">~220px Sidebar + ~640px Settings</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Demonstration of the planned Step 07 layout: no cards, hairlines and typography hierarchy, 4px spacing scale.
              </p>
            </div>
            <Separator />

            {/* Layout container */}
            <div className="rounded-lg border border-border bg-background p-6 flex flex-col md:flex-row gap-8">
              {/* Sidebar (~220px) */}
              <aside className="w-full md:w-[220px] shrink-0 space-y-1">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 mb-2">
                  Preferences
                </div>
                <nav className="space-y-1">
                  <button className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-sm font-semibold bg-secondary text-foreground">
                    <Settings aria-hidden="true" className="h-4 w-4 text-foreground" />
                    <span>General</span>
                  </button>
                  <button className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-sm font-normal text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-colors">
                    <Shield aria-hidden="true" className="h-4 w-4" />
                    <span>Site Rules</span>
                  </button>
                  <button className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-sm font-normal text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-colors">
                    <Coins aria-hidden="true" className="h-4 w-4" />
                    <span>Rates & API</span>
                  </button>
                  <button className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-sm font-normal text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-colors">
                    <Palette aria-hidden="true" className="h-4 w-4" />
                    <span>Appearance</span>
                  </button>
                  <button className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-sm font-normal text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-colors">
                    <Info aria-hidden="true" className="h-4 w-4" />
                    <span>About</span>
                  </button>
                </nav>
              </aside>

              {/* Settings Column (~640px) */}
              <div className="flex-1 max-w-[640px] space-y-6">
                <div>
                  <h3 className="text-md font-semibold text-foreground">General Settings</h3>
                  <p className="text-xs text-muted-foreground">Configure conversion triggers and target currency defaults.</p>
                </div>
                <Separator />

                {/* Settings Row 1: Switch */}
                <div className="flex items-center justify-between py-2">
                  <div className="space-y-0.5 pr-4">
                    <Label htmlFor="auto-convert" className="text-sm font-medium text-foreground cursor-pointer">
                      Auto-convert on page load
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically translate foreign currencies on Always-enabled websites.
                    </p>
                  </div>
                  <Switch
                    id="auto-convert"
                    checked={autoConvert}
                    onCheckedChange={setAutoConvert}
                  />
                </div>
                <Separator />

                {/* Settings Row 2: Combobox with 170 currencies */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 gap-4">
                  <div className="space-y-0.5 pr-4">
                    <Label className="text-sm font-medium text-foreground">
                      Default Target Currency
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Automatic conversions and context menus will always convert to this currency.
                    </p>
                  </div>

                  <Popover open={currencyOpen} onOpenChange={setCurrencyOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        id="currency-combobox-trigger"
                        variant="outline"
                        role="combobox"
                        aria-label="Default target currency"
                        aria-expanded={currencyOpen}
                        className="w-[200px] justify-between font-mono text-xs h-9 bg-background"
                      >
                        <span className="truncate">
                          {selectedCurrencyObj.code} ({selectedCurrencyObj.symbol})
                        </span>
                        <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[240px] p-0" align="end">
                      <Command>
                        <CommandInput
                          placeholder="Search 170+ currencies..."
                          value={currencySearch}
                          onValueChange={setCurrencySearch}
                          className="h-9 text-xs"
                        />
                        <CommandList>
                          <CommandEmpty className="py-4 text-center text-xs text-muted-foreground">
                            No currency found.
                          </CommandEmpty>
                          <CommandGroup heading="Currencies">
                            <ScrollArea className="h-56">
                              {filteredCurrencies.map((c) => (
                                <CommandItem
                                  key={c.code}
                                  value={`${c.code} ${c.name}`}
                                  onSelect={() => {
                                    setTargetCurrency(c.code)
                                    setCurrencyOpen(false)
                                    toast.success(`Default target set to ${c.code} (${c.name})`)
                                  }}
                                  className="text-xs font-mono flex items-center justify-between py-1.5"
                                >
                                  <div className="flex items-center">
                                    <Check
                                      className={`mr-2 h-3.5 w-3.5 ${
                                        targetCurrency === c.code ? "opacity-100" : "opacity-0"
                                      }`}
                                    />
                                    <span>{c.code}</span>
                                    <span className="ml-2 font-sans text-muted-foreground truncate max-w-[110px]">
                                      {c.name}
                                    </span>
                                  </div>
                                  <span className="font-mono text-xs text-muted-foreground ml-auto pl-2">{c.symbol}</span>
                                </CommandItem>
                              ))}
                            </ScrollArea>
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <Separator />

                {/* Settings Row 3: Text Input */}
                <div className="space-y-2 py-2">
                  <div className="space-y-0.5">
                    <Label htmlFor="custom-api" className="text-sm font-medium text-foreground">
                      Custom Rates API Endpoint
                    </Label>
                    <p id="custom-api-desc" className="text-xs text-muted-foreground">
                      Optional self-hosted exchange rate provider URL (JSON format).
                    </p>
                  </div>
                  <Input
                    id="custom-api"
                    aria-describedby="custom-api-desc"
                    placeholder="https://api.frankfurter.app/latest"
                    value={customApi}
                    onChange={(e) => setCustomApi(e.target.value)}
                    className="font-mono text-xs h-9 bg-background"
                  />
                </div>
                <Separator />

                {/* Site-rules list with 3-way toggle per row */}
                <div className="space-y-4 pt-2">
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">Site Rules</h4>
                    <p className="text-xs text-muted-foreground">Set automatic conversion behavior per domain.</p>
                  </div>

                  <div className="divide-y divide-border/60">
                    {sites.map((s, idx) => (
                      <div
                        key={s.domain}
                        className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <span className="font-mono text-xs text-foreground font-medium">{s.domain}</span>
                        <div className="flex items-center space-x-2">
                          <SegmentedControl
                            label={`Conversion mode for ${s.domain}`}
                            value={s.mode}
                            size="sm"
                            onValueChange={(val) => {
                              if (!val) return
                              const next = [...sites]
                              next[idx].mode = val
                              setSites(next)
                              toast.info(`Updated rule for ${s.domain} to ${val.toUpperCase()}`)
                            }}
                            options={[
                              { value: "ask", label: "Ask", ariaLabel: `Ask conversion behavior for ${s.domain}` },
                              { value: "always", label: "Always", ariaLabel: `Always convert ${s.domain}` },
                              { value: "never", label: "Never", ariaLabel: `Never convert ${s.domain}` },
                            ]}
                          />

                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Remove rule for ${s.domain}`}
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => {
                              setSites(sites.filter((_, i) => i !== idx))
                              toast.info(`Removed rule for ${s.domain}`)
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add site row */}
                  <form onSubmit={handleAddSite} className="flex gap-2 pt-2">
                    <Input
                      id="new-site-input"
                      aria-label="New domain name to add rule for"
                      placeholder="Add domain (e.g. etsy.com)"
                      value={newSite}
                      onChange={(e) => setNewSite(e.target.value)}
                      className="font-mono text-xs h-8 bg-background flex-1"
                    />
                    <Button type="submit" size="sm" className="h-8 text-xs px-3">
                      <Plus className="h-3.5 w-3.5 mr-1" aria-hidden="true" /> Add site
                    </Button>
                  </form>
                </div>
              </div>
            </div>
          </section>

          {/* Section 5: Interactive Component Playground */}
          <section id="components" className="space-y-6">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold tracking-tight">5. Interactive Component Playground</h2>
                <Badge variant="outline" className="font-mono text-xs">Shadcn / Radix Primitive Verification</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Buttons, toasts, tooltips, focus states, and interactive feedback.
              </p>
            </div>
            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Buttons & Focus States */}
              <div className="space-y-4 p-5 rounded-lg border border-border bg-secondary/30">
                <h3 className="text-sm font-semibold text-foreground">Button Semantics</h3>
                <div className="flex flex-wrap gap-3">
                  <Button
                    id="btn-primary"
                    variant="default"
                    onClick={() => toast.success("Primary Ink button clicked")}
                  >
                    Primary (Ink)
                  </Button>
                  <Button
                    id="btn-secondary"
                    variant="secondary"
                    onClick={() => toast.info("Secondary button clicked")}
                  >
                    Secondary
                  </Button>
                  <Button
                    id="btn-ghost"
                    variant="ghost"
                    onClick={() => toast("Ghost action triggered")}
                  >
                    Ghost
                  </Button>
                  <Button
                    id="btn-destructive"
                    variant="destructive"
                    onClick={() => toast.error("Danger / Destructive action")}
                  >
                    Destructive
                  </Button>
                </div>

                <div className="pt-2 space-y-2">
                  <span className="text-xs text-muted-foreground block">Pine Green Focus Ring Test (Tab to focus):</span>
                  <div className="flex gap-3">
                    <Input placeholder="Focus me to see ring" className="text-xs h-8 bg-background max-w-[200px]" />
                    <Button variant="outline" size="sm" className="h-8 text-xs">Focusable Button</Button>
                  </div>
                </div>
              </div>

              {/* Tooltip & Feedback */}
              <div className="space-y-4 p-5 rounded-lg border border-border bg-secondary/30">
                <h3 className="text-sm font-semibold text-foreground">Feedback & Tooltips</h3>
                <div className="flex items-center space-x-4">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button id="btn-tooltip" variant="outline" size="sm" className="h-8 text-xs">
                        Hover for Tooltip
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="text-xs font-mono">
                      Alt+Shift+C: Toggle Price Conversion
                    </TooltipContent>
                  </Tooltip>

                  <Button
                    id="btn-trigger-toast"
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    onClick={() => {
                      toast.success("Rates refreshed from ECB", {
                        description: "170 currencies updated at 150ms ease-out"
                      })
                    }}
                  >
                    Trigger Success Toast
                  </Button>
                </div>

                <div className="pt-2">
                  <span className="text-xs text-muted-foreground block mb-2">Badge Variants:</span>
                  <div className="flex gap-2">
                    <Badge variant="default">Active</Badge>
                    <Badge variant="secondary">Cached</Badge>
                    <Badge variant="outline">Manual</Badge>
                    <Badge variant="destructive">Stale (3d)</Badge>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>

        {/* Footer with Build Stamp */}
        <footer className="border-t border-border mt-16 py-6 text-xs text-muted-foreground">
          <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono">
            <div id="build-stamp">
              Canji v{typeof __BUILD_VERSION__ !== "undefined" ? __BUILD_VERSION__ : "2.0.0"} ({typeof __BUILD_GIT_SHA__ !== "undefined" ? __BUILD_GIT_SHA__ : "dev"})
            </div>
            <div>
              Build Time: {typeof __BUILD_TIME__ !== "undefined" ? __BUILD_TIME__ : new Date().toISOString()}
            </div>
            <div className="text-muted-foreground/80">
              Dev Review Gallery • Not packaged in extension ZIPs
            </div>
          </div>
        </footer>

        <Toaster />
      </div>
    </TooltipProvider>
  )
}

const rootElement = document.getElementById("root")
if (rootElement) {
  createRoot(rootElement).render(<Gallery />)
}
