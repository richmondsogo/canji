import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { parseNumberString } from '../src/shared/parser.js';
import { PageScanner } from '../src/content/scanner.js';
import { InPageUI } from '../src/content/ui.js';

test('parser: parseNumberString handles 0,500 as decimal 0.5 without stripping to 500', () => {
  assert.equal(parseNumberString('0,500'), 0.5);
  assert.equal(parseNumberString('0,250'), 0.25);
  assert.equal(parseNumberString('0,75'), 0.75);
  assert.equal(parseNumberString('0,999'), 0.999);
  assert.equal(parseNumberString('1,500'), 1500); // 3 digits after comma without leading 0 is thousands
  assert.equal(parseNumberString('149,50'), 149.5); // 2 digits after comma is decimal
  assert.equal(parseNumberString('1.299,99'), 1299.99);
});

test('scanner: multiple convert-revert-convert cycles succeed without dropping elements', () => {
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="test"><p>Item 1: $100.00</p><p>Item 2: $250.00</p></div></body></html>');
  const doc = dom.window.document;
  const originalHtml = doc.body.innerHTML;

  const ratesTable = {
    USD: 1.10,
    EUR: 1.0,
    GBP: 0.85
  };

  const scanner = new PageScanner({
    doc,
    targetCurrency: 'EUR',
    ratesTable,
    displayMode: 'replace'
  });

  // Cycle 1: Convert
  const c1 = scanner.convert();
  assert.equal(c1, 2, 'First conversion should convert 2 prices');
  assert.ok(!doc.body.innerHTML.includes('$100.00'));

  // Cycle 1: Revert
  scanner.revert();
  assert.equal(doc.body.innerHTML, originalHtml, 'Revert must restore exact original HTML');

  // Cycle 2: Convert again! (Previously failed and returned 0)
  const c2 = scanner.convert();
  assert.equal(c2, 2, 'Second conversion after revert must convert 2 prices again');
  assert.ok(!doc.body.innerHTML.includes('$100.00'));

  // Cycle 2: Revert
  scanner.revert();
  assert.equal(doc.body.innerHTML, originalHtml, 'Second revert must restore exact original HTML');

  // Cycle 3: Convert with highlight display mode
  scanner.displayMode = 'replace_highlight';
  const c3 = scanner.convert();
  assert.equal(c3, 2, 'Third conversion in highlight mode should convert 2 prices');
  assert.ok(doc.body.innerHTML.includes('cc-price-highlight'));

  // Cycle 3: Revert
  scanner.revert();
  assert.equal(doc.body.innerHTML, originalHtml, 'Reverting highlight mode restores original DOM');
});

test('ui: InPageUI lifecycle, segmented switch, collapse, and updates', () => {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  const doc = dom.window.document;

  let showOriginalCalled = false;
  let convertCalled = false;
  let changeCurrencyCalled = null;

  const ui = new InPageUI({
    doc,
    targetCurrency: 'EUR',
    isConverted: true,
    convertedCount: 14,
    theme: 'dark',
    onShowOriginal: () => { showOriginalCalled = true; },
    onConvert: (cur) => { convertCalled = true; },
    onChangeCurrency: (cur) => { changeCurrencyCalled = cur; }
  });

  ui.mount('/* css */');

  assert.ok(ui.rootContainer, 'Shadow DOM root container should be mounted');
  assert.ok(ui.barElement, 'Bar element created');
  assert.ok(ui.collapsedElement, 'Collapsed element created');
  assert.ok(ui.tooltipElement, 'Tooltip element created');

  // Verify segmented buttons
  const btnOriginal = ui.barElement.querySelector('.cc-segment-original');
  const btnConverted = ui.barElement.querySelector('.cc-segment-converted');
  const countBadge = ui.barElement.querySelector('.cc-count-badge');
  const codeSpan = ui.barElement.querySelector('.cc-currency-code');

  assert.ok(btnConverted.classList.contains('active'), 'Converted segment should be active initially');
  assert.equal(countBadge.textContent, '14');
  assert.equal(codeSpan.textContent, 'EUR');

  // Click Original segment
  btnOriginal.click();
  assert.ok(showOriginalCalled, 'Clicking original segment triggers onShowOriginal callback');
  assert.ok(btnOriginal.classList.contains('active'), 'Original segment is now active');
  assert.ok(!btnConverted.classList.contains('active'), 'Converted segment is no longer active');

  // Click Converted segment
  btnConverted.click();
  assert.ok(convertCalled, 'Clicking converted segment triggers onConvert callback');

  // Test dynamic update()
  ui.update({
    isConverted: true,
    targetCurrency: 'GBP',
    count: 22
  });
  assert.equal(codeSpan.textContent, 'GBP');
  assert.equal(countBadge.textContent, '22');

  // Test collapse toggle
  assert.equal(ui.isCollapsed, false);
  ui.toggleCollapse();
  assert.equal(ui.isCollapsed, true);
  assert.equal(ui.barElement.style.display, 'none');
  assert.equal(ui.collapsedElement.style.display, 'inline-flex');

  // Expand
  ui.toggleCollapse();
  assert.equal(ui.isCollapsed, false);
  assert.equal(ui.barElement.style.display, 'flex');

  // Test Tooltip display and hide
  const sampleTarget = doc.createElement('span');
  sampleTarget.getBoundingClientRect = () => ({
    left: 100,
    top: 150,
    right: 180,
    bottom: 170,
    width: 80,
    height: 20
  });

  ui.showTooltip({
    originalAmount: 199.99,
    originalCurrency: 'USD',
    convertedAmount: 165.50,
    rate: 0.8275,
    date: '2026-10-20',
    targetElement: sampleTarget,
    x: 140,
    y: 160
  });

  assert.ok(ui.tooltipElement.classList.contains('visible'), 'Tooltip should be visible');
  const title = ui.tooltipElement.querySelector('.cc-tooltip-title');
  assert.ok(title.textContent.includes('199.99'));

  ui.hideTooltip();
  assert.ok(!ui.tooltipElement.classList.contains('visible'), 'Tooltip should be hidden');

  ui.unmount();
  assert.equal(ui.rootContainer, null);
});

