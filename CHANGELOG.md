# Changelog

All notable changes to **Canji** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.0.0] - 2026-11-05

### Added
- **In-Page Price Conversion & Reversible DOM Engine**:
  - Converts prices directly in place across international web pages while preserving page layout and typography.
  - Three display modes: **Replace in place**, **Beside original** (`€249.00 ($277.14)`), and **Replace and highlight**.
  - 100% byte-for-byte DOM restoration via `WeakMap` original node preservation when clicking **Show original**.
  - Split-price assembly for multi-element e-commerce price structures (Amazon split whole/fraction spans, `<sup>` cents, and nested inline spans) and open Shadow DOM traversal.
- **Explicit Per-Site `Convert from → to` Currency Rules**:
  - Per-site rules in both the Toolbar Popup and Settings → Sites now explicitly configure **From** (`Auto-detect` or a specific source currency) and **To** (`Default` or a site-specific target currency) alongside site mode (`Ask`, `Always`, `Never`).
  - Real-time two-way synchronization between Popup and Settings via `chrome.storage.onChanged`, plus an inline warning when **From** and **To** are set to the same currency.
- **Theme-Aware On-Page Toolbar (`src/content/ui.js`, `src/content/ui.css`)**:
  - Isolated inside an open Shadow DOM root (`#cc-dynamic-island-host`) and styled with Paper & Pine CSS custom properties (`--cc-*`) that follow Light, Dark, and System themes before first paint.
  - Supports both **Ask** offer prompts (`Found N CUR prices. Convert to TARGET? [Convert] [Always] [×]`) and **Converted** controls (`Original` / `Converted` toggle, target currency picker, and session dismiss).
  - Interactive hover tooltip on converted prices displaying the original amount, source currency, and exchange rate used.
- **Settings Dashboard (`src/options/options.jsx`)**:
  - Built on a unified `Card` + `Sidebar` architecture with local `Familjen Grotesk` and `Fragment Mono` typography and Phosphor icons.
  - Manage default target currency, `$` disambiguation, default behavior on new sites (`Ask` vs `Always`), up to 8 pinned currencies, per-site rules, appearance preview cards, and JSON settings backup/restore.
- **170+ Currencies & 3-Tier Exchange Rate Engine**:
  - Supports 162 ISO 4217 fiat currencies and 14 major cryptocurrencies.
  - Fetches base-EUR reference rates from the European Central Bank (Frankfurter API) with automatic fallback to Fawaz Ahmed Currency API (jsDelivr CDN and Cloudflare Pages) and an offline fallback table.

### Fixed
- **Fresh Browser Launch & Dynamic Site Auto-Convert / Auto-Ask Reliability**:
  - Added declarative `content_scripts` (`document_idle`) with direct `chrome.storage.local` settings and rate cache reads so `Always` and `Ask` rules execute reliably on fresh browser launches without waiting on cold MV3 service-worker startups.
  - Mounted the on-page toolbar dynamically via `onConvertedCountChange` when prices hydrate asynchronously after initial page load.
  - Added `startOfferObserver` (debounced `MutationObserver` + post-hydration checks) and lowered default `minCandidateThreshold` to `1` so single-product pages and dynamically hydrated sites reliably display the `Ask` offer prompt.
- **Display Mode Preview Cards Overflow**:
  - Stacked the `Preview` label above the sample price inside the 3 Display mode radio cards in Settings → Appearance so long converted strings never overflow the card border.
- **Settings JSON Import & Session Offer Dismissal**:
  - Fixed JSON settings import to apply validated v2/v3 settings directly and persisted session offer dismissals in `chrome.storage.session`.

### Removed
- **Removed Unreliable `Alt+Shift+C` Keyboard Shortcut**:
  - Removed the `commands` manifest declaration and all UI/documentation references to keyboard shortcuts in favor of the toolbar popup, on-page toolbar, right-click context menu, and per-site rules.
