---
name: canji
version: 2.0.0
description: Paper & Pine design system for the Canji browser extension.
palette:
  light:
    background: "#F7F5F0"
    raised: "#EFECE5"
    hairline: "#E2DED4"
    text: "#191815"
    muted: "#67635A"
    accent: "#1E6B52"
    warning: "#A15C07"
    danger: "#B3261E"
  dark:
    background: "#10100E"
    raised: "#181816"
    hairline: "#2A2926"
    text: "#ECE9E2"
    muted: "#9B968B"
    accent: "#6FD3A6"
    warning: "#E5A038"
    danger: "#E87068"
typography:
  ui-text:
    fontFamily: "'Familjen Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif"
    weights: [400, 500, 600, 700]
  mono:
    fontFamily: "'Fragment Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
    weights: [400]
  pill-text:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif"
    weights: [400, 500, 600]
scales:
  type: [12, 13, 14, 16, 20]
  spacing: [4, 8, 12, 16, 24, 32]
  radius: "8px"
  hairline: "1px"
motion:
  duration: "150ms"
  easing: "cubic-bezier(0.16, 1, 0.3, 1)"
---

# Canji Design System — Paper & Pine

> **Project**: Canji ("Prices, in your currency")  
> **Version**: 2.0.0  
> **Aesthetic**: Paper & Pine — Warm Editorial Minimalism  
> **Architecture**: Cross-Browser Web Extension (Manifest V3)  

---

## 1. Overview & Brand Identity

**Canji** *(from Hausa `canji`, meaning change or exchange)* uses a tactile, high-contrast visual language inspired by archival paper and precision instruments:
- **Brand Symbol (`src/ui/components/CanjiLogo.jsx`)**: Optical-cut nested hexagonal mark in three responsive cuts (`small` 2-layer for `<= 20px`, `main` 2-layer for `22px–48px`, and `feature` 3-layer for `>= 64px` with an inner Pine `#1E6B52` / `#6FD3A6` accent).
- **Warm Surfaces**: Unbleached paper canvas (`#F7F5F0` light) and warm obsidian (`#10100E` dark).
- **Hairline Division**: Crisp `1px` structural borders (`#E2DED4` light, `#2A2926` dark).
- **Ink Primary Actions**: Near-black ink (`#191815` light) and warm off-white (`#ECE9E2` dark) for primary buttons and active headings.
- **Pine Accents**: Evergreen pine (`#1E6B52` light) and luminous mint pine (`#6FD3A6` dark) reserved for checked switches, active conversion status dots, and converted price highlights.

---

## 2. Color Tokens & WCAG Contrast Compliance

Every foreground/background pair is tested in `tests/contrast.test.js` and `tests/pill_theme.test.js` to exceed WCAG 2.1 AA ($\ge 4.5:1$):

| Token | Light Mode | Contrast on Light | Dark Mode | Contrast on Dark |
|---|---|---|---|---|
| **Background (`--background`)** | `#F7F5F0` | — | `#10100E` | — |
| **Raised / Sidebar (`--secondary`, `--sidebar-background`)** | `#EFECE5` | — | `#181816` | — |
| **Hairline Border (`--border`, `--sidebar-border`)** | `#E2DED4` | — | `#2A2926` | — |
| **Foreground (`--foreground`)** | `#191815` | **16.30:1** (AAA) | `#ECE9E2` | **15.71:1** (AAA) |
| **Muted (`--muted-foreground`)** | `#67635A` | **5.49:1** (AA) | `#9B968B` | **6.47:1** (AA) |
| **Accent Pine (`--accent`)** | `#1E6B52` | **5.88:1** (AA) | `#6FD3A6` | **10.47:1** (AAA) |
| **Warning (`--warning`)** | `#A15C07` | **4.76:1** (AA) | `#E5A038` | **8.54:1** (AAA) |
| **Danger (`--destructive`)** | `#B3261E` | **6.00:1** (AA) | `#E87068` | **6.30:1** (AA) |

---

## 3. Typography & Minimum Font Scale

All extension page fonts are bundled locally in WOFF2 format (`@fontsource/familjen-grotesk` and `@fontsource/fragment-mono`). Remote font requests are prohibited.

