// src/content/ui.js
import { getAllCurrencies } from '../shared/currencies.js';
import { formatCurrency } from '../shared/format.js';

export const INLINE_UI_CSS = `
/* src/content/ui.css - Theme-aware Dynamic Island capsule (Paper & Pine) */
/* NOTE: keep in sync with INLINE_UI_CSS in src/content/ui.js (guarded by tests/pill_theme.test.js). */

:host {
  all: initial;
  display: block;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 0;
  z-index: 2147483647;
  pointer-events: none;
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* Theme tokens: Paper & Pine light is the default. */
.cc-island-container {
  color-scheme: light;
  --cc-surface: rgba(247, 245, 240, 0.86);
  --cc-surface-solid: #F7F5F0;
  --cc-raised: #EFECE5;
  --cc-hairline: #E2DED4;
  --cc-text: #191815;
  --cc-muted: #67635A;
  --cc-accent: #1E6B52;
  --cc-accent-fg: #FFFFFF;
  --cc-ring: rgba(30, 107, 82, 0.4);
  --cc-highlight: rgba(255, 255, 255, 0.7);
  --cc-glow: none;
  --cc-shadow: 0 1px 2px rgba(25, 24, 21, 0.05), 0 6px 16px -4px rgba(25, 24, 21, 0.12), 0 14px 28px -8px rgba(25, 24, 21, 0.16);
  --cc-shadow-lift: 0 2px 4px rgba(25, 24, 21, 0.06), 0 10px 24px -4px rgba(25, 24, 21, 0.16), 0 20px 36px -8px rgba(25, 24, 21, 0.20);
}

/* System theme on a dark OS (an explicit light setting always wins). */
@media (prefers-color-scheme: dark) {
  .cc-island-container:not([data-theme="light"]) {
    color-scheme: dark;
    --cc-surface: rgba(24, 24, 22, 0.86);
    --cc-surface-solid: #181816;
    --cc-raised: #10100E;
    --cc-hairline: #2A2926;
    --cc-text: #ECE9E2;
    --cc-muted: #9B968B;
    --cc-accent: #6FD3A6;
    --cc-accent-fg: #10100E;
    --cc-ring: rgba(111, 211, 166, 0.4);
    --cc-highlight: rgba(255, 255, 255, 0.06);
    --cc-glow: 0 0 8px rgba(111, 211, 166, 0.5);
    --cc-shadow: 0 1px 2px rgba(0, 0, 0, 0.3), 0 6px 16px -4px rgba(0, 0, 0, 0.45), 0 14px 28px -8px rgba(0, 0, 0, 0.55);
    --cc-shadow-lift: 0 2px 4px rgba(0, 0, 0, 0.35), 0 10px 24px -4px rgba(0, 0, 0, 0.55), 0 20px 36px -8px rgba(0, 0, 0, 0.65);
  }
}

/* Explicit dark setting. */
.cc-island-container[data-theme="dark"] {
  color-scheme: dark;
  --cc-surface: rgba(24, 24, 22, 0.86);
  --cc-surface-solid: #181816;
  --cc-raised: #10100E;
  --cc-hairline: #2A2926;
  --cc-text: #ECE9E2;
  --cc-muted: #9B968B;
  --cc-accent: #6FD3A6;
  --cc-accent-fg: #10100E;
  --cc-ring: rgba(111, 211, 166, 0.4);
  --cc-highlight: rgba(255, 255, 255, 0.06);
  --cc-glow: 0 0 8px rgba(111, 211, 166, 0.5);
  --cc-shadow: 0 1px 2px rgba(0, 0, 0, 0.3), 0 6px 16px -4px rgba(0, 0, 0, 0.45), 0 14px 28px -8px rgba(0, 0, 0, 0.55);
  --cc-shadow-lift: 0 2px 4px rgba(0, 0, 0, 0.35), 0 10px 24px -4px rgba(0, 0, 0, 0.55), 0 20px 36px -8px rgba(0, 0, 0, 0.65);
}

.cc-island-container {
  position: fixed;
  top: 16px;
  left: 50%;
  transform: translate3d(-50%, 0, 0);
  pointer-events: auto;
  user-select: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 2147483647;
  color: var(--cc-text);
}

/* 1. Dynamic Island capsule: a translucent Paper & Pine material */
.cc-dynamic-island {
  display: flex;
  align-items: center;
  height: 34px;
  padding: 0 14px;
  background-color: var(--cc-surface);
  -webkit-backdrop-filter: blur(18px) saturate(160%);
  backdrop-filter: blur(18px) saturate(160%);
  color: var(--cc-text);
  border-radius: 9999px;
  border: 1px solid var(--cc-hairline);
  box-shadow: inset 0 1px 0 var(--cc-highlight), var(--cc-shadow);
  cursor: default;
  overflow: hidden;
  will-change: transform, opacity;
  transform-origin: center top;
  transition:
    transform 240ms cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 240ms cubic-bezier(0.16, 1, 0.3, 1),
    border-color 150ms ease,
    opacity 200ms ease;
}

.cc-dynamic-island:hover,
.cc-dynamic-island:focus-within,
.cc-dynamic-island.cc-expanded {
  transform: scale(1.02);
  box-shadow: inset 0 1px 0 var(--cc-highlight), var(--cc-shadow-lift);
  border-color: var(--cc-muted);
}

/* Compact Inner Section */
.cc-island-compact {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-shrink: 0;
}

/* Status dot: pine accent while converted, muted when showing originals */
.cc-status-dot,
.cc-offer-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background-color: var(--cc-accent);
  box-shadow: var(--cc-glow);
  flex-shrink: 0;
  transition: background-color 200ms ease, box-shadow 200ms ease;
}

.cc-status-dot.cc-status-inactive {
  background-color: var(--cc-muted);
  opacity: 0.6;
  box-shadow: none;
}

/* Currency Code & Conversion Pair */
.cc-currency-code {
  font-size: 13px;
  font-weight: 500;
  color: var(--cc-text);
  letter-spacing: -0.01em;
}

.cc-count-sep {
  font-size: 11px;
  color: var(--cc-muted);
  user-select: none;
}

/* Count Badge */
.cc-count-badge {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11.5px;
  font-weight: 500;
  color: var(--cc-text);
  background-color: var(--cc-raised);
  padding: 1px 6px;
  border-radius: 9999px;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}

/* Expandable Grid Track (0fr -> 1fr horizontal morph) */
.cc-island-expandable {
  display: grid;
  grid-template-columns: 0fr;
  transition: grid-template-columns 240ms cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
}

.cc-dynamic-island:hover .cc-island-expandable,
.cc-dynamic-island:focus-within .cc-island-expandable,
.cc-dynamic-island.cc-expanded .cc-island-expandable {
  grid-template-columns: 1fr;
}

.cc-island-expandable-content {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding-left: 10px;
  opacity: 0;
  transform: translateX(-4px);
  transition:
    opacity 200ms cubic-bezier(0.16, 1, 0.3, 1),
    transform 200ms cubic-bezier(0.16, 1, 0.3, 1);
  white-space: nowrap;
}

.cc-dynamic-island:hover .cc-island-expandable-content,
.cc-dynamic-island:focus-within .cc-island-expandable-content,
.cc-dynamic-island.cc-expanded .cc-island-expandable-content {
  opacity: 1;
  transform: translateX(0);
}

/* Live Exchange Rate */
.cc-live-rate {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11.5px;
  font-weight: 400;
  color: var(--cc-muted);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}

/* Segmented control: [ Original | Converted ] (accent = on-state) */
.cc-segmented {
  display: inline-flex;
  align-items: center;
  background: var(--cc-raised);
  border-radius: 9999px;
  padding: 2px;
  gap: 2px;
}

.cc-segment-btn {
  position: relative;
  background: transparent;
  border: none;
  border-radius: 9999px;
  padding: 2px 9px;
  font-family: inherit;
  font-size: 12px;
  font-weight: 450;
  color: var(--cc-muted);
  cursor: pointer;
  transition: color 140ms ease, background-color 140ms ease;
  outline: none;
}

.cc-segment-btn::after {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  min-width: 44px;
  min-height: 36px;
  pointer-events: auto;
}

.cc-segment-btn:hover {
  color: var(--cc-text);
}

.cc-segment-btn.active {
  background: var(--cc-accent);
  color: var(--cc-accent-fg);
  font-weight: 500;
}

.cc-segment-btn:active {
  transform: scale(0.97);
}

.cc-segment-btn:focus-visible {
  outline: 2px solid var(--cc-accent);
  outline-offset: 2px;
}

/* Quick currency select trigger inside the island */
.cc-select-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.cc-select {
  appearance: none;
  -webkit-appearance: none;
  background: var(--cc-raised);
  border: 1px solid var(--cc-hairline);
  color: var(--cc-text);
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
  height: 24px;
  padding: 0 18px 0 7px;
  border-radius: 6px;
  cursor: pointer;
  outline: none;
  display: inline-flex;
  align-items: center;
  user-select: none;
  transition: border-color 140ms ease, background-color 140ms ease;
}

.cc-select:hover {
  border-color: var(--cc-muted);
}

.cc-select:focus-visible {
  border-color: var(--cc-accent);
  box-shadow: 0 0 0 3px var(--cc-ring);
}

/* Option fallback follows theme tokens */
.cc-select option {
  background-color: var(--cc-surface-solid);
  color: var(--cc-text);
}

.cc-select-arrow {
  position: absolute;
  right: 6px;
  pointer-events: none;
  color: var(--cc-muted);
  display: flex;
  align-items: center;
  transition: transform 140ms ease;
}

.cc-select[aria-expanded="true"] .cc-select-arrow {
  transform: rotate(180deg);
}

/* Floating Glass Micro-Popover Menu */
.cc-popover-menu {
  position: relative;
  margin-top: 6px;
  width: 220px;
  max-width: 90vw;
  background-color: var(--cc-surface-solid);
  -webkit-backdrop-filter: blur(18px) saturate(160%);
  backdrop-filter: blur(18px) saturate(160%);
  border: 1px solid var(--cc-hairline);
  border-radius: 8px;
  box-shadow: inset 0 1px 0 var(--cc-highlight), var(--cc-shadow-lift);
  display: none;
  flex-direction: column;
  z-index: 2147483647;
  overflow: hidden;
  opacity: 0;
  transform: translateY(-4px) scale(0.98);
  transition: opacity 160ms cubic-bezier(0.16, 1, 0.3, 1), transform 160ms cubic-bezier(0.16, 1, 0.3, 1);
}

.cc-popover-menu.cc-visible,
.cc-popover-menu.cc-exiting {
  display: flex;
}

.cc-popover-menu.cc-visible {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.cc-popover-menu.cc-exiting {
  opacity: 0;
  transform: translateY(-4px) scale(0.98);
  transition: opacity 120ms cubic-bezier(0.4, 0, 1, 1), transform 120ms cubic-bezier(0.4, 0, 1, 1);
}

.cc-popover-search-wrap {
  padding: 6px;
  border-bottom: 1px solid var(--cc-hairline);
}

.cc-popover-search {
  width: 100%;
  box-sizing: border-box;
  background: var(--cc-raised);
  border: 1px solid var(--cc-hairline);
  border-radius: 5px;
  color: var(--cc-text);
  font-family: inherit;
  font-size: 11.5px;
  padding: 4px 8px;
  outline: none;
  transition: border-color 140ms ease;
}

.cc-popover-search:focus {
  border-color: var(--cc-accent);
}

.cc-popover-list {
  max-height: 180px;
  overflow-y: auto;
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.cc-popover-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px 8px;
  border-radius: 5px;
  font-size: 12px;
  color: var(--cc-text);
  cursor: pointer;
  background: transparent;
  border: none;
  width: 100%;
  text-align: left;
  outline: none;
  font-family: inherit;
  transition: background-color 100ms ease, color 100ms ease;
}

.cc-popover-item:hover,
.cc-popover-item:focus-visible {
  background: var(--cc-raised);
  color: var(--cc-text);
}

.cc-popover-item.cc-active {
  background: var(--cc-accent);
  color: var(--cc-accent-fg);
}

.cc-popover-code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-weight: 500;
  font-size: 11.5px;
}

.cc-popover-name {
  color: var(--cc-muted);
  font-size: 11px;
  margin-left: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.cc-popover-item.cc-active .cc-popover-name {
  color: var(--cc-accent-fg);
  opacity: 0.85;
}

.cc-popover-symbol {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  color: var(--cc-muted);
  margin-left: 8px;
}

.cc-popover-item.cc-active .cc-popover-symbol {
  color: var(--cc-accent-fg);
}

.cc-popover-empty {
  padding: 12px 8px;
  text-align: center;
  font-size: 11.5px;
  color: var(--cc-muted);
}

/* Dismiss / Close Button */
.cc-dismiss-btn {
  position: relative;
  background: transparent;
  border: none;
  color: var(--cc-muted);
  padding: 4px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: color 140ms ease, background-color 140ms ease, transform 140ms ease;
  outline: none;
}

.cc-dismiss-btn::after {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  min-width: 44px;
  min-height: 44px;
  pointer-events: auto;
}

.cc-dismiss-btn:hover {
  color: var(--cc-text);
  background-color: var(--cc-raised);
  transform: scale(1.1);
}

.cc-dismiss-btn:active {
  transform: scale(0.92);
}

.cc-dismiss-btn:focus-visible {
  outline: 2px solid var(--cc-accent);
  outline-offset: 1px;
}

/* Ask Mode Offer Prompt Row inside Dynamic Island */
.cc-offer-row {
  display: none;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.cc-dynamic-island.cc-mode-offer .cc-offer-row {
  display: flex;
}

.cc-dynamic-island.cc-mode-offer .cc-island-compact,
.cc-dynamic-island.cc-mode-offer .cc-island-expandable {
  display: none;
}

.cc-offer-text {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--cc-text);
  letter-spacing: -0.01em;
}

.cc-offer-actions {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-left: 2px;
}

.cc-offer-btn {
  border-radius: 9999px;
  padding: 2px 9px;
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 500;
  cursor: pointer;
  outline: none;
  transition: transform 120ms ease, opacity 120ms ease, border-color 140ms ease;
}

.cc-offer-btn:active {
  transform: scale(0.97);
}

.cc-offer-btn:focus-visible {
  outline: 2px solid var(--cc-accent);
  outline-offset: 2px;
}

.cc-offer-btn-primary {
  background: var(--cc-accent);
  color: var(--cc-accent-fg);
  border: 1px solid transparent;
}

.cc-offer-btn-primary:hover {
  opacity: 0.92;
}

.cc-offer-btn-secondary {
  background: var(--cc-raised);
  color: var(--cc-text);
  border: 1px solid var(--cc-hairline);
}

.cc-offer-btn-secondary:hover {
  border-color: var(--cc-muted);
}

/* Collapsed Mini Pill */
.cc-collapsed-pill {
  display: none;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 10px;
  background-color: var(--cc-surface);
  -webkit-backdrop-filter: blur(18px) saturate(160%);
  backdrop-filter: blur(18px) saturate(160%);
  color: var(--cc-text);
  border-radius: 9999px;
  border: 1px solid var(--cc-hairline);
  box-shadow: inset 0 1px 0 var(--cc-highlight), var(--cc-shadow);
  cursor: pointer;
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
  transition: transform 180ms ease, opacity 180ms ease;
}

.cc-collapsed-pill:hover {
  transform: scale(1.05);
  border-color: var(--cc-muted);
}

.cc-collapsed-pill:focus-visible {
  outline: 2px solid var(--cc-accent);
  outline-offset: 2px;
}

/* 2. Hover tooltip (solid surface: it overlays arbitrary page text) */
.cc-tooltip {
  position: fixed;
  display: none;
  flex-direction: column;
  background: var(--cc-surface-solid);
  border: 1px solid var(--cc-hairline);
  border-radius: 6px;
  padding: 6px 10px;
  color: var(--cc-text);
  font-size: 11.5px;
  box-shadow: var(--cc-shadow);
  pointer-events: none;
  z-index: 2147483647;
  width: max-content;
  max-width: 280px;
  opacity: 0;
  transform: translateY(4px);
  transition: opacity 120ms ease, transform 120ms ease;
}

.cc-tooltip.visible {
  display: flex;
  opacity: 1;
  transform: translateY(0);
}

.cc-tooltip-title {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--cc-text);
  margin-bottom: 2px;
  letter-spacing: -0.01em;
}

.cc-tooltip-sub {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 10.5px;
  color: var(--cc-muted);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}

.cc-tooltip-caret {
  position: absolute;
  width: 6px;
  height: 6px;
  background: var(--cc-surface-solid);
  border-right: 1px solid var(--cc-hairline);
  border-bottom: 1px solid var(--cc-hairline);
  transform: rotate(45deg);
  bottom: -4px;
  left: 50%;
  margin-left: -3px;
}

.cc-tooltip.flipped .cc-tooltip-caret {
  bottom: auto;
  top: -4px;
  transform: rotate(225deg);
}

/* 3. Accessibility: transparency, contrast and motion preferences */
@media (prefers-reduced-transparency: reduce) {
  .cc-dynamic-island,
  .cc-collapsed-pill {
    background-color: var(--cc-surface-solid);
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }
}

@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .cc-dynamic-island,
  .cc-collapsed-pill {
    background-color: var(--cc-surface-solid);
  }
}

@media (prefers-contrast: more) {
  .cc-dynamic-island,
  .cc-collapsed-pill,
  .cc-tooltip {
    background-color: var(--cc-surface-solid);
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
    border-color: var(--cc-muted);
  }
}

@media (prefers-reduced-motion: reduce) {
  .cc-dynamic-island,
  .cc-island-expandable,
  .cc-island-expandable-content,
  .cc-popover-menu,
  .cc-collapsed-pill,
  .cc-tooltip {
    transition: none !important;
    animation: none !important;
    transform: none !important;
  }
}
`;

