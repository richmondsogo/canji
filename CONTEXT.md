# Product & Architecture Context: Canji

## 1. Overview
**Canji** (*"Prices, in your currency"*, from Hausa `canji` meaning change or exchange) is a privacy-first, cross-browser Manifest V3 extension that detects foreign currency prices on web pages and converts them in place using live exchange rates.

---

## 2. Entry Points & User Flows

All conversion flows route through a unified pipeline between `src/background.js` and `src/content/content.js`:

1. **Automatic Site Rules (`Always` & `Ask` modes)**:
   - `content.js` runs at `document_idle` on `http/https` pages (and is also triggered by `background.js` on tab updates, SPA URL navigations, tab activation, settings updates via `syncOpenTabsWithSettings`, and browser startup).
   - It reads `currency_converter_settings_v2` directly from `chrome.storage.local` so cold MV3 service-worker startups on fresh browser launches never delay or drop site rules.
   - **`Always` mode**: Immediately converts detected prices using the site's configured `From → To` currencies (or global defaults) and attaches a `MutationObserver` + post-hydration checks so prices rendered asynchronously by JavaScript convert automatically and mount the top-center toolbar.
   - **`Ask` mode**: Scans candidate prices (with a debounced `MutationObserver` for dynamically hydrated pages) and mounts the top-center offer toolbar (`Found N CUR prices · Convert to TARGET? [Convert] [Always] [×]`).
   - **`Never` mode**: Takes no action on the site (and reverts already-converted open tabs when switched to `Never`).

2. **Toolbar Popup (`src/popup/popup.jsx`)**:
   - Features a header live status indicator (`● Ready to convert` / `● N prices converted`), a framed converter well with explicit **From** (`Auto-detect` or per-site source currency override) `→` **To** (`Default` or per-site target currency) comboboxes, pinned currency quick-chips, a 1-click **Convert to CUR** / **Show original** toggle, and a single-line `🌐 domain.com [Ask | Always | Never]` rule row.
   - All per-site changes sync two-way with `settings.perSite[hostname]` in Settings.

3. **Settings Dashboard (`src/options/options.jsx`)**:
   - Unified `Card` + `Sidebar` dashboard (`General`, `Currencies`, `Sites`, `Appearance`, `Backup & reset`, `About`) styled with the Option A **Paper & Pine** palette (`#14211B` Deep Pine-Charcoal primary, `#194A39` / `#1D523F` Deep Pine `SegmentedControl` thumb, `#1E6B52` / `#6FD3A6` Pine accent, and Pine `::selection` text highlight).
   - **Currencies**: Numbered `FieldArray` list where each row is a direct-swap `CurrencyCombobox` with reorder/delete buttons.
   - **Sites**: Flat inline `Add site` bar and `divide-y` site list using `CurrencyPairChip` (`[ Auto → USD ⌄ ]`) and `34px` `SegmentedControl`.

4. **Right-Click Context Menu (`src/background.js`)**:
   - **Convert prices on this page**: Converts all prices on the active tab.
   - **Convert "<selection>" to CUR**: Converts a highlighted price string and displays a native desktop notification.

---

## 3. Architecture Diagram

```text
┌────────────────────────────────────────────────────────────────────────┐
│                          Browser Tab (Top Frame)                       │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │            src/content/content.js (119.4 KB minified)            │  │
│  │  - Self-evaluates site rules on document_idle via storage.local  │  │
│  │  - PageScanner (src/content/scanner.js):                         │  │
│  │      • Two-phase DOM walker + innermost-first split-price join   │  │
│  │      • Open Shadow DOM traversal                                 │  │
│  │      • WeakMap byte-for-byte revert fidelity                     │  │
│  │      • Debounced MutationObserver for SPA / async prices         │  │
│  │  - InPageUI (src/content/ui.js + ui.css):                        │  │
│  │      • Theme-aware Paper & Pine toolbar inside Shadow DOM        │  │
│  │      • Offer mode (Ask) & Converted mode capsules                │  │
│  └──────────────────────────────────┬───────────────────────────────┘  │
└─────────────────────────────────────┼──────────────────────────────────┘
                                      │
                   chrome.storage & Typed Messages (src/shared/messaging.js)
                                      ▼
┌────────────────────────────────────────────────────────────────────────┐
│        Background Service Worker (src/background.js — 47.6 KB)         │
│                                                                        │
│  - 3-Tier RatesEngine (src/shared/rates.js):                           │
│      1. European Central Bank (Frankfurter API)                        │
│      2. Fawaz Ahmed Currency API (jsDelivr CDN)                        │
│      3. Fawaz Ahmed Currency API (Cloudflare Pages) + Offline Fallback │
│  - SettingsManager (src/shared/settings.js, schema v3 allowlisted)     │
│  - Trusted tab sender hostname resolution (resolveTrustedSenderHost)   │
│  - Real-time open-tab sync on settings update (syncOpenTabsWithSettings)│
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
              ┌────────────────────┴────────────────────┐
              ▼                                         ▼
   ┌───────────────────────┐                 ┌───────────────────────┐
   │  src/popup/popup.jsx  │                 │src/options/options.jsx│
   │  Framed From -> To    │                 │ Settings2 Card +      │
   │  well & site rule row │                 │ Sidebar dashboard     │
   └───────────────────────┘                 └───────────────────────┘
```

---

## 4. Production Invariants
- **Zero `innerHTML`**: `innerHTML`, `outerHTML`, `insertAdjacentHTML`, and `dangerouslySetInnerHTML` are strictly forbidden across all source files (`AGENTS.md`, ADR 0008).
- **100% Local Bundling & Zero Webfont Bloat**: Compiled via `node build.js` (`esbuild`) into `dist/chrome/`, `dist/firefox/`, and release archives in `dist/packages/` (`~433 KB`). Uses native OS `ui-sans-serif` and `ui-monospace` font stacks.
- **Cross-Browser Parity**: Verified across Chromium (`134` unit tests + `15` Playwright E2E suites) and Mozilla Firefox MV3 (`tests/firefox-smoke.test.js` and `npm run lint:firefox` with `0 errors, 0 notices`).
