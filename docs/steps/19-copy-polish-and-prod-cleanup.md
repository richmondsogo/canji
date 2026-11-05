# Step 19: Copy Polish, Settings2 Redesign, Per-Site `From → To` Rules & Production Reliability

## Status
- **Branch**: `step/19-copy-polish-and-prod-cleanup`
- **Status**: Complete & Verified

---

## Scope Completed
1. **Plain-Language Copy & Unified Canji Branding**:
   - Unified all user-facing strings, store listings, README, and privacy policy around **Canji**.
   - Removed developer/internal strings (git commit SHA, build timestamp, internal architecture labels) from user-facing UI and removed `version_name` from `manifest.json`.
2. **Settings2 Card + Sidebar Redesign (`src/options/options.jsx`)**:
   - Integrated `Card`, `Sidebar` (`SidebarProvider`, `Sidebar`, `SidebarHeader`, `SidebarContent`, `SidebarGroup`, `SidebarGroupLabel`, `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton`, `SidebarFooter`), `Sheet`, `Skeleton`, and `use-mobile` under `src/ui/`, styled with Paper & Pine tokens and Phosphor icons.
   - Fixed horizontal text overflow inside the 3 Display mode preview cards in Settings → Appearance.
3. **Explicit Per-Site `Convert from → to` Currency Controls**:
   - Added `getSiteCurrencies(settings, hostname)` and optional per-site `targetCurrency` persistence in `src/shared/settings.js`.
   - Added explicit **From** (`Auto-detect` / currency) `→` **To** (`Default` / currency) pickers in both `src/popup/popup.jsx` and `src/options/options.jsx` (Sites section), two-way synced via `chrome.storage.onChanged`, with an inline warning when **From** and **To** are identical.
4. **Auto-Convert (`Always`) & Auto-Ask (`Ask`) Reliability**:
   - Added declarative `content_scripts` (`document_idle`) in `build.js` and `autoEvaluateOnLoad()` in `src/content/content.js` reading directly from `chrome.storage.local` so fresh browser opens never drop `Always` or `Ask` rules while the MV3 service worker wakes up.
   - Mounted the on-page toolbar via `onConvertedCountChange` when prices hydrate asynchronously after initial page load, and added `startOfferObserver` (with `minCandidateThreshold: 1`) so dynamic and single-product pages reliably display the `Ask` offer prompt.
5. **Removed `Alt+Shift+C` Shortcut & Cleaned Repository Structure**:
   - Removed `commands` from `build.js`, `api.commands.onCommand` from `src/background.js`, and all UI/doc mentions of keyboard shortcuts.
   - Removed stale scratch scripts (`scripts/verify_*.js`, `scripts/capture-*.js`, `scripts/diagnose.js`, `scripts/t4-report.js`), obsolete debug screenshots, `INSTALLED_SKILLS.md`, and intermediate audit image dumps.
   - Rewrote `README.md`, `CHANGELOG.md`, `CHROMEWEBSTORE.md`, `PRIVACY_POLICY.md`, `DESIGN.md`, `CONTEXT.md`, `docs/DECISIONS.md`, `docs/agents/file-structure.md`, and `docs/store/amo-notes.md` for production release.

---

## Verification Evidence
- **`npm test` (Build + 126 Unit Tests + `parse.test.js` + Firefox MV3 Smoke Test)**: `PASS` (`126 pass, 0 fail`)
- **Playwright Browser E2E Suite (`npm run test:e2e`)**: `PASS` (`10 pass, 0 fail`)
- **`npm run lint:firefox`**: `PASS` (`errors: 0, notices: 0`)