1. **UI Sans (`--font-sans`)**: `Familjen Grotesk` (`400`, `500`, `600`, `700`) for headings, labels, descriptions, and actions.
2. **Tabular Monospace (`--font-mono`)**: `Fragment Mono` (`400`) with `font-variant-numeric: tabular-nums` for currency codes, amounts, domains, and timestamps.
3. **In-Page Toolbar Font Stack**: Uses the host system UI font stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif`) inside Shadow DOM so no extension font assets need to be exposed via `web_accessible_resources`.
4. **Minimum Type Scale**: No rendered text in the Popup or Settings page may fall below **`12px` (`text-xs`)** (enforced by automated E2E checks in `tests/e2e/f1-pill-theme.e2e.js`).

---

## 4. Extension Surfaces

### A. Settings Dashboard (`src/options/options.jsx`)
- **Shell Architecture (`Settings2` Pattern)**:
  - Unified `Card` (`max-w-4xl`) housing a `SidebarProvider` (`min-h-[600px]`, `--sidebar-width: 14rem`).
  - Left `Sidebar` (`collapsible="none"`, `self-stretch border-r`) with `SidebarHeader` (`CanjiLockup`), `SidebarContent` (`SETTINGS` group with 6 sections and Phosphor icons: `Faders`, `Coins`, `GlobeHemisphereWest`, `Swatches`, `Archive`, `Compass`), and `SidebarFooter` (`Light` / `Dark` / `System` theme switcher).
  - Right `<main>` content pane (`flex-1 p-6 sm:p-8`) with section title, description, `<Separator />`, and controls.
- **General Section**:
  - 2-column top grid (`grid gap-4 sm:grid-cols-2`) for **Default currency** and **Which dollar is "$"?**, followed by **On new sites** (`Ask` / `Always`) and switch rows (**Show on-page toolbar**, **Round to whole numbers**, **Sound effects**, **Show cryptocurrencies**).
- **Sites Section**:
  - **Add a site** form and **Your sites** list with explicit **Convert from** (`Auto-detect` or currency) `→` **to** (`Default (CUR)` or per-site currency) comboboxes, 3-way `Ask | Always | Never` mode control, and inline same-currency warning.
- **Appearance Section**:
  - Theme selector and 3-column **Display mode** interactive radio cards (`Replace in place`, `Beside original`, `Replace and highlight`) with stacked `Preview` boxes that never overflow horizontally.

### B. Toolbar Popup (`src/popup/popup.jsx`)
- **Dimensions**: `360px` width, `580px` max height, `16px` (`p-4`) padding.
- **Header**: `CanjiLockup` (`small` cut) and Settings icon button (`#btn-open-options`, `Faders`).
- **Explicit `From → To` Converter Block**:
  - Heading (`Convert prices on <hostname>`) and `Default (CUR)` badge.
  - Two-column `From` (`#site-currency-override` inside `#from-display`) `→` `To` (`#picker-to-btn`) searchable `CurrencyCombobox` pair synced with `settings.perSite[hostname]`.
  - 4-column pinned currency quick-select grid (`role="group"`).
- **Primary Action & Live Status**:
  - `#btn-convert-toggle` switching between `Convert to <CUR>` and `Show original`.
  - `#live-status` (`role="status"`, `aria-live="polite"`) with semantic status dot.
- **Site Rule & Footer**:
  - Active hostname in `Fragment Mono` with `Ask | Always | Never` segmented control and `Reset` button.
  - Footer with rate provider/date freshness (`#rates-freshness-text`) and `Settings` link (`#link-options`).

### C. In-Page Floating Toolbar (`src/content/ui.js`, `src/content/ui.css`)
- **Isolation**: Mounted inside an open Shadow DOM root (`#cc-dynamic-island-host`) at `top: 16px; left: 50%; transform: translate3d(-50%, 0, 0)`.
- **Theme-Aware Material (ADR 0015)**: Uses `--cc-*` custom properties scoped to `.cc-island-container`, honoring `light`, `dark`, and `system` themes before first paint, with solid surface fallbacks for `prefers-reduced-transparency: reduce` and `prefers-contrast: more`.
- **Modes**:
  - **Offer (`Ask`) Mode (`.cc-mode-offer`)**: Prompts `Found N CUR prices · Convert to TARGET?` with `[Convert]`, `[Always]`, and `[×]` dismiss buttons.
  - **Converted Mode (`.cc-mode-converted`)**: Compact pill showing active pine dot, `SRC → TGT`, and converted count badge; expands on hover/focus to reveal `Original` / `Converted` segmented switch, inline currency picker popover, and dismiss button.