function createSvg(doc, width, height, viewBox, strokeWidth, paths = [], circles = []) {
  const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', String(width));
  svg.setAttribute('height', String(height));
  svg.setAttribute('viewBox', viewBox);
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', String(strokeWidth));
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');

  for (const c of circles) {
    const circle = doc.createElementNS('http://www.w3.org/2000/svg', 'circle');
    for (const [k, v] of Object.entries(c)) {
      circle.setAttribute(k, String(v));
    }
    svg.appendChild(circle);
  }

  for (const p of paths) {
    const path = doc.createElementNS('http://www.w3.org/2000/svg', 'path');
    for (const [k, v] of Object.entries(p)) {
      path.setAttribute(k, String(v));
    }
    svg.appendChild(path);
  }

  return svg;
}

function createCanjiSmallMark(doc, size = 15) {
  const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('viewBox', '0 0 256 256');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', 'cc-brand-mark');
  svg.style.flexShrink = '0';

  const outerPath = doc.createElementNS('http://www.w3.org/2000/svg', 'path');
  outerPath.setAttribute('fill', 'currentColor');
  outerPath.setAttribute(
    'd',
    'M33.68 71.09 L33.68 184.91 L132.25 241.81 L222.32 189.81 L222.32 170.19 L132.25 222.19 L50.68 175.09 L50.68 80.91 L132.25 33.81 L222.32 85.81 L222.32 66.19 L132.25 14.19Z'
  );
  svg.appendChild(outerPath);

  const innerPath = doc.createElementNS('http://www.w3.org/2000/svg', 'path');
  innerPath.setAttribute('fill', 'var(--cc-accent)');
  innerPath.setAttribute(
    'd',
    'M130.96 99.17 L130.96 156.83 L180.89 185.65 L222.32 161.73 L222.32 142.11 L180.89 166.03 L147.96 147.01 L147.96 108.99 L180.89 89.97 L222.32 113.89 L222.32 94.27 L180.89 70.35Z'
  );
  svg.appendChild(innerPath);

  return svg;
}

