---
name: canji
version: 2.0.0
description: Paper & Pine design system for the Canji browser extension.
palette:
  light:
    background: "#F7F5F0"
    raised: "#EFECE5"
    hairline: "#E2DED4"
    text: "#141C18"
    primary: "#14211B"
    segThumb: "#194A39"
    muted: "#5C6660"
    accent: "#1E6B52"
    warning: "#A15C07"
    danger: "#B3261E"
  dark:
    background: "#10100E"
    raised: "#181816"
    hairline: "#2A2926"
    text: "#ECE9E2"
    primary: "#ECE9E2"
    segThumb: "#1D523F"
    muted: "#9B968B"
    accent: "#6FD3A6"
    warning: "#E5A038"
    danger: "#E87068"
typography:
  ui-text:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    weights: [400, 500, 600, 700]
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace"
    weights: [400]
scales:
  type: [12, 13, 14, 16, 20]
  spacing: [4, 8, 12, 16, 24, 32]
  radius: "9px"
  hairline: "1px"
motion:
  duration: "150ms"
  easing: "cubic-bezier(0.16, 1, 0.3, 1)"
---

# Canji Design System — Paper & Pine

> **Project**: Canji ("Prices, in your currency")  
> **Version**: 2.0.0  
> **Aesthetic**: Paper & Pine — Warm Editorial Minimalism with Botanical Pine Cohesion  
> **Architecture**: Cross-Browser Web Extension (Manifest V3)  

---

## 1. Overview & Brand Identity

**Canji** *(from Hausa `canji`, meaning change or exchange)* uses a tactile, high-contrast visual language inspired by archival paper and precision instruments:
- **Brand Symbol (`src/ui/components/CanjiLogo.jsx`)**: Optical-cut nested hexagonal mark in three responsive cuts (`small` 2-layer for `<= 20px`, `main` 2-layer for `22px–48px`, and `feature` 3-layer for `>= 64px` with an inner Pine `#1E6B52` / `#6FD3A6` accent).
- **Warm Surfaces**: Unbleached paper canvas (`#F7F5F0` light) and warm obsidian (`#10100E` dark).
- **Hairline Division**: Crisp `1px` structural borders (`#E2DED4` light, `#2A2926` dark).
- **Deep Pine-Charcoal Primary Actions (`#14211B`)**: In Light Mode, primary buttons (`Convert to ...`, `Add site`) use Deep Pine-Charcoal (`#14211B`, hover `#1A2E25`) so dark actions sit in the same cool-botanical color family as Pine Green (`#1E6B52`) rather than clashing as warm brown-black.
- **Pine-Tinted `SegmentedControl` (`#194A39` / `#1D523F`)**: Every `SegmentedControl` across the Sidebar, `General`, `Sites`, `Appearance`, and `Popup` shares a `34px` sage-tinted track (`--seg-track`) and a Deep Pine active thumb (`#194A39` in Light Mode with `#F7F5F0` text; `#1D523F` in Dark Mode with `#F2F7F4` text and a `1px` `rgba(111, 211, 166, 0.32)` mint-pine inner rim).
- **Pine Accents & Selection Highlight (`::selection`)**: Evergreen pine (`#1E6B52` light) and luminous mint pine (`#6FD3A6` dark) are used for active `LiquidToggle` switches, active conversion status dots, custom currency pair chips, selected Display Mode cards, and text selection highlights (`::selection` at `24%` / `32%` `--accent`).

---

## 2. Color Tokens & WCAG Contrast Compliance

Every foreground/background pair is verified in `tests/contrast.test.js` and `tests/pill_theme.test.js` to exceed WCAG 2.1 AA ($\ge 4.5:1$):

| Token | Light Mode | Contrast on Light | Dark Mode | Contrast on Dark |
|---|---|---|---|---|
| **Background (`--background`)** | `#F7F5F0` | — | `#10100E` | — |
| **Raised / Sidebar (`--secondary`, `--sidebar-background`)** | `#EFECE5` | — | `#181816` | — |
| **Hairline Border (`--border`, `--sidebar-border`)** | `#E2DED4` | — | `#2A2926` | — |
| **Foreground (`--foreground`)** | `#141C18` | **15.9:1** (AAA) | `#ECE9E2` | **15.71:1** (AAA) |
| **Primary Button (`--primary` / `--primary-foreground`)** | `#14211B` / `#F7F5F0` | **15.4:1** (AAA) | `#ECE9E2` / `#10100E` | **15.71:1** (AAA) |
| **Segmented Thumb (`--seg-thumb` / `--seg-thumb-fg`)** | `#194A39` / `#F7F5F0` | **9.6:1** (AAA) | `#1D523F` / `#F2F7F4` | **8.4:1** (AAA) |
| **Muted (`--muted-foreground`)** | `#5C6660` | **5.52:1** (AA) | `#9B968B` | **6.47:1** (AA) |
| **Accent Pine (`--accent`)** | `#1E6B52` | **5.88:1** (AA) | `#6FD3A6` | **10.47:1** (AAA) |
| **Warning (`--warning`)** | `#A15C07` | **4.76:1** (AA) | `#E5A038` | **8.54:1** (AAA) |
| **Danger (`--destructive`)** | `#B3261E` | **6.00:1** (AA) | `#E87068` | **6.30:1** (AA) |

---

## 3. Typography & Minimum Font Scale

