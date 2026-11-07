# Chrome Web Store & Firefox AMO Submission Specification

> **Target Version**: 2.0.0  
> **Package Files**:  
> - Chrome: `dist/packages/canji-chrome-v2.0.0.zip` (`~433 KB`)  
> - Firefox: `dist/packages/canji-firefox-v2.0.0.zip` (`~433 KB`)  
> **Last Verified**: 2026-11-07  

---

## Part 1: Chrome Web Store Submission Metadata

### 1. Product Details

#### Extension Name
```text
Canji — Currency Converter
```

#### Summary / Short Description
*(132 characters max)*
```text
Prices, in your currency. Convert prices on any web page, right where they appear, with live exchange rates.
```

#### Detailed Description
```text
Prices, in your currency. Canji converts every price on any web page into the currency you choose, right where it appears, using live exchange rates. Change your mind? One click brings the original prices back.

Whether you are shopping abroad, booking travel, or comparing deals across international stores, Canji saves you the mental math. Convert from the toolbar popup, the right-click menu, or set your favorite sites to convert automatically.

WHAT YOU GET

• Convert in place: prices change directly on the page without breaking the layout.
• Show original anytime: restore the page to its exact original prices in one click.
• On-page toolbar: a compact top bar lets you switch currencies, toggle original prices, or approve conversion prompts.
• Hover for details: hover any converted price to see the original amount and the exchange rate used.
• Three display styles: replace the price in place, show both side by side (€249.00 ($277.14)), or replace with a soft highlight.
• Clear per-site rules: choose Ask, Always, or Never for any website, and set explicit "Convert from" and "Convert to" currencies per site.
• Smart price detection: handles split prices, superscript cents, and price ranges across global shopping sites.
• 170+ currencies: supports major and regional world currencies plus popular cryptocurrencies.
• Right-click to convert: highlight any price and convert it immediately from the context menu.
• Works on dynamic pages: prices that load as you scroll or filter products are converted automatically.

PRIVATE BY DESIGN

• All price detection and conversion happens locally on your device.
• Canji never collects, stores, or transmits your browsing history, page contents, or web addresses.
• Exchange-rate tables are fetched anonymously from the European Central Bank and open fallback mirrors with zero tracking.
• Your settings and site rules stay in your browser.

HELP & FEEDBACK

Questions, bug reports, or currency requests: https://github.com/richmondsogo/canji/issues
```

#### Category
```text
Shopping
```

#### Language
```text
English (United States)
```

---

### 2. Graphic Assets Matrix

| Asset Type | Dimensions | File Location | Description |
|---|---|---|---|
| **Store Icon** | 128 × 128 px | `dist/chrome/icons/icon128.png` | Official Canji hexagonal icon |
| **Screenshot 1** | 1280 × 800 px | `screenshots/screenshot-inpage-bar.png` | In-page converted prices, top toolbar, and hover rate tooltip |
| **Screenshot 2** | 1280 × 800 px | `screenshots/screenshot-popup.png` | Toolbar popup with framed `From → To` currency controls and single-line site rule |
| **Screenshot 3** | 1280 × 800 px | `screenshots/screenshot-sites.png` | Per-site `From → To` currency chip and `Ask | Always | Never` rules |
| **Screenshot 4** | 1280 × 800 px | `screenshots/screenshot-currencies.png` | Pinned quick-pick currencies `FieldArray` with live combobox rows |
| **Screenshot 5** | 1280 × 800 px | `screenshots/screenshot-options.png` | General settings dashboard with Paper & Pine controls |
| **Screenshot 6** | 1280 × 800 px | `screenshots/screenshot-appearance.png` | Appearance & 3 Display Mode preview cards |
| **Screenshot 7** | 1280 × 800 px | `screenshots/screenshot-combobox.png` | Searchable currency combobox across 170+ currencies |
| **Screenshot 8** | 1280 × 800 px | `screenshots/real-work-test-context-menu.png` | Right-click selection conversion |
| **Promo Tile** | 440 × 280 px | `screenshots/promo-small-440x280.png` | Chrome Web Store small promotional tile |

---

### 3. Permissions Justifications (for Chrome Web Store Reviewers)