test('popup: isRestrictedPage correctly identifies system vs web pages', async () => {
  const { isRestrictedPage } = await import('../src/popup/popup.js');

  assert.equal(isRestrictedPage(undefined), false);
  assert.equal(isRestrictedPage(''), false);
  assert.equal(isRestrictedPage('https://www.jumia.com.ng/'), false);
  assert.equal(isRestrictedPage('http://localhost:3000'), false);
  assert.equal(isRestrictedPage('https://amazon.com'), false);
  assert.equal(isRestrictedPage('chrome://extensions'), true);
  assert.equal(isRestrictedPage('edge://settings'), true);
  assert.equal(isRestrictedPage('about:blank'), true);
  assert.equal(isRestrictedPage('moz-extension://some-uuid/popup.html'), true);
  assert.equal(isRestrictedPage('chrome-extension://some-id/options.html'), true);
  assert.equal(isRestrictedPage('https://chromewebstore.google.com/detail/123'), true);
  assert.equal(isRestrictedPage('https://addons.mozilla.org/en-US/firefox/addon/123'), true);
});

test('ui: Dynamic Island pill displays source -> target currency in compact view', () => {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  const doc = dom.window.document;

  const ui = new InPageUI({
    doc,
    sourceCurrency: 'NGN',
    targetCurrency: 'USD',
    isConverted: true,
    convertedCount: 4
  });
  ui.mount();

  const codeSpan = ui.barElement.querySelector('.cc-currency-code');
  assert.equal(codeSpan.textContent, 'NGN → USD');
  const countBadge = ui.barElement.querySelector('.cc-count-badge');
  assert.equal(countBadge.textContent, '4');
});

test('ui: Dynamic Island pill maintains single-capsule horizontal expansion architecture', async () => {
  const { INLINE_UI_CSS, InPageUI } = await import('../src/content/ui.js');
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  const doc = dom.window.document;

  const ui = new InPageUI({ doc, targetCurrency: 'USD', isConverted: true, convertedCount: 1 });
  ui.mount();

  // Verify DOM structure: compact row and expandable row are inside the single dynamic island pill
  const island = ui.barElement;
  assert.ok(island.classList.contains('cc-dynamic-island'), 'Pill must carry cc-dynamic-island class');

  const compact = island.querySelector('.cc-island-compact');
  const expandable = island.querySelector('.cc-island-expandable');
  assert.ok(compact, 'Must contain .cc-island-compact');
  assert.ok(compact.querySelector('.cc-status-dot'), 'Must contain status dot in compact capsule');
  assert.ok(ui.collapsedElement.querySelector('.cc-status-dot'), 'Must contain status dot in collapsed mini-pill');
  assert.ok(expandable, 'Must contain .cc-island-expandable inside the single capsule');
  assert.strictEqual(expandable.parentElement, island, 'Expandable row must be a direct child of the single island capsule');

  const content = expandable.querySelector('.cc-island-expandable-content');
  assert.ok(content, 'Must contain .cc-island-expandable-content');
  assert.ok(content.querySelector('.cc-segmented'), 'Must contain segmented control inside expandable content');
  assert.ok(content.querySelector('.cc-select'), 'Must contain currency select inside expandable content');
  assert.ok(content.querySelector('.cc-dismiss-btn'), 'Must contain dismiss button inside expandable content');

  // Verify CSS architecture: single capsule hardware morph (0fr -> 1fr grid) with overflow hidden
  assert.match(INLINE_UI_CSS, /\.cc-dynamic-island\s*\{[^}]*overflow:\s*hidden/s, 'Capsule must clip with overflow: hidden');
  assert.match(INLINE_UI_CSS, /\.cc-island-expandable\s*\{[^}]*grid-template-columns:\s*0fr/s, 'Expandable track must rest at 0fr');
  assert.match(INLINE_UI_CSS, /grid-template-columns:\s*1fr/, 'Expandable track must expand to 1fr on hover/focus');
});

