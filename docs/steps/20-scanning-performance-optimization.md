# Step 20: Page-Load DOM Scanning Performance Optimization

**Status**: Complete  
**Branch**: `step/20-scanning-performance-optimization`  
**Pull Request**: [#25](https://github.com/richmondsogo/canji/pull/25)  
**First Commit**: `f50106e`  
**Last Commit**: `27d92fa`  
**Merge Commit**: `e054f59`  
**Date**: 2026-11-05

---

## 1. Objective & Scope

Eliminate main-thread CPU lag caused by Canji's automatic page-load DOM scanning (`PageScanner.scanCandidates`, `PageScanner.convert`, `extractPrices`, and `content.js` lifecycle triggers) while preserving **100% behavioral equivalence** across all currency formats, split-price structures, Open Shadow DOM trees, SPA navigations, and late-hydrated prices.

### Files Modified
- `src/shared/parser.js`:
  - Pre-sorted `EXPLICIT_SYMBOL_KEYS` once at module load instead of sorting `Object.keys(EXPLICIT_SYMBOL_MAP)` on every `detectCurrency()` call.
  - Pre-compiled `ISO_CODE_REGEX_ENTRIES` once at module load instead of instantiating up to 171 `new RegExp("\\b" + code + "\\b")` objects per `detectCurrency()` call.
  - Added `hasCurrencyMarker(text)` and `mightContainPrice(text)` ($O(1)$-allocation pre-filters with non-letter boundary guards on Latin-letter symbols like `Rs`, `Ft`, `RM`, `Rp`, `kr`, `zł`, `Kč`) to short-circuit `extractPrices(text, context)` before running complex multi-branch price regexes.
- `src/content/scanner.js`:
  - Replaced `node.closest(IGNORED_SELECTOR)` in `_isNodeIgnored(node)` with a stateless `parentElement` loop using `_isElementSelfIgnored(el)` (using `IGNORED_TAGS` `Set`, `id`, string `className.includes('currency-convertr-ui')` guard before accessing `classList`, and `hasAttribute`).
  - Replaced `root.querySelectorAll('*')` in `_findAllRoots(root)` with `this.doc.createTreeWalker(root, 1)` (`NodeFilter.SHOW_ELEMENT`) checking `if (el.shadowRoot && !this._isNodeIgnored(el))` so elements without an open Shadow Root skip ancestor checks.
  - Replaced `TreeWalker` WebIDL callback overhead in `_collectTextNodes(root)` with a direct `walker.nextNode()` loop checking `mightContainPrice(val)` before `_isNodeIgnored(node)`.
  - Replaced unfiltered `root.querySelectorAll('span, div, p, b, strong, em, td')` + $O(N^2 \log N)$ `getElementsByTagName('*').length` sorting in `_findSplitPriceElements(root)` with bottom-up ancestor inspection seeded only from text nodes matching `hasCurrencyMarker(val)`, bounded by `countDescendantsUpTo(el, 25)` and sorting only matched split-price elements.
- `src/content/content.js`:
  - Added `isEvaluatingOffer`, `lastOfferEvalKey`, and `lastOfferResult` deduplication in `performOffer()` so redundant `OFFER_CONVERSION` triggers (`autoEvaluateOnLoad` + `tabs.onUpdated` + `tabs.onActivated`) do not re-run full-DOM `scanCandidates()` when no DOM mutations have occurred on the same URL/target.
  - Gated `startOfferObserver` follow-up scans (`[600, 1800]` ms and debounced mutation timer) on `hasNumericMutation` (`nodeMightHaveDigits`), and added `OFFER_OBSERVER_MAX_LIFETIME_MS = 15000` auto-disconnect so `offerObserver` does not run indefinitely when no prices exist.
- `tests/scanner.test.js`:
  - Added unit tests verifying `mightContainPrice` coverage across all `EXPLICIT_SYMBOL_MAP`, `AMBIGUOUS_SYMBOL_KEYS`, and `ISO_CODES`, byte-for-byte convert/revert equivalence across all 13 HTML fixtures, and a `< 220ms` performance regression gate on a 3,205-element non-shopping DOM.

---

## 2. Lab Benchmark Comparison (3,205-Element Non-Shopping DOM in JSDOM)

| Metric | Baseline (`main`) | Post-Optimization | Improvement |
| --- | ---: | ---: | ---: |
| `_findAllRoots(doc.body)` | `338.16 ms` | `4.69 ms` | **72.1x faster** |
| `_findSplitPriceElements(doc.body)` | `616.06 ms` | `13.35 ms` | **46.1x faster** |
| `_collectTextNodes(doc.body)` | `186.20 ms` | `11.61 ms` | **16.0x faster** |
| **`scanCandidates(doc.body)` (single scan)** | **`725.46 ms`** | **`17.51 ms`** | **41.4x faster (-97.6%)** |
| Scans triggered per static page open | `5` (`~3,627 ms` total) | `1` (`~17.51 ms` total) | **207x less CPU work** |

---

## 3. Verification Output

### 3.1 Unit Tests, Build & Firefox Smoke Test (`npm test`) — `PASS`
```text
> canji@2.0.0 test
> npm run build && node --test tests/**/*.test.js && node tests/parse.test.js

[Build] Bundling Canji v2.0.0 (60e2acb) with esbuild...
[Build] esbuild bundling completed successfully.
[Build] Manifests generated for Chrome and Firefox.
[Build] Created package: C:\Users\Richmond\Downloads\currency-converter-v2\dist\packages\canji-chrome-v2.0.0.zip
[Build] Created package: C:\Users\Richmond\Downloads\currency-converter-v2\dist\packages\canji-firefox-v2.0.0.zip
[Build] Build completed successfully for v2.0.0 (60e2acb).
...
[Firefox Smoke Test] Popup final status: 2 prices converted
[Firefox Smoke Test] Converted price p2: $56.12
✔ Firefox MV3 Smoke: Add-on loads, popup opens, and converts prices on real page (19371.0903ms)
...
✔ scanner & parser: mightContainPrice covers 100% of ISO codes and currency symbols while rejecting plain numeric text (0.8147ms)
✔ scanner: all 13 HTML fixtures convert and revert byte-for-byte cleanly (465.6536ms)
✔ scanner: large 3,200-element non-shopping DOM scans quickly without layout/selector thrashing (575.4543ms)
...
ℹ tests 129
ℹ suites 0
ℹ pass 129
ℹ fail 0
ℹ duration_ms 20716.3609
[Test Suite] Running Currency Converter unit tests...
[Test Suite] All unit tests passed successfully.
```

### 3.2 Firefox WebExtension Lint (`npm run lint:firefox`) — `PASS`
```text
> canji@2.0.0 lint:firefox
> web-ext lint --source-dir dist/firefox

Validation Summary:

errors          0              
notices         0              
warnings        4              
```

### 3.3 Real-Browser Playwright E2E Suite (`npm run test:e2e`) — `PASS`
```text
> canji@2.0.0 test:e2e
> node --test --test-concurrency=1 tests/e2e/*.e2e.js

✔ B1 Regression: One instance, one pill, honest count, and iframe isolation (19621.4313ms)
✔ B3 Regression: Auto-convert trigger, hostname routing, and late-rendered prices (42309.8283ms)
✔ C2 & C3 & C4: Gallery loads in real browser, fonts ready, 0 console errors, CDP glyph coverage, screenshots (18052.9561ms)
✔ D1: Automatic and menu conversions ALWAYS use settings.targetCurrency (default NGN), ignoring lastUsedTarget (41694.4032ms)
✔ E2E Real-World E-Commerce & Security Pre-Flight Audit (17368.5674ms)
✔ F1: pill follows Theme setting (light/dark/system) and OS preference, loading saved theme before first paint (21405.2092ms)
✔ F2: popup keeps its behavioral contract and renders no text under 12px (19107.7637ms)
✔ E2E Options: Complete rebuild verification covering all 10 requirements (31525.1461ms)
✔ E2E Smoke: Extension loads in real browser, service worker is alive, and options page renders (17324.065ms)
✔ T1 Regression: Show original stays original on late mutations, re-converts cleanly (26254.5266ms)
✔ T3 Regression: Context menu installation, listener lifecycle, and action dispatch (14627.9725ms)
ℹ tests 15
ℹ suites 0
ℹ pass 15
ℹ fail 0
ℹ duration_ms 277714.4128
```