export class InPageUI {
  constructor({
    doc = (typeof document !== 'undefined' ? document : null),
    mode = 'converted',
    targetCurrency = 'USD',
    sourceCurrency = null,
    isConverted = true,
    convertedCount = 0,
    rateDate = null,
    provider = null,
    theme = 'system',
    showCrypto = false,
    autoCollapse = false,
    onShowOriginal = null,
    onConvert = null,
    onChangeCurrency = null,
    onAcceptOffer = null,
    onAlwaysOnSite = null,
    onDismissOffer = null,
    onDismiss = null
  } = {}) {
    this.doc = doc;
    this.mode = mode === 'offer' ? 'offer' : 'converted';
    this.targetCurrency = targetCurrency;
    this.sourceCurrency = sourceCurrency;
    this.isConverted = isConverted;
    this.convertedCount = convertedCount;
    this.rateDate = rateDate;
    this.provider = provider;
    this.theme = theme;
    this.showCrypto = Boolean(showCrypto);
    this.autoCollapse = autoCollapse;
    this.onShowOriginal = onShowOriginal;
    this.onConvert = onConvert;
    this.onChangeCurrency = onChangeCurrency;
    this.onAcceptOffer = onAcceptOffer;
    this.onAlwaysOnSite = onAlwaysOnSite;
    this.onDismissOffer = onDismissOffer;
    this.onDismiss = onDismiss;

    this.rootContainer = null;
    this.shadowRoot = null;
    this.barContainer = null;
    this.barElement = null;
    this.popoverMenu = null;
    this.popoverSearch = null;
    this.popoverList = null;
    this.selectButton = null;
    this.selectText = null;
    this.collapsedElement = null;
    this.tooltipElement = null;
    this.isDismissedForSession = false;
    this.isCollapsed = false;
    this.isMenuOpen = false;
    this.isHovered = false;
    this.autoCollapseTimer = null;
    this._onDocPointerDown = null;

    // Dragging state
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.barStartLeft = 0;
    this.barStartTop = 0;
    this.hasMovedDrag = false;

    this._checkSessionDismissal();
  }