| Permission | Scope | Justification |
|---|---|---|
| `tabs` | API | Queries active tab properties (URL, hostname) to detect restricted browser pages, apply per-site conversion rules, and sync rule changes across open tabs. |
| `activeTab` | API | Enables on-demand in-page price conversion on the active tab when triggered via the toolbar popup or context menu. |
| `scripting` | API | Ensures the content script engine is injected into already-open tabs when conversion is requested. |
| `storage` | API | Persists user preferences, pinned currencies, per-site rules, and cached exchange rates locally (`chrome.storage.local` and `chrome.storage.session`). |
| `contextMenus` | API | Registers the "Convert prices on this page" and selection conversion items in the browser right-click menu. |
| `notifications` | API | Displays desktop notifications when converting selected text via the right-click menu. |
| `<all_urls>` | Host Permission | Required to detect and convert prices across international shopping websites according to user site rules (`Ask` or `Always`) and to fetch public exchange-rate tables. |

---

### 4. Single-Purpose Declaration

```text
Convert prices on web pages into the user's selected currency using live foreign exchange rates.
```

### 5. Data Usage & Privacy Declarations

- **Personally identifiable information**: Not collected.
- **Health information**: Not collected.
- **Financial information**: Not collected.
- **Authentication information**: Not collected.
- **Personal communications**: Not collected.
- **Location**: Not collected.
- **Web browsing history**: Not collected.
- **Website content**: Processed locally in volatile memory strictly to detect currency symbols and numbers; never transmitted off-device.

---

### 6. Technical Reviewer Guidance (Chrome Web Store)

```text
Reviewer Guidance:
1. Manifest V3 Architecture: The background service worker (background.js) manages exchange-rate caching, context menus, and tab messaging.
2. Local DOM Processing: All webpage text scanning and price conversion happen strictly client-side in the active tab. No page text, URLs, or browsing history ever leave the device.
3. Anonymous Rate Fetching: The only network requests are anonymous GET requests for public base-EUR currency rate tables from the European Central Bank (api.frankfurter.dev) and open fallback mirrors (cdn.jsdelivr.net / currency-api.pages.dev).
4. Zero Remote Code: All JavaScript is bundled locally with esbuild under a strict MV3 Content Security Policy ("script-src 'self'; object-src 'self'; base-uri 'none';"). Zero eval, zero remote scripts, and zero innerHTML usage.
```

---

## Part 2: Firefox Add-ons (AMO) Submission Metadata

### 1. Add-on Details

#### Add-on Name
```text
Canji — Currency Converter
```

#### Add-on ID
```text
canji@richmond.addons
```

#### Summary
```text
Prices, in your currency. Convert prices on any web page in place with live exchange rates, an on-page toolbar, and one-click restore.
```

#### Full Description
```text
Prices, in your currency. Canji converts every price on any web page into your preferred currency, right where it appears, using live exchange rates and one-click restoration of original prices.

KEY FEATURES
• In-Page Price Conversion: Converts prices directly within the page layout without breaking design or causing layout shifts.
• Reversible Anytime: Click "Show original" to restore the page to its exact original state.
• On-Page Toolbar: A compact top bar lets you switch currencies, toggle original prices, or dismiss prompts for the session.
• Hover Rate Tooltips: Hover over any converted price to see the original amount, source currency, and exact exchange rate used.
• Three Display Modes: Choose between "Replace in place", "Beside original" (€249.00 ($277.14)), or "Replace and highlight".
• Explicit Per-Site Rules: Set any site to Ask, Always, or Never, and configure per-site "Convert from" and "Convert to" currencies in both the popup and settings.
• Smart Price Recognition: Accurately handles split e-commerce price elements, superscript cents, and price ranges.
• 170+ Currencies: Supports major and regional world currencies alongside popular cryptocurrencies.
• Right-Click Selection Conversion: Highlight any price, right-click, and convert it immediately.

PRIVACY & SECURITY
• All DOM reading and price conversion happens strictly locally on your device.
• No browsing history, URLs, or page contents are ever transmitted to any external server.
• Public exchange-rate tables are fetched anonymously from the European Central Bank and CDN fallback mirrors with zero tracking.
• Settings are stored locally in your browser profile.
```

#### Notes to Reviewer (Firefox AMO)
See [`docs/store/amo-notes.md`](docs/store/amo-notes.md) for build reproduction instructions and `web-ext lint` verification details (`0 errors, 0 notices`).
