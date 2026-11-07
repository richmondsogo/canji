# Changelog

All notable changes to **Canji** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.0.0] - 2026-11-07

### Added
- **In-Page Price Conversion & Reversible DOM Engine**:
  - Converts prices directly in place across international web pages while preserving page layout and typography.
  - Three display modes: **Replace in place**, **Beside original** (`€249.00 ($277.14)`), and **Replace and highlight**.
  - 100% byte-for-byte DOM restoration via `WeakMap` original node preservation when clicking **Show original**.
  - Split-price assembly for multi-element e-commerce price structures (Amazon split whole/fraction spans, `<sup>` cents, and nested inline spans) and open Shadow DOM traversal.
- **Type 4 Per-Site `Convert from → to` Currency Rules (`Sites`)**:
  - Unified `CurrencyPairChip` (`[ Auto → USD ⌄ ]`) and `Ask | Always | Never` `SegmentedControl` in Settings → **Sites** and the Toolbar Popup.
  - Real-time two-way synchronization between Popup, Settings, and already-open browser tabs (`syncOpenTabsWithSettings`), plus an inline warning when **From** and **To** are set to the same currency.
- **Numbered `FieldArray` Pinned Currencies (`Currencies`)**:
  - Live direct-swap `CurrencyCombobox` rows (`1`–`8`) with move-up, move-down, and remove controls plus quick-add popular currency chips.
- **Option A Paper & Pine Design System & Native Two-Font Discipline**:
  - Unified `34px` `SegmentedControl` with sage-tinted tracks (`--seg-track`) and Deep Pine active thumbs (`#194A39` Light / `#1D523F` Dark), Deep Pine-Charcoal primary actions (`#14211B`), Pine Green `LiquidToggle` switches, and Pine Green `::selection` text highlights.
  - Strict two-font native device typography (`ui-sans-serif` and tabular `ui-monospace`) with zero webfont network/decode overhead and a `12px` minimum type floor.
- **Theme-Aware On-Page Toolbar (`src/content/ui.js`, `src/content/ui.css`)**:
  - Isolated inside an open Shadow DOM root (`#cc-dynamic-island-host`) and styled with Paper & Pine CSS custom properties (`--cc-*`) that follow Light, Dark, and System themes before first paint.
  - Supports both **Ask** offer prompts (`Found N CUR prices · Convert to TARGET? [Convert] [Always] [×]`) and **Converted** controls (`Original` / `Converted` toggle, target currency picker, and session dismiss).
  - Interactive hover tooltip on converted prices displaying the original amount, source currency, and exchange rate used.
- **170+ Currencies & 3-Tier Exchange Rate Engine**:
  - Supports 162 ISO 4217 fiat currencies and 14 major cryptocurrencies.
  - Fetches base-EUR reference rates from the European Central Bank (Frankfurter API) with automatic fallback to Fawaz Ahmed Currency API (jsDelivr CDN and Cloudflare Pages) and an offline fallback table.

### Fixed & Hardened
- **`Always` Auto-Convert Permission & Live Tab Sync**:
  - Fixed `requestOriginPermission` in `src/shared/browser.js` to normalize domain match patterns (`*://*.domain.com/*`) and invoke `permissions.request` synchronously inside the user gesture before any `await`, eliminating false `"Canji needs permission to run on..."` errors.
  - Added `syncOpenTabsWithSettings` in `src/background.js` so toggling a site to `Always` or `Never` in Settings immediately converts or restores open tabs for that domain.
- **Security & Production Hardening (`CANJI-SEC-001` – `CANJI-SEC-003`)**:
  - Bound `MSG.ACCEPT_ALWAYS_SITE`, `MSG.DISMISS_OFFER`, and `MSG.CHECK_OFFER_ELIGIBILITY` strictly to `sender.tab.url` (`resolveTrustedSenderHost`) to prevent cross-origin hostname spoofing.
  - Hardened `normalizeHost` and `migrateSettings` in `src/shared/settings.js` against prototype-key collisions (`__proto__`, `constructor`, `prototype`) and unvalidated schema v3 fields on JSON import.
  - Added an explicit MV3 `content_security_policy` (`script-src 'self'; object-src 'self'; base-uri 'none';`) to generated Chrome and Firefox manifests.
- **Build & Bundle Optimization (-59.8% Release ZIP Reduction)**:
  - Cleaned stale `.woff`/`.woff2` font artifacts from `dist/` and enabled `minify: true` on `content.js` (`196.1 KB` → `119.4 KB`) and `background.js` (`95.0 KB` → `47.6 KB`), reducing `canji-chrome-v2.0.0.zip` and `canji-firefox-v2.0.0.zip` from `1,077 KB` to `433 KB`.
