# Privacy Policy for Canji

**Effective Date:** October 17, 2026  
**Last Updated:** November 5, 2026

This Privacy Policy describes how the **Canji** browser extension ("Canji", "the extension", "we", "us", or "our") handles information when installed on Chromium-based browsers (Google Chrome, Microsoft Edge, Brave, Opera, Vivaldi) and Mozilla Firefox.

---

## 1. Zero Data Collection Architecture

Canji is built under a strict **Zero-Telemetry, Privacy-by-Design** architecture. We do not collect, store, transmit, or monetize any personal information, browsing history, or user identity.

Specifically, Canji:
- **Does not require user accounts or registration.**
- **Does not collect personal identifiers** (no names, email addresses, IP addresses, or device identifiers).
- **Does not track or record browsing history** or the URLs of web pages you visit.
- **Does not log keystrokes, form fields, passwords, or cookies.**
- **Does not include analytics, telemetry beacons, or advertising SDKs.**
- **Does not transmit page contents or user data to external servers.**

---

## 2. Local-Only In-Memory Processing

When Canji evaluates or converts prices on a web page—whether via the toolbar popup, right-click context menu, on-page toolbar prompt (`Ask` mode), or automatic site conversion (`Always` mode):

1. **Local DOM Analysis**: The extension inspects text nodes and pricing elements on the active web page **entirely locally within your browser tab**. All candidate detection and conversion run in local volatile memory on the top frame.
2. **Volatile Memory**: Currency symbols, numbers, and ISO codes are parsed purely in ephemeral JavaScript memory.
3. **No External Transmission**: Page text, product descriptions, prices, and DOM structures **never leave your device**. No text or URL data is ever transmitted over the network or logged remotely.
4. **Reversible Operation**: Selecting **Show original** restores the original text directly from local tab memory without contacting any remote service.

---

## 3. Local Preferences Storage

Canji uses local browser storage APIs (`chrome.storage.local` and `chrome.storage.session`) exclusively on your device to store:
- Your default target currency, `$` disambiguation preference, theme, and display mode (`Replace in place`, `Beside original`, or `Replace and highlight`).
- Your pinned currencies (up to 8) for the popup and right-click context menu.
- Per-site rules you configure (`mode: 'ask' | 'always' | 'never'`, optional `assumedCurrency`, and optional `targetCurrency`).
- Temporary session dismissals (`chrome.storage.session`) when you dismiss an on-page offer prompt for a site (automatically cleared when the browser closes).
- Cached foreign exchange rate tables (`chrome.storage.local`) so pages convert immediately without redundant network requests.

This data resides strictly in your local browser profile and is never transmitted to any external server.

---

## 4. Third-Party Foreign Exchange Rate Providers

To convert prices using current market rates, Canji fetches public, anonymous foreign exchange rate tables (base `EUR`) from the following open rate providers:

### 1. European Central Bank via Frankfurter API (Primary)
- **Endpoint:** `https://api.frankfurter.dev/v1/latest?base=EUR`
- **Data Transmitted:** Anonymous HTTP `GET` request for the public ECB reference rate table.
- **Telemetry:** No user identifiers, cookies, page URLs, or tracking headers are sent.

### 2. Fawaz Ahmed Currency API via jsDelivr CDN (Secondary)
- **Endpoint:** `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/eur.json`
- **Data Transmitted:** Anonymous static JSON download covering 170+ global fiat and cryptocurrencies.

### 3. Fawaz Ahmed Currency API via Cloudflare Pages (Tertiary Fallback)
- **Endpoint:** `https://latest.currency-api.pages.dev/v1/currencies/eur.json`
- **Data Transmitted:** Anonymous static JSON download used only if the primary and secondary endpoints are unreachable.

---

## 5. Browser Permissions and Justifications

Canji requests only the permissions required to provide its core functionality:

| Permission | Category | Technical Justification |
|---|---|---|
| `storage` | API | Saves user preferences, per-site rules, and cached exchange rates locally (`chrome.storage.local` and `chrome.storage.session`). |
| `activeTab` | API | Grants temporary access to the active tab when the user triggers conversion from the toolbar popup or context menu. |
| `scripting` | API | Injects the local conversion engine into already-open tabs when requested by the user. |
| `tabs` | API | Reads the active tab's URL scheme and hostname to apply per-site rules (`Ask`, `Always`, `Never`) and skip restricted browser pages. |
| `contextMenus` | API | Registers the right-click "Convert prices on this page" and selection conversion menu items. |
| `notifications` | API | Displays a desktop notification when converting highlighted text from the right-click menu. |
| `<all_urls>` | Host Permission | Allows the local price scanner to detect and convert prices across international shopping websites and fetch public exchange-rate tables. |

Canji **never** requests invasive permissions such as `webRequest`, `cookies`, or `history`.

---

## 6. Children's Online Privacy

Canji does not collect, maintain, or solicit any personal information from anyone, including children under the age of 13, in full compliance with the Children's Online Privacy Protection Act (COPPA).

---

## 7. Policy Modifications

If this Privacy Policy is updated, the revised policy will be published in this repository with an updated **Last Updated** date.

---

## 8. Contact Information

For questions or security inquiries regarding this Privacy Policy:
- **Developer:** Richmond Sogo
- **Email:** `richmondsogo@gmail.com`
- **Repository:** [https://github.com/richmondsogo/canji](https://github.com/richmondsogo/canji)
- **Issue Tracker:** [https://github.com/richmondsogo/canji/issues](https://github.com/richmondsogo/canji/issues)