All extension surfaces use strictly two font stacks — the host device's native UI font (`ui-sans-serif`) and native tabular monospace font (`ui-monospace`). Zero remote or custom webfont files are bundled or downloaded.

1. **Main UI Sans (`--font-sans`)**: `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif` (`400`, `500`, `600`, `700`) for headings, wordmarks, labels, descriptions, and actions across Settings, Popup, and the In-Page Toolbar.
2. **Tabular Monospace (`--font-mono`)**: `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace` (`400`) with `font-variant-numeric: tabular-nums` for currency codes, amounts, domains, indices, and dates.
3. **Minimum Type Scale**: No rendered text in the Popup or Settings page may fall below **`12px` (`text-xs`)** (enforced by automated E2E checks in `tests/e2e/f2-popup-contract.e2e.js`).

---

## 4. Extension Surfaces

### A. Settings Dashboard (`src/options/options.jsx`)
- **Shell Architecture (`Settings2` Pattern)**:
  - Unified `Card` (`max-w-4xl`) housing a `SidebarProvider` (`min-h-[600px]`, `--sidebar-width: 14rem`).
  - Left `Sidebar` (`collapsible="none"`, `self-stretch border-r`) with `SidebarHeader` (`CanjiLockup`), `SidebarContent` (`SETTINGS` group with 6 sections and Phosphor icons: `Faders`, `Coins`, `GlobeHemisphereWest`, `Swatches`, `Archive`, `Compass` — active item tinted with `--sidebar-accent` 9% Pine wash), and `SidebarFooter` (`Light` / `Dark` / `System` `34px` `SegmentedControl`).
  - Right `<main>` content pane (`flex-1 p-6 sm:p-8`) with a `68px` header bar and clean section controls.
- **General Section**:
  - 2-column top grid (`grid gap-4 sm:grid-cols-2`) for **Default currency** and **Which dollar is "$"?** (`34px` `CurrencyCombobox`), followed by **On new sites** (`Ask` / `Always` `SegmentedControl`) and `LiquidToggle` switch rows (**Show on-page toolbar**, **Round to whole numbers**, **Sound effects**, **Show cryptocurrencies**).
- **Currencies Section (`FieldArray` Direct-Swap Pattern)**:
  - Numbered `FieldArray` list (`1`–`8`) where each row is a live `34px` `CurrencyCombobox` with move-up (`↑`), move-down (`↓`), and remove (`×`) buttons, followed by a full-width dashed `Add currency` trigger and `Popular picks` quick-chips.
- **Sites Section (Type 4 Single-Chip Currency Pair + Full-Focus `SegmentedControl`)**:
  - Flat inline creation bar (`Website (e.g. ebay.com)` input + unified `CurrencyPairChip` `[ Auto → USD ⌄ ]` + `Ask | Always | Never` `SiteModeControl` + primary `Add site` button, all `34px` tall with `9px` radius).
  - Clean `divide-y divide-border` site rule rows (`🌐 domain.com` + `[ Auto → NGN ⌄ ]` `CurrencyPairChip` tinted Pine Green when customized + `Ask | Always | Never` `SiteModeControl` + `×` delete button).
- **Appearance Section**:
  - Theme selector (`Light | Dark | System`) and 3-column **Display mode** interactive radio cards (`Replace in place`, `Beside original`, `Replace and highlight`) with Pine Green selected border (`border-accent`) and stacked `PREVIEW` boxes that never overflow horizontally.

### B. Toolbar Popup (`src/popup/popup.jsx`)
- **Dimensions**: `360px` width, `580px` max height, `16px` (`p-4`) padding.
- **Header**: `CanjiLockup` (`small` cut), live status indicator (`#live-status` with semantic dot `● Ready to convert` / `● N prices converted`), and Settings icon button (`#btn-open-options`, `Faders`).
- **Framed `From → To` Converter Well**:
  - Rounded card well (`rounded-xl border border-border bg-card/55 p-3`) housing the two-column `From` (`Auto-detect` or site currency override) `→` `To` (`#picker-to-btn`) `34px` `CurrencyCombobox` pair, 4-column pinned currency quick-select grid (active chip highlighted in Pine Green), and full-width `#btn-convert-toggle` (`Convert to <CUR>` / `Show original`).
- **Single-Line Site Rule & Footer**:
  - Active hostname in monospace (`🌐 domain.com`) inline with the `34px` `Ask | Always | Never` `SiteModeControl` and optional `Reset` button.
  - Footer with rate provider/date freshness (`#rates-freshness-text`).

### C. In-Page Floating Toolbar (`src/content/ui.js`, `src/content/ui.css`)
- **Isolation**: Mounted inside an open Shadow DOM root (`#cc-dynamic-island-host`) at `top: 16px; left: 50%; transform: translate3d(-50%, 0, 0)`.
- **Theme-Aware Material (ADR 0015)**: Uses `--cc-*` custom properties scoped to `.cc-island-container`, honoring `light`, `dark`, and `system` themes before first paint.
- **Modes**:
  - **Offer (`Ask`) Mode (`.cc-mode-offer`)**: Prompts `Found N CUR prices · Convert to TARGET?` with `[Convert]`, `[Always]`, and `[×]` dismiss buttons.
  - **Converted Mode (`.cc-mode-converted`)**: Compact pill showing active pine dot, `SRC → TGT`, and converted count badge; expands on hover/focus to reveal `Original` / `Converted` segmented switch, inline currency picker popover, and dismiss button.