test('ui: Dynamic Island micro-popover menu and auto-collapse behavior', async () => {
  const { InPageUI } = await import('../src/content/ui.js');
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  const doc = dom.window.document;

  let selectedCurrency = null;
  const ui = new InPageUI({
    doc,
    targetCurrency: 'USD',
    isConverted: true,
    convertedCount: 5,
    autoCollapse: true,
    onChangeCurrency: (cur) => { selectedCurrency = cur; }
  });
  ui.mount();

  const selectBtn = ui.barElement.querySelector('.cc-select');
  assert.ok(selectBtn, 'Must render .cc-select trigger');
  assert.equal(selectBtn.value, 'USD');

  // Verify popover menu is mounted in barContainer
  const popover = ui.popoverMenu;
  assert.ok(popover, 'Must render .cc-popover-menu in container');
  assert.ok(!popover.classList.contains('cc-visible'), 'Popover is closed by default');

  // Click trigger opens popover
  selectBtn.click();
  assert.ok(popover.classList.contains('cc-visible'), 'Clicking trigger opens popover');
  assert.equal(selectBtn.getAttribute('aria-expanded'), 'true');

  // Check currency items rendered
  const items = popover.querySelectorAll('.cc-popover-item');
  assert.ok(items.length > 10, 'Must render list of currency items');

  // Find EUR item and click
  const eurItem = Array.from(items).find(el => el.getAttribute('data-currency-code') === 'EUR');
  assert.ok(eurItem, 'EUR item exists in list');
  eurItem.click();

  assert.equal(selectedCurrency, 'EUR', 'Selecting EUR invokes onChangeCurrency');
  assert.equal(ui.targetCurrency, 'EUR');
  assert.equal(selectBtn.value, 'EUR');
  assert.ok(!popover.classList.contains('cc-visible'), 'Popover closes after selection');

  // Test Auto-Collapse Timer: schedule with short delay
  assert.equal(ui.isCollapsed, false);
  ui.scheduleAutoCollapse(10);
  await new Promise(r => setTimeout(r, 35));
  assert.equal(ui.isCollapsed, true, 'Auto-collapse collapses to mini pill after timeout');
  assert.equal(ui.barElement.style.display, 'none');
  assert.equal(ui.collapsedElement.style.display, 'inline-flex');

  // Expanding via click on mini pill restores full pill
  ui.collapsedElement.click();
  assert.equal(ui.isCollapsed, false, 'Clicking mini pill re-expands Dynamic Island');
  assert.equal(ui.barElement.style.display, 'flex');

  ui.unmount();
});

test('ui: InPageUI respects showCrypto option and dynamic updates', () => {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  const doc = dom.window.document;

  // 1. Initialized with showCrypto = false
  const ui = new InPageUI({
    doc,
    targetCurrency: 'USD',
    isConverted: true,
    showCrypto: false
  });
  ui.mount();

  const selectBtn = ui.barElement.querySelector('.cc-select');
  selectBtn.click(); // opens popover

  let items = Array.from(ui.popoverMenu.querySelectorAll('.cc-popover-item'));
  let btcItem = items.find(el => el.getAttribute('data-currency-code') === 'BTC');
  assert.equal(btcItem, undefined, 'BTC must NOT be present when showCrypto is false');

  // 2. Dynamic update to showCrypto = true
  ui.update({ showCrypto: true });
  items = Array.from(ui.popoverMenu.querySelectorAll('.cc-popover-item'));
  btcItem = items.find(el => el.getAttribute('data-currency-code') === 'BTC');
  assert.ok(btcItem, 'BTC must be present after updating showCrypto to true');

  const ethItem = items.find(el => el.getAttribute('data-currency-code') === 'ETH');
  assert.ok(ethItem, 'ETH must be present after updating showCrypto to true');

  // 3. Dynamic update back to showCrypto = false
  ui.update({ showCrypto: false });
  items = Array.from(ui.popoverMenu.querySelectorAll('.cc-popover-item'));
  btcItem = items.find(el => el.getAttribute('data-currency-code') === 'BTC');
  assert.equal(btcItem, undefined, 'BTC must be removed after updating showCrypto to false');

  ui.unmount();
});