  _checkSessionDismissal() {
    try {
      if (typeof sessionStorage !== 'undefined') {
        this.isDismissedForSession = sessionStorage.getItem('cc_bar_dismissed') === 'true';
      }
    } catch {}
  }

  mount(cssContent = '') {
    const parent = this.doc ? (this.doc.body || this.doc.documentElement) : null;
    if (!parent) return;

    // Never create a second #cc-dynamic-island-host in a document. Reuse or replace the existing one.
    const existing = this.doc.getElementById('cc-dynamic-island-host');
    if (existing) {
      existing.remove();
    }
    this.rootContainer = null;

    this.rootContainer = this.doc.createElement('div');
    this.rootContainer.id = 'cc-dynamic-island-host';
    this.rootContainer.setAttribute('data-cc-ignore', 'true');

    this.shadowRoot = this.rootContainer.attachShadow({ mode: 'open' });

    // Inject styles (inlined fallback ensures self-contained MV3 injection)
    const effectiveCss = cssContent || INLINE_UI_CSS;
    if (effectiveCss) {
      const styleEl = this.doc.createElement('style');
      styleEl.textContent = effectiveCss;
      this.shadowRoot.appendChild(styleEl);
    }

    // Dynamic Island container
    this.barContainer = this.doc.createElement('div');
    this.barContainer.className = 'cc-island-container cc-container';
    this._applyTheme(this.theme);

    // Build Dynamic Island Pill (themed via --cc-* tokens + data-theme)
    this.barElement = this._buildDynamicIsland();
    this.barContainer.appendChild(this.barElement);

    // Build Floating Glass Micro-Popover Menu for Currency Selection
    this.popoverMenu = this._buildPopoverMenu();
    this.barContainer.appendChild(this.popoverMenu);

    // Build Collapsed Pill (for toggleCollapse compatibility)
    this.collapsedElement = this._buildCollapsedPill();
    this.barContainer.appendChild(this.collapsedElement);

    // Build Hover Tooltip
    this.tooltipElement = this._buildTooltip();
    this.barContainer.appendChild(this.tooltipElement);

    this.shadowRoot.appendChild(this.barContainer);
    parent.appendChild(this.rootContainer);

    this._setupDragging();
    this._setupAutoCollapse();

    if (this.isDismissedForSession) {
      this.barElement.style.display = 'none';
      this.collapsedElement.style.display = 'none';
    }
  }

  _applyTheme(theme) {
    if (!this.barContainer) return;
    if (theme === 'dark') {
      this.barContainer.setAttribute('data-theme', 'dark');
    } else if (theme === 'light') {
      this.barContainer.setAttribute('data-theme', 'light');
    } else {
      this.barContainer.removeAttribute('data-theme');
    }
  }

  _formatOfferText() {
    const count = this.convertedCount !== undefined ? this.convertedCount : 0;
    const noun = count === 1 ? 'price' : 'prices';
    const srcPart = this.sourceCurrency && this.sourceCurrency !== this.targetCurrency
      ? `${this.sourceCurrency} `
      : '';
    return `Found ${count} ${srcPart}${noun}. Convert to ${this.targetCurrency}?`;
  }

