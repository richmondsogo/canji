# Step 21: Animated SegmentedControl, LiquidToggle, Native Device Fonts & Sites Page Redesign

**Status**: Complete  
**Branch**: `step/21-segmented-liquid-toggle-and-sites-redesign`  
**Date**: 2026-11-06

---

## 1. Objective & Scope

1. **Native Device Fonts (`ui-sans-serif` & `ui-monospace`)**:
   - Switch `--font-sans` and `--font-mono` stacks in `tailwind.config.js`, `src/ui/globals.css`, `src/content/ui.css`, `src/content/ui.js`, and `DESIGN.md` to native device font stacks (`ui-sans-serif` and `ui-monospace`).
   - Remove `@fontsource/familjen-grotesk` and `@fontsource/fragment-mono` imports from `src/ui/globals.css`, eliminating bundled webfont decode overhead on low-end devices.

2. **Animated `SegmentedControl` (`src/ui/components/ui/segmented-control.jsx`)**:
   - Integrate the spring-driven `SegmentedControl` (`motion/react`, `stiffness: 520, damping: 34, mass: 0.45`) with dual-layer inverse-masked active thumb text and icons.
   - Replace existing `ToggleGroup` controls in `src/options/options.jsx` (Sidebar footer Theme switcher, Appearance Theme selector, General "On new sites" control) and `src/ui/components/SiteModeControl.jsx` (`Ask | Always | Never` in Settings and Popup).
   - Support unselected/inherited state (`value=""`) so site rules inheriting global default do not falsely highlight `Ask`.

3. **Bencho `LiquidToggle` (`src/ui/components/ui/liquid-toggle.jsx` & `src/ui/globals.css`)**:
   - Integrate Bencho's MIT-licensed `LiquidToggle` (`framer-motion`) with all original commentary and physics constants (`TRACK = 92`, `THUMB = 36`, area-preserving velocity stretch `scaleY = 1 / scaleX`) preserved.
   - Map Bencho's CSS custom properties (`--board`, `--card`, `--fill-on`, `--fill-slab`, `--ink`, `--nod-r`, `--pane-edge`) locally on `.liq-well` to Canji's **Paper & Pine** design tokens.
   - Wire `src/ui/components/ui/switch.jsx` to `LiquidToggle` (`inline` mode scaling the `92×46` track to `46×23` via `.liq-well--inline` while keeping `local()` pointer coordinate division intact).

4. **Settings Sites Page Redesign (`src/options/options.jsx`)**:
   - Redesign **Add a site** into a cohesive card with a single-line domain/mode/submit row and a compact `Currencies: [Auto-detect] → [Default (CUR)]` bar.
   - Redesign **Your sites** into a unified bordered list where each site renders on a clean single row with domain + inline auto-width `From → To` currency pills (eliminating `w-[144px]` `Default (US...` truncation) + `SegmentedControl` (`Ask | Always | Never`) + compact icon buttons with tooltips for `Reset` and `Remove`.

5. **Smooth Scroll & Low-End / No-JS Resilience**:
   - Add `scroll-behavior: smooth` (gated by `@media (prefers-reduced-motion: no-preference)`) and `.content-auto-row` (`content-visibility: auto; contain-intrinsic-size: 0 52px`) in `src/ui/globals.css`.
   - Add `<noscript>` fallbacks in `src/options/options.html` and `src/popup/popup.html`.


---

## 2. Verification Results

### Build & Gallery Build
```
$ npm run build && npm run build:gallery
Built Chrome and Firefox bundles cleanly into dist/
Packaged zips:
  dist/packages/canji-chrome-v0.1.0.zip (135.4 KB)
  dist/packages/canji-firefox-v0.1.0.zip (135.4 KB)
Built gallery into dist/gallery/
```

### Unit Tests (`node --test tests/*.test.js` & `node tests/parse.test.js`)
```
# tests 131
# suites 40
# pass 131
# fail 0
ALL PARSE TESTS PASSED
```

### Firefox MV3 Lint (`npm run lint:firefox`)
```
Validation Summary:
errors          0
notices         0
warnings        4
```

### Real-Browser E2E Tests (`options.e2e.js`, `c2-gallery.e2e.js`, `f1-pill-theme.e2e.js`, `smoke.e2e.js`)
```
ok 1 - Options page E2E (MV3 service worker + options tab) (12169.365ms)
ok 2 - C2: Component Gallery & Tailwind Pipeline E2E (4417.6194ms)
ok 3 - F1 — Pill 3-Way Theme Contract (Light / Dark / System) (15364.8647ms)
ok 4 - Real-browser MV3 E2E smoke test (17609.2614ms)
# tests 4
# suites 4
# pass 4
# fail 0
```
