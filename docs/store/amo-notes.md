# Information for Firefox AMO Reviewers: Canji

**Version**: 2.0.0  
**Target Environment**: Firefox Manifest V3 (Gecko `strict_min_version`: `"140.0"`)  
**Package**: `dist/packages/canji-firefox-v2.0.0.zip`  
**Repository**: `https://github.com/richmondsogo/canji`  

---

## 1. Web-Ext Lint Summary

Running `npm run lint:firefox` (`web-ext lint --source-dir dist/firefox`) produces:

```text
Validation Summary:

errors          0              
notices         0              
warnings        4              
```

**Status**: **PASS (`0 errors, 0 notices`)**.

---

## 2. Origin of the 4 Warnings: React 18 DOM Reconciler

The 4 `UNSAFE_VAR_ASSIGNMENT` warnings originate exclusively inside the bundled **React 18 (`react-dom@18.3.1`)** runtime in the standalone extension pages (`popup/popup.js` and `options/options.js`), where React's internal container cleanup clears an empty root node (`node.innerHTML = ''`).

We preserve the unmodified `esbuild` bundle of `react-dom` rather than running post-build string replacements on third-party framework internals.

---

## 3. Extension Security & Zero `innerHTML` Policy

Canji enforces a strict **Zero `innerHTML` Policy** (**ADR 0008**):

1. **Zero `innerHTML` in First-Party Source Code**:
   - `innerHTML`, `outerHTML`, `insertAdjacentHTML`, and `dangerouslySetInnerHTML` are strictly prohibited across all source files.
   - All DOM nodes in `src/content/ui.js`, `src/content/scanner.js`, `src/popup/popup.jsx`, and `src/options/options.jsx` are constructed via safe native DOM APIs (`document.createElement`, `document.createTextNode`, `textContent`, `replaceChildren`) or React JSX.
2. **Pure Vanilla JS Content Script**:
   - `src/content/content.js`, `src/content/scanner.js`, and `src/content/ui.js` are 100% vanilla JavaScript with zero framework dependencies.
   - The in-page toolbar is isolated inside an open Shadow DOM root (`#cc-dynamic-island-host`).
3. **Zero Remote Code & Local Fonts**:
   - All scripts and fonts (`Familjen Grotesk` and `Fragment Mono` WOFF2 files) are bundled locally at build time.

---

## 4. How to Reproduce the Build from Source

**Prerequisites**: Node.js `v18.0.0+` and `npm`.

```bash
git clone https://github.com/richmondsogo/canji.git
cd canji
npm ci
npm run build
npm run lint:firefox
```

Build outputs:
- Unpacked Firefox MV3 add-on: `dist/firefox/`
- Packaged Firefox AMO archive: `dist/packages/canji-firefox-v2.0.0.zip`

---

## 5. Contact & Support

- **Developer**: Richmond Sogo (`richmondsogo@gmail.com`)
- **Issues**: [https://github.com/richmondsogo/canji/issues](https://github.com/richmondsogo/canji/issues)
