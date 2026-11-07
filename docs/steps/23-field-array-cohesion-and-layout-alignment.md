# Step 23: FieldArray Cohesion, Sites Redesign, Security & Performance Hardening, and Documentation Rewrite

**Status**: Complete  
**Branch**: `step/23-field-array-cohesion-and-layout-alignment`  
**Date**: 2026-11-07  

---

## 1. Scope & Approved Design Choices

1. **Toast Close (`×`) Button (`src/ui/components/ui/sonner.jsx`, `src/ui/globals.css`)**:
   - Enabled `closeButton` on `<Sonner />` and styled the inline right-aligned `×` close button (`[data-sonner-toast] [data-close-button]`) with Paper & Pine hover states.
2. **Strict Two-Font Discipline (`src/ui/components/CanjiLogo.jsx`, `package.json`, `DESIGN.md`, `src/content/ui.css`, `src/content/ui.js`, `src/ui/gallery/gallery.jsx`)**:
   - Reduced all typography across the extension to two font stacks: `font-sans` (`'Geist', -apple-system, ...`) and `font-mono` (`'Geist Mono', ui-monospace, ...`).
3. **Deep Pine-Charcoal Ink & Pine-Tinted SegmentedControl (`src/ui/globals.css`, `src/ui/components/ui/segmented-control.jsx`, `src/options/options.jsx`, `src/ui/components/CanjiLogo.jsx`)**:
   - Updated light-mode `--foreground` and `--primary` to `#14211B` (Deep Pine-Charcoal) and `--seg-thumb-bg` to `#1F5E45` (Pine-Tinted Forest Ink).
   - Added global `::selection` highlight rules (`rgba(30, 107, 82, 0.18)` in light mode, `rgba(111, 211, 166, 0.24)` in dark mode).
   - Unified `SegmentedControl` size to `h-8 p-1 rounded-lg` with `px-2.5 text-xs` items across Popup and all Settings pages.
   - Updated `.liq-well` (`--fill-on: var(--accent)`), `Appearance -> Display mode` selected card border/radio/preview, and `CanjiSymbol` inner cut fill to Pine Green.
4. **Unified `FieldArray` Component (`src/ui/components/ui/field-array.jsx`) & Currencies Redesign**:
   - Created `FieldArray` with staggered entry animation (`faIn`), tabular `1..N` indices, `Move up` (`↑`), `Move down` (`↓`), `Delete row` (`×`), `role="list"` / `role="listitem"`, and dashed `Add currency` Popover button + inline Popular Picks chips.
   - Removed the `6 of 8` count badge from the **Currencies** section header.
5. **Sites Redesign (Type 4: Single-Chip `SiteCurrencyPairSelect` + Full-Focus `SegmentedControl`)**:
   - Redesigned **Sites** in `src/options/options.jsx` around a single-line composer bar (`Website (e.g. ebay.com)` + `SiteCurrencyPairSelect` + `[Ask | Always | Never]` + `Add site`), a clean `divide-y` list of site rules with `GlobeHemisphereWest` duotone icons, single-chip `Auto → NGN` pair popover, `SiteModeControl`, and `×` delete button.
   - Removed the redundant `SITES · N` sub-header and the `N sites` count badge from the **Sites** section header.
6. **Popup Redesign & Always-Convert Host Permission Fix (`build.js`, `src/shared/browser.js`, `src/popup/popup.jsx`, `src/options/options.jsx`)**:
   - Framed `From → To`, the 4×2 Pinned Currencies grid, and `#btn-convert-toggle` inside a structured converter well, condensed the site rule into a single row (`🌐 hostname` + `[ Ask | Always | Never ]`), and moved `#live-status` to the bottom-right footer.
   - Added `host_permissions: ["<all_urls>"]` to the MV3 manifest in `build.js` with fallback in `ensureSitePermission()` (`src/shared/browser.js`) so setting any site to `Always` works seamlessly without false permission errors.
7. **Security, Performance & Production Readiness Audit (`docs/audits/2026-11-07-security-performance-production-audit.md`)**:
   - **Security (`CANJI-SEC-001`, `CANJI-SEC-002`, `CANJI-SEC-003`)**: Added `resolveTrustedSenderHost` in `src/background.js`, hardened `normalizeHost` and `migrateSettings` (v3 field allowlisting + prototype-key rejection) in `src/shared/settings.js`, and added explicit `content_security_policy.extension_pages` in `build.js`.
   - **Performance**: Cleaned `dist/` before builds, removed 64 dead `.woff`/`.woff2` font files, minified `content.js` and `background.js`, and removed unused dependencies (`framer-motion`, `lucide-react`, `next-themes`), cutting release ZIP size by **59.8%** (`1,077.4 KB` → `433.4 KB`).
8. **Production Screenshots & Documentation Rewrite**:
   - Regenerated all 9 production screenshots via `scripts/capture-production-screenshots.js` and rewrote `README.md`, `DESIGN.md`, `CHROMEWEBSTORE.md`, `CHANGELOG.md`, and `CONTEXT.md`.

---

## 2. Verification Results

### Build (`npm run build`)
```text
[Build] Bundling Canji v2.0.0 with esbuild...
[Build] esbuild bundling completed successfully.
[Build] Manifests generated for Chrome and Firefox.
[Build] Created package: canji-chrome-v2.0.0.zip (433.4 KB)
[Build] Created package: canji-firefox-v2.0.0.zip (433.5 KB)
```

### Unit, Security, Contrast & Firefox Smoke Tests (`npm test`)
```text
ℹ tests 134
ℹ suites 21
ℹ pass 134
ℹ fail 0
```

### Real-Browser E2E Tests (`node --test tests/e2e/options.e2e.js`)
```text
[Options E2E] All 10 test scenarios passed with 0 console errors.
ℹ tests 1
ℹ pass 1
ℹ fail 0
```

### Firefox MV3 Lint (`npm run lint:firefox`)
```text
Validation Summary:
errors          0
notices         0
warnings        0
```