  _buildDynamicIsland() {
    const island = this.doc.createElement('div');
    island.className = `cc-dynamic-island cc-bar${this.mode === 'offer' ? ' cc-mode-offer' : ''}`;
    island.setAttribute('role', 'toolbar');
    island.setAttribute('aria-label', 'Canji price toolbar');

    // 0. Ask-Mode Offer Prompt Row (Active when mode === 'offer')
    const offerRow = this.doc.createElement('div');
    offerRow.className = 'cc-offer-row';

    const offerDot = this.doc.createElement('div');
    offerDot.className = 'cc-offer-dot';
    offerRow.appendChild(offerDot);

    const offerText = this.doc.createElement('span');
    offerText.className = 'cc-offer-text';
    offerText.textContent = this._formatOfferText();
    offerRow.appendChild(offerText);

    const offerActions = this.doc.createElement('div');
    offerActions.className = 'cc-offer-actions';

    const btnOfferConvert = this.doc.createElement('button');
    btnOfferConvert.type = 'button';
    btnOfferConvert.className = 'cc-offer-btn cc-offer-btn-primary';
    btnOfferConvert.textContent = 'Convert';
    btnOfferConvert.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (this.onAcceptOffer) {
        this.onAcceptOffer(this.targetCurrency);
      } else if (this.onConvert) {
        this.onConvert(this.targetCurrency);
      }
    });
    offerActions.appendChild(btnOfferConvert);

    const btnOfferAlways = this.doc.createElement('button');
    btnOfferAlways.type = 'button';
    btnOfferAlways.className = 'cc-offer-btn cc-offer-btn-secondary';
    btnOfferAlways.textContent = 'Always on this site';
    btnOfferAlways.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (this.onAlwaysOnSite) {
        this.onAlwaysOnSite(this.targetCurrency);
      } else if (this.onConvert) {
        this.onConvert(this.targetCurrency);
      }
    });
    offerActions.appendChild(btnOfferAlways);

    const btnOfferDismiss = this.doc.createElement('button');
    btnOfferDismiss.type = 'button';
    btnOfferDismiss.className = 'cc-dismiss-btn cc-offer-dismiss';
    btnOfferDismiss.setAttribute('title', 'Hide for now');
    btnOfferDismiss.setAttribute('aria-label', 'Hide conversion offer');
    btnOfferDismiss.appendChild(
      createSvg(this.doc, 11, 11, '0 0 24 24', 2.2, [
        { d: 'M18 6 6 18' },
        { d: 'm6 6 12 12' }
      ])
    );
    btnOfferDismiss.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (this.onDismissOffer) {
        this.onDismissOffer();
      }
      this.dismiss();
    });
    offerActions.appendChild(btnOfferDismiss);

    offerRow.appendChild(offerActions);

    // 1. Compact Row (Always visible in converted capsule)
    const compact = this.doc.createElement('div');
    compact.className = 'cc-island-compact';

    // Status Dot (pine accent while converted, muted when showing originals)
    const statusDot = this.doc.createElement('div');
    statusDot.className = `cc-status-dot ${!this.isConverted ? 'cc-status-inactive' : ''}`;
    compact.appendChild(statusDot);

    // Currency Code: e.g. "NGN → USD" if sourceCurrency is known, else "USD"
    const codeSpan = this.doc.createElement('span');
    codeSpan.className = 'cc-currency-code';
    codeSpan.textContent = this.sourceCurrency && this.sourceCurrency !== this.targetCurrency
      ? `${this.sourceCurrency} → ${this.targetCurrency}`
      : this.targetCurrency;
    compact.appendChild(codeSpan);

    // Bullet Separator
    const sep = this.doc.createElement('span');
    sep.className = 'cc-count-sep cc-sep';
    sep.setAttribute('aria-hidden', 'true');
    sep.textContent = '·';
    compact.appendChild(sep);

    // Count Badge (Geist Mono tabular-nums)
    const countBadge = this.doc.createElement('span');
    countBadge.className = 'cc-count-badge';
    countBadge.textContent = String(this.convertedCount !== undefined ? this.convertedCount : 0);
    compact.appendChild(countBadge);

    island.appendChild(compact);

    // 2. Expandable Row (0fr -> 1fr CSS grid hardware morph on hover/focus)
    const expandable = this.doc.createElement('div');
    expandable.className = 'cc-island-expandable';

    const expandableContent = this.doc.createElement('div');
    expandableContent.className = 'cc-island-expandable-content';

    // Live rate / provider info
    const rateSpan = this.doc.createElement('span');
    rateSpan.className = 'cc-live-rate';
    rateSpan.textContent = this.rateDate ? `${this.rateDate}` : (this.provider ? `${this.provider}` : '');
    if (!this.rateDate && !this.provider) rateSpan.style.display = 'none';
    expandableContent.appendChild(rateSpan);

    // Tactile Segmented Control: [ Original | Converted ]
    const segmented = this.doc.createElement('div');
    segmented.className = 'cc-segmented';
    segmented.setAttribute('role', 'tablist');
    segmented.setAttribute('aria-label', 'View original or converted prices');

    const btnOriginal = this.doc.createElement('button');
    btnOriginal.className = `cc-segment-btn cc-segment-original ${!this.isConverted ? 'active' : ''}`;
    btnOriginal.setAttribute('type', 'button');
    btnOriginal.setAttribute('role', 'tab');
    btnOriginal.setAttribute('aria-selected', !this.isConverted ? 'true' : 'false');
    btnOriginal.setAttribute('data-state', 'original');
    btnOriginal.textContent = 'Original';

    btnOriginal.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (this.isConverted) {
        this.update({ isConverted: false });
        if (this.onShowOriginal) this.onShowOriginal();
      }
    });
    segmented.appendChild(btnOriginal);

    const btnConverted = this.doc.createElement('button');
    btnConverted.className = `cc-segment-btn cc-segment-converted ${this.isConverted ? 'active' : ''}`;
    btnConverted.setAttribute('type', 'button');
    btnConverted.setAttribute('role', 'tab');
    btnConverted.setAttribute('data-state', 'converted');
    btnConverted.setAttribute('aria-selected', this.isConverted ? 'true' : 'false');
    btnConverted.setAttribute('aria-label', `Show prices converted to ${this.targetCurrency}`);
    btnConverted.textContent = 'Converted';

    btnConverted.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!this.isConverted) {
        this.update({ isConverted: true });
        if (this.onConvert) this.onConvert(this.targetCurrency);
      }
    });
    segmented.appendChild(btnConverted);
    expandableContent.appendChild(segmented);

    // Quick Currency Switcher Dropdown inside Island
    const selectWrapper = this.doc.createElement('div');
    selectWrapper.className = 'cc-select-wrapper';

    const select = this.doc.createElement('button');
    select.className = 'cc-select';
    select.setAttribute('type', 'button');
    select.setAttribute('role', 'combobox');
    select.setAttribute('aria-haspopup', 'listbox');
    select.setAttribute('aria-expanded', 'false');
    select.setAttribute('aria-label', 'Change target currency');

    let curVal = this.targetCurrency;
    const selectText = this.doc.createElement('span');
    selectText.className = 'cc-select-text';
    selectText.textContent = this.targetCurrency;
    select.appendChild(selectText);

    Object.defineProperty(select, 'value', {
      get: () => curVal,
      set: (val) => {
        curVal = val;
        selectText.textContent = val;
      },
      configurable: true
    });

    select.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this._togglePopover();
    });

    select.addEventListener('change', (e) => {
      const newCur = select.value;
      if (newCur && newCur !== this.targetCurrency) {
        this.targetCurrency = newCur;
        codeSpan.textContent = this.sourceCurrency && this.sourceCurrency !== this.targetCurrency
          ? `${this.sourceCurrency} → ${this.targetCurrency}`
          : this.targetCurrency;
        this.update({ isConverted: true, targetCurrency: newCur });
        if (this.onChangeCurrency) this.onChangeCurrency(newCur);
      }
    });

    const selectArrow = createSvg(
      this.doc,
      8,
      8,
      '0 0 24 24',
      2.5,
      [{ d: 'm6 9 6 6 6-6' }]
    );
    selectArrow.setAttribute('class', 'cc-select-arrow');
    select.appendChild(selectArrow);

    selectWrapper.appendChild(select);
    expandableContent.appendChild(selectWrapper);

    this.selectButton = select;
    this.selectText = selectText;

    // Dismiss / Close Button (Clean '×' icon, zero innerHTML)
    const btnDismiss = this.doc.createElement('button');
    btnDismiss.className = 'cc-dismiss-btn cc-btn-close';
    btnDismiss.setAttribute('type', 'button');
    btnDismiss.setAttribute('title', 'Hide for now');
    btnDismiss.setAttribute('aria-label', 'Hide price toolbar');

    const closeSvg = createSvg(
      this.doc,
      11,
      11,
      '0 0 24 24',
      2.2,
      [
        { d: 'M18 6 6 18' },
        { d: 'm6 6 12 12' }
      ]
    );
    btnDismiss.appendChild(closeSvg);

    btnDismiss.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.dismiss();
    });
    expandableContent.appendChild(btnDismiss);

    expandable.appendChild(expandableContent);
    island.appendChild(expandable);
    island.appendChild(offerRow);

    return island;
  }

  _buildPopoverMenu() {
    const popover = this.doc.createElement('div');
    popover.className = 'cc-popover-menu';
    popover.setAttribute('role', 'listbox');
    popover.setAttribute('aria-label', 'Select target currency');

    const searchWrap = this.doc.createElement('div');
    searchWrap.className = 'cc-popover-search-wrap';

    const searchInput = this.doc.createElement('input');
    searchInput.className = 'cc-popover-search';
    searchInput.type = 'text';
    searchInput.placeholder = 'Search currency...';
    searchInput.setAttribute('aria-label', 'Search currencies');
    searchWrap.appendChild(searchInput);
    popover.appendChild(searchWrap);

    const list = this.doc.createElement('div');
    list.className = 'cc-popover-list';
    popover.appendChild(list);

    this.popoverSearch = searchInput;
    this.popoverList = list;

    const renderItems = (filter = '') => {
      list.replaceChildren();
      const currencies = getAllCurrencies({ includeCrypto: Boolean(this.showCrypto) });
      const cleanFilter = filter.trim().toLowerCase();
      const filtered = cleanFilter
        ? currencies.filter(c => c.code.toLowerCase().includes(cleanFilter) || c.name.toLowerCase().includes(cleanFilter))
        : currencies;

      if (filtered.length === 0) {
        const empty = this.doc.createElement('div');
        empty.className = 'cc-popover-empty';
        empty.textContent = 'No matching currency';
        list.appendChild(empty);
        return;
      }

      for (const c of filtered) {
        const item = this.doc.createElement('button');
        item.type = 'button';
        item.className = `cc-popover-item ${c.code === this.targetCurrency ? 'cc-active' : ''}`;
        item.setAttribute('role', 'option');
        item.setAttribute('aria-selected', c.code === this.targetCurrency ? 'true' : 'false');
        item.setAttribute('data-currency-code', c.code);

        const codeSpan = this.doc.createElement('span');
        codeSpan.className = 'cc-popover-code';
        codeSpan.textContent = c.code;
        item.appendChild(codeSpan);

        const nameSpan = this.doc.createElement('span');
        nameSpan.className = 'cc-popover-name';
        nameSpan.textContent = c.name;
        item.appendChild(nameSpan);

        const symSpan = this.doc.createElement('span');
        symSpan.className = 'cc-popover-symbol';
        symSpan.textContent = c.symbol;
        item.appendChild(symSpan);

        item.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this._selectCurrency(c.code);
        });

        list.appendChild(item);
      }
    };

    searchInput.addEventListener('input', (e) => {
      renderItems(e.target.value);
    });

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this._closePopover();
        this.selectButton?.focus();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        const first = list.querySelector('.cc-popover-item');
        if (first) first.focus();
      }
    });

    popover.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this._closePopover();
        this.selectButton?.focus();
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        const items = Array.from(list.querySelectorAll('.cc-popover-item'));
        if (items.length === 0) return;
        const active = this.shadowRoot?.activeElement;
        const idx = items.indexOf(active);
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          const next = idx < 0 ? items[0] : items[(idx + 1) % items.length];
          next?.focus();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (idx <= 0) {
            searchInput.focus();
          } else {
            items[idx - 1]?.focus();
          }
        }
      }
    });

    this._renderPopoverItems = renderItems;
    return popover;
  }

  _openPopover() {
    if (!this.popoverMenu) return;
    this.isMenuOpen = true;
    this._clearAutoCollapseTimer();
    this.barElement?.classList.add('cc-expanded');
    this.popoverMenu.classList.remove('cc-exiting');
    this.popoverMenu.classList.add('cc-visible');
    this.selectButton?.setAttribute('aria-expanded', 'true');
    if (this._renderPopoverItems) {
      if (this.popoverSearch) this.popoverSearch.value = '';
      this._renderPopoverItems('');
    }
    setTimeout(() => {
      this.popoverSearch?.focus();
    }, 50);
  }

  _closePopover() {
    if (!this.popoverMenu) return;
    this.isMenuOpen = false;
    this.barElement?.classList.remove('cc-expanded');
    this.selectButton?.setAttribute('aria-expanded', 'false');
    const wasVisible = this.popoverMenu.classList.contains('cc-visible');
    this.popoverMenu.classList.remove('cc-visible');
    if (wasVisible) {
      this.popoverMenu.classList.add('cc-exiting');
      setTimeout(() => {
        this.popoverMenu?.classList.remove('cc-exiting');
      }, 120);
    }
    if (this.autoCollapse && this.isConverted && !this.isHovered) {
      this.scheduleAutoCollapse();
    }
  }

  _togglePopover() {
    if (this.isMenuOpen) {
      this._closePopover();
    } else {
      this._openPopover();
    }
  }

  _selectCurrency(newCur) {
    if (newCur && newCur !== this.targetCurrency) {
      this.targetCurrency = newCur;
      if (this.selectButton) {
        this.selectButton.value = newCur;
      }
      const codeSpan = this.barElement?.querySelector('.cc-currency-code');
      if (codeSpan) {
        codeSpan.textContent = this.sourceCurrency && this.sourceCurrency !== this.targetCurrency
          ? `${this.sourceCurrency} → ${this.targetCurrency}`
          : this.targetCurrency;
      }
      this.update({ isConverted: true, targetCurrency: newCur });
      if (this.onChangeCurrency) {
        this.onChangeCurrency(newCur);
      }
    }
    this._closePopover();
  }

  _buildCollapsedPill() {
    const mini = this.doc.createElement('button');
    mini.className = 'cc-collapsed-pill cc-bar-collapsed';
    mini.setAttribute('type', 'button');
    mini.setAttribute('title', 'Expand Canji');
    mini.setAttribute('aria-label', 'Expand Canji toolbar');
    mini.style.display = 'none';

    const dot = this.doc.createElement('span');
    dot.className = 'cc-status-dot';
    mini.appendChild(dot);

    const label = this.doc.createElement('span');
    label.className = 'cc-mini-label';
    label.textContent = `${this.convertedCount !== undefined ? this.convertedCount : 0} ${this.targetCurrency}`;
    mini.appendChild(label);

    mini.addEventListener('click', (e) => {
      if (this.hasMovedDrag) {
        this.hasMovedDrag = false;
        e.preventDefault();
        return;
      }
      this.toggleCollapse();
    });

    return mini;
  }

  _setupAutoCollapse() {
    if (!this.barElement) return;

    this.barElement.addEventListener('pointerenter', () => {
      this.isHovered = true;
      this._clearAutoCollapseTimer();
    });

    this.barElement.addEventListener('pointerleave', () => {
      this.isHovered = false;
      if (this.autoCollapse && this.isConverted && this.mode !== 'offer' && !this.isMenuOpen) {
        this.scheduleAutoCollapse();
      }
    });

    this.barElement.addEventListener('focusin', () => {
      this.isHovered = true;
      this._clearAutoCollapseTimer();
    });

    this.barElement.addEventListener('focusout', (e) => {
      if (this.barContainer && e.relatedTarget && this.barContainer.contains(e.relatedTarget)) {
        return;
      }
      this.isHovered = false;
      if (this.autoCollapse && this.isConverted && this.mode !== 'offer' && !this.isMenuOpen) {
        this.scheduleAutoCollapse();
      }
    });

    // Dismiss popover on outside click
    this._onDocPointerDown = (e) => {
      if (!this.isMenuOpen) return;
      const target = e.target;
      if (this.rootContainer && !this.rootContainer.contains(target) && !this.shadowRoot?.contains(target)) {
        this._closePopover();
      }
    };
    this.doc.addEventListener('pointerdown', this._onDocPointerDown);

    if (this.autoCollapse && this.isConverted && this.mode !== 'offer' && !this.isCollapsed) {
      this.scheduleAutoCollapse();
    }
  }

  scheduleAutoCollapse(delay = 3500) {
    this._clearAutoCollapseTimer();
    if (this.mode === 'offer' || this.isDismissedForSession || this.isCollapsed || this.isHovered || this.isMenuOpen || this.isDragging) {
      return;
    }
    this.autoCollapseTimer = setTimeout(() => {
      if (this.mode !== 'offer' && !this.isHovered && !this.isMenuOpen && !this.isDragging && !this.isDismissedForSession) {
        this.toggleCollapse(true);
      }
    }, delay);
  }

  _clearAutoCollapseTimer() {
    if (this.autoCollapseTimer) {
      clearTimeout(this.autoCollapseTimer);
      this.autoCollapseTimer = null;
    }
  }

  _setupDragging() {
    if (!this.barContainer || !this.barElement) return;

    const onPointerDown = (e) => {
      const target = e.target;
      if (
        target.tagName === 'BUTTON' ||
        target.tagName === 'SELECT' ||
        target.tagName === 'OPTION' ||
        target.closest('button') ||
        target.closest('select') ||
        target.closest('.cc-popover-menu')
      ) {
        return;
      }

      this.isDragging = true;
      this.hasMovedDrag = false;
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;

      const rect = this.barContainer.getBoundingClientRect();
      this.barStartLeft = rect.left;
      this.barStartTop = rect.top;

      this.barContainer.classList.add('cc-dragging');
      this.doc.addEventListener('pointermove', onPointerMove, { passive: false });
      this.doc.addEventListener('pointerup', onPointerUp, { passive: false });
      this.doc.addEventListener('pointercancel', onPointerUp, { passive: false });
    };

    const onPointerMove = (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.dragStartX;
      const dy = e.clientY - this.dragStartY;

      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        this.hasMovedDrag = true;
      }

      const winWidth = this.doc.defaultView?.innerWidth || 1200;
      const winHeight = this.doc.defaultView?.innerHeight || 800;
      const barWidth = this.barContainer.offsetWidth || 240;
      const barHeight = this.barContainer.offsetHeight || 38;

      const newLeft = Math.min(Math.max(this.barStartLeft + dx, 8), winWidth - barWidth - 8);
      const newTop = Math.min(Math.max(this.barStartTop + dy, 8), winHeight - barHeight - 8);

      this.barContainer.style.left = `${newLeft}px`;
      this.barContainer.style.top = `${newTop}px`;
      this.barContainer.style.transform = 'none';
      e.preventDefault();
    };

    const onPointerUp = () => {
      this.isDragging = false;
      this.barContainer.classList.remove('cc-dragging');
      this.doc.removeEventListener('pointermove', onPointerMove);
      this.doc.removeEventListener('pointerup', onPointerUp);
      this.doc.removeEventListener('pointercancel', onPointerUp);
    };

    this.barElement.addEventListener('pointerdown', onPointerDown);
    this.collapsedElement.addEventListener('pointerdown', onPointerDown);
  }

  toggleCollapse(forceState) {
    this.isCollapsed = typeof forceState === 'boolean' ? forceState : !this.isCollapsed;
    if (this.isCollapsed) {
      this._closePopover();
      this.barElement.style.display = 'none';
      this.collapsedElement.style.display = 'inline-flex';
    } else {
      this.collapsedElement.style.display = 'none';
      this.barElement.style.display = 'flex';
      if (this.autoCollapse && this.isConverted) {
        this.scheduleAutoCollapse();
      }
    }
  }

  dismiss() {
    if (!this.barElement) return;
    this.isDismissedForSession = true;
    this._clearAutoCollapseTimer();
    this._closePopover();
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('cc_bar_dismissed', 'true');
      }
    } catch {}

    this.barElement.style.display = 'none';
    if (this.collapsedElement) {
      this.collapsedElement.style.display = 'none';
    }
    if (this.onDismiss) this.onDismiss();
  }

  hide() {
    this._clearAutoCollapseTimer();
    this._closePopover();
    if (this.barElement) {
      this.barElement.style.display = 'none';
    }
    if (this.collapsedElement) {
      this.collapsedElement.style.display = 'none';
    }
    this.hideTooltip();
  }

  show() {
    this.isDismissedForSession = false;
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem('cc_bar_dismissed');
      }
    } catch {}

    if (this.barElement) {
      this.barElement.style.display = 'flex';
    }
    if (this.collapsedElement) {
      this.collapsedElement.style.display = 'none';
    }
    if (this.autoCollapse && this.isConverted) {
      this.scheduleAutoCollapse();
    }
  }

  update({ mode, isConverted, targetCurrency, sourceCurrency, count, rateDate, provider, theme, showCrypto } = {}) {
    if (mode !== undefined) {
      this.mode = mode === 'offer' ? 'offer' : 'converted';
    } else if (isConverted === true && this.mode === 'offer') {
      this.mode = 'converted';
    }
    if (isConverted !== undefined) this.isConverted = Boolean(isConverted);
    if (targetCurrency !== undefined) this.targetCurrency = targetCurrency;
    if (sourceCurrency !== undefined) this.sourceCurrency = sourceCurrency;
    if (count !== undefined) this.convertedCount = count;
    if (rateDate !== undefined) this.rateDate = rateDate;
    if (provider !== undefined) this.provider = provider;
    if (theme !== undefined) {
      this.theme = theme;
      this._applyTheme(theme);
    }
    if (showCrypto !== undefined && Boolean(showCrypto) !== Boolean(this.showCrypto)) {
      this.showCrypto = Boolean(showCrypto);
      if (this._renderPopoverItems) {
        this._renderPopoverItems(this.popoverSearch?.value || '');
      }
    }

    if (!this.barElement) return;

    this.barElement.classList.toggle('cc-mode-offer', this.mode === 'offer');

    const offerTextEl = this.barElement.querySelector('.cc-offer-text');
    const dot = this.barElement.querySelector('.cc-island-compact .cc-status-dot');
    const btnOriginal = this.barElement.querySelector('.cc-segment-original');
    const btnConverted = this.barElement.querySelector('.cc-segment-converted');
    const codeSpan = this.barElement.querySelector('.cc-currency-code');
    const countBadge = this.barElement.querySelector('.cc-count-badge');
    const rateSpan = this.barElement.querySelector('.cc-live-rate');
    const select = this.barElement.querySelector('.cc-select');
    const miniLabel = this.collapsedElement?.querySelector('.cc-mini-label');

    if (offerTextEl) {
      offerTextEl.textContent = this._formatOfferText();
    }
    if (dot) {
      dot.classList.toggle('cc-status-inactive', !this.isConverted);
    }
    if (btnOriginal) {
      btnOriginal.classList.toggle('active', !this.isConverted);
      btnOriginal.setAttribute('aria-selected', !this.isConverted ? 'true' : 'false');
    }
    if (btnConverted) {
      btnConverted.classList.toggle('active', this.isConverted);
      btnConverted.setAttribute('aria-selected', this.isConverted ? 'true' : 'false');
    }
    if (codeSpan) {
      codeSpan.textContent = this.sourceCurrency && this.sourceCurrency !== this.targetCurrency
        ? `${this.sourceCurrency} → ${this.targetCurrency}`
        : this.targetCurrency;
    }
    if (countBadge) {
      countBadge.textContent = String(this.convertedCount !== undefined ? this.convertedCount : 0);
      countBadge.style.display = 'inline-flex';
    }
    if (rateSpan && (this.rateDate || this.provider)) {
      rateSpan.textContent = this.rateDate || this.provider;
      rateSpan.style.display = 'inline';
    }
    if (select && select.value !== this.targetCurrency) {
      select.value = this.targetCurrency;
    }
    if (miniLabel) {
      miniLabel.textContent = `${this.convertedCount !== undefined ? this.convertedCount : 0} ${this.targetCurrency}`;
    }

    if (!this.isDismissedForSession && this.barElement.style.display === 'none' && !this.isCollapsed) {
      this.barElement.style.display = 'flex';
    }

    if (this.autoCollapse && this.isConverted && !this.isCollapsed) {
      this.scheduleAutoCollapse();
    }
  }

  _buildTooltip() {
    const tooltip = this.doc.createElement('div');
    tooltip.className = 'cc-tooltip';
    tooltip.setAttribute('role', 'tooltip');
    tooltip.setAttribute('aria-hidden', 'true');

    const content = this.doc.createElement('div');
    content.className = 'cc-tooltip-content';

    const title = this.doc.createElement('div');
    title.className = 'cc-tooltip-title';
    content.appendChild(title);

    const sub = this.doc.createElement('div');
    sub.className = 'cc-tooltip-sub';
    content.appendChild(sub);

    const caret = this.doc.createElement('div');
    caret.className = 'cc-tooltip-caret';
    caret.setAttribute('aria-hidden', 'true');

    tooltip.appendChild(content);
    tooltip.appendChild(caret);

    return tooltip;
  }

  showTooltip({ originalAmount, originalCurrency, convertedAmount, rate, date, targetElement, x, y }) {
    if (!this.tooltipElement) return;

    const titleEl = this.tooltipElement.querySelector('.cc-tooltip-title');
    const subEl = this.tooltipElement.querySelector('.cc-tooltip-sub');

    const formattedOriginal = formatCurrency(originalAmount, originalCurrency);
    const formattedConverted =
      convertedAmount !== undefined && convertedAmount !== null
        ? ` → ${formatCurrency(convertedAmount, this.targetCurrency)}`
        : '';
    titleEl.textContent = `Original: ${formattedOriginal}${formattedConverted}`;

    const formatUnitRate = (r) => {
      if (!r || !Number.isFinite(r)) return '';
      if (r < 0.01 && r > 0) return Number(r.toPrecision(4)).toString();
      return r.toFixed(4);
    };
    const formattedUnitRate = rate ? `1 ${originalCurrency} = ${formatUnitRate(rate)} ${this.targetCurrency}` : '';
    const dateStr = date ? ` · Rates: ${date}` : '';
    subEl.textContent = `${formattedUnitRate}${dateStr}`;

    const winWidth = this.doc.defaultView?.innerWidth || 1000;
    const tooltipWidth = 260;
    let left = (x || 0) + 10;
    let top = (y || 0) - 48;
    let isFlipped = false;

    if (targetElement && targetElement.getBoundingClientRect) {
      const rect = targetElement.getBoundingClientRect();
      left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
      if (rect.top > 54) {
        top = rect.top - 46;
        isFlipped = false;
      } else {
        top = rect.bottom + 8;
        isFlipped = true;
      }
    }

    left = Math.min(Math.max(left, 10), winWidth - tooltipWidth - 10);
    top = Math.max(top, 8);

    let offsetLeft = 0;
    let offsetTop = 0;
    if (this.barContainer && this.barContainer.getBoundingClientRect && this.barContainer.style.transform !== 'none') {
      const cRect = this.barContainer.getBoundingClientRect();
      if (cRect.left !== 0 || cRect.top !== 0) {
        offsetLeft = cRect.left;
        offsetTop = cRect.top;
      }
    }

    this.tooltipElement.style.left = `${Math.round(left - offsetLeft)}px`;
    this.tooltipElement.style.top = `${Math.round(top - offsetTop)}px`;
    this.tooltipElement.classList.toggle('flipped', isFlipped);
    this.tooltipElement.classList.add('visible');
    this.tooltipElement.setAttribute('aria-hidden', 'false');
  }

  hideTooltip() {
    if (!this.tooltipElement) return;
    this.tooltipElement.classList.remove('visible');
    this.tooltipElement.setAttribute('aria-hidden', 'true');
  }

  unmount() {
    this._clearAutoCollapseTimer();
    this._closePopover();
    if (this._onDocPointerDown) {
      this.doc.removeEventListener('pointerdown', this._onDocPointerDown);
      this._onDocPointerDown = null;
    }
    if (this.rootContainer && this.rootContainer.parentNode) {
      this.rootContainer.parentNode.removeChild(this.rootContainer);
      this.rootContainer = null;
      this.shadowRoot = null;
    }
  }
}