test('ui: Dynamic Island stays expanded (.cc-expanded) while popover menu is open, supports ArrowDown/ArrowUp navigation, suppresses click after dragging collapsed pill, and formats sub-cent tooltip rates cleanly', async () => {
  const { INLINE_UI_CSS, InPageUI } = await import('../src/content/ui.js');
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  const doc = dom.window.document;

  const ui = new InPageUI({
    doc,
    targetCurrency: 'USD',
    isConverted: true,
    convertedCount: 3
  });
  ui.mount();

  const selectBtn = ui.barElement.querySelector('.cc-select');
  selectBtn.click();
  assert.ok(ui.barElement.classList.contains('cc-expanded'), 'Opening popover must add .cc-expanded to .cc-dynamic-island');

  const items = Array.from(ui.popoverMenu.querySelectorAll('.cc-popover-item'));
  assert.ok(items.length >= 2);
  items[0].focus();
  assert.equal(ui.shadowRoot.activeElement, items[0]);

  items[0].dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
  assert.equal(ui.shadowRoot.activeElement, items[1], 'ArrowDown on item[0] must focus item[1]');

  items[1].dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
  assert.equal(ui.shadowRoot.activeElement, items[0], 'ArrowUp on item[1] must focus item[0]');

  items[0].dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
  assert.equal(ui.shadowRoot.activeElement, ui.popoverSearch, 'ArrowUp on item[0] must return focus to search input');

  ui._closePopover();
  assert.ok(!ui.barElement.classList.contains('cc-expanded'), 'Closing popover must remove .cc-expanded from .cc-dynamic-island');

  // Collapse pill and simulate a drag followed by click
  ui.toggleCollapse(true);
  assert.equal(ui.isCollapsed, true);
  ui.hasMovedDrag = true;
  ui.collapsedElement.click();
  assert.equal(ui.isCollapsed, true, 'Click immediately after dragging collapsed pill must NOT expand it');

  // Subsequent normal click expands it
  ui.collapsedElement.click();
  assert.equal(ui.isCollapsed, false, 'Normal click on collapsed pill expands it');

  // Sub-cent tooltip rate formatting & flipped caret CSS
  ui.showTooltip({
    originalAmount: 15000,
    originalCurrency: 'NGN',
    convertedAmount: 9.09,
    rate: 0.00060606,
    date: '2026-10-30',
    x: 100,
    y: 100
  });
  const subText = ui.tooltipElement.querySelector('.cc-tooltip-sub').textContent;
  assert.ok(subText.includes('0.0006061'), `Expected significant precision for sub-cent rate, got: ${subText}`);
  assert.match(INLINE_UI_CSS, /\.cc-tooltip\.flipped\s+\.cc-tooltip-caret/, 'INLINE_UI_CSS must style .cc-tooltip.flipped .cc-tooltip-caret');

  ui.unmount();
});

test('ui: Dynamic Island renders Ask Mode offer prompt with interactive actions', () => {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  const doc = dom.window.document;

  let acceptedCur = null;
  let alwaysCur = null;
  let offerDismissed = false;

  const ui = new InPageUI({
    doc,
    mode: 'offer',
    targetCurrency: 'USD',
    sourceCurrency: 'EUR',
    convertedCount: 6,
    onAcceptOffer: (cur) => { acceptedCur = cur; },
    onAlwaysOnSite: (cur) => { alwaysCur = cur; },
    onDismissOffer: () => { offerDismissed = true; }
  });
  ui.mount();

  const island = ui.barElement;
  assert.ok(island.classList.contains('cc-mode-offer'), 'Must carry cc-mode-offer class');

  const offerText = island.querySelector('.cc-offer-text');
  assert.ok(offerText, 'Must render .cc-offer-text');
  assert.equal(offerText.textContent, 'Found 6 EUR prices. Convert to USD?');

  const convertBtn = island.querySelector('.cc-offer-btn-primary');
  assert.ok(convertBtn, 'Must render Convert button');
  assert.equal(convertBtn.textContent, 'Convert');

  const alwaysBtn = island.querySelector('.cc-offer-btn-secondary');
  assert.ok(alwaysBtn, 'Must render Always on this site button');
  assert.equal(alwaysBtn.textContent, 'Always on this site');

  const dismissBtn = island.querySelector('.cc-offer-dismiss');
  assert.ok(dismissBtn, 'Must render Dismiss button');

  // Test action callbacks
  convertBtn.click();
  assert.equal(acceptedCur, 'USD', 'Convert button triggers onAcceptOffer');

  alwaysBtn.click();
  assert.equal(alwaysCur, 'USD', 'Always button triggers onAlwaysOnSite');

  dismissBtn.click();
  assert.equal(offerDismissed, true, 'Dismiss button triggers onDismissOffer');
  assert.equal(island.style.display, 'none', 'Dismissing offer hides island');

  ui.unmount();
});
