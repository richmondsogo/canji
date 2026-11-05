# Agent Guidelines: Canji

This repository operates strictly under the development rules defined in `BUILD_PROTOCOL.md`. All automated and human-paired agents must adhere to the instructions herein.

---

## Roles & Responsibilities

### 1. Planner
- Defines scope, breaks work into isolated steps, and authors behavior specifications in `docs/steps/NN-<slug>.md`.
- Identifies ambiguity, evaluates architecture trade-offs, and documents decisions in `docs/adr/`.
- Reviews implementations against the approved plan before steps are closed.

### 2. Builder
- Implements only the approved scope for the current step on an isolated branch (`step/NN-<slug>`).
- Does not expand requirements or introduce unplanned features.
- Runs all relevant tests and verifications and records objective command output.
- Stops and reports at the end of each step.

---

## Global Agent Rules

### 1. Never Report PASS Without Running Verification
- **Rule**: Never write `PASS` or report a check as successful unless you executed the command in the current session and inspected the output.
- **Rule**: If a check was not run, write `NOT RUN` explicitly.
- **Evidence Over Summary**: Paste exact command output and log summaries into PRs and step logs, not paraphrased descriptions.

### 2. Strict Skills Policy (Allow / Deny List)
The following installed skills are **STRICTLY PROHIBITED**:
- `taste-skill`
- `ui-ux-pro-max`
- `banner-design`
- `brand`
- `design`
- `slides`
- `ui-styling`
- `baseline-ui`
- `create-design-md`

*Reason*: These skills assume other tech stacks (e.g. Tailwind, React, external registries) or will overwrite repository-specific tokens in `DESIGN.md`.

**ALLOWED Skills**:
- `improve-ui`: Permitted for **read-only audits** against `DESIGN.md` (writes to `docs/audits/`). Must not mutate product code.
- `fixing-accessibility`: Permitted in later UI polish steps for ARIA/focus audits.
- `fixing-motion-performance`: Permitted in later UI polish steps for frame-rate and layout reflow audits.

### 3. Absolute Zero `innerHTML` Rule
- **Rule**: `innerHTML`, `outerHTML`, and `insertAdjacentHTML` are **strictly forbidden** anywhere in this codebase.
- **Implementation**: Every DOM node across in-page UI (`src/content/ui.js`), toolbar popup (`src/popup/popup.js`), and options page (`src/options/options.js`) must be constructed using native DOM APIs:
  - `document.createElement()`
  - `document.createTextNode()`
  - `element.replaceChildren()`
  - `element.textContent = ...`
  - SVG creation via `document.createElementNS('http://www.w3.org/2000/svg', ...)`
- *Reason*: Eliminates DOM-based cross-site scripting (XSS) risks from untrusted web text and ensures 100% compliance with Mozilla Add-on Review Policies and Google Web Store security guidelines.

### 4. Never Amend or Force-Push Once a PR is Open
- **Rule**: Never run `git commit --amend` or `git push --force` (`-f`) once a pull request is open.
- **Implementation**: Append new commits sequentially to the branch. This preserves branch provenance, reviewer comments, and immutable commit hashes.

---

## Standard Development Commands

### Run Unit Tests
```bash
npm test
```
*Executes native Node.js test runner across `tests/**/*.test.js` and standalone `tests/parse.test.js`.*

### Build Distribution Bundles
```bash
npm run build
```
*Runs `node build.js`, invoking `esbuild` to compile `src/` into self-contained MV3 bundles in `dist/chrome/`, `dist/firefox/`, and creates release zips in `dist/packages/`. Always run `npm run build`, then load `dist/chrome`; `dist/` is not tracked.*

### Run Real-Browser E2E Tests
```bash
npm run test:e2e
```
*Executes Playwright tests against unpacked extension in real Chromium (Chrome for Testing).*

### Lint for Firefox MV3 Parity
```bash
npm run lint:firefox
```
*Runs Mozilla's `web-ext lint` against `dist/firefox` to verify strict WebExtension compliance.*
