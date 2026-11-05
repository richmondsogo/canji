import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { performance } from 'node:perf_hooks';
import { PageScanner } from '../src/content/scanner.js';
import {
  mightContainPrice,
  EXPLICIT_SYMBOL_MAP,
  AMBIGUOUS_SYMBOL_KEYS,
  ISO_CODES
} from '../src/shared/parser.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, 'fixtures');

function loadFixture(name) {
  return fs.readFileSync(path.join(fixturesDir, name), 'utf8');
}

// Fixed mock rates table with EUR base
const mockRates = {
  EUR: 1.0,
  USD: 1.10,     // 1 EUR = 1.10 USD
  NGN: 1650.0,   // 1 EUR = 1650 NGN -> 1 USD = 1500 NGN
  GBP: 0.85,
  CAD: 1.50
};

test('scanner: simple text prices and byte-for-byte revert fidelity', () => {
  const html = loadFixture('simple.html');
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const originalHtml = doc.body.innerHTML;

  const scanner = new PageScanner({
    doc,
    targetCurrency: 'NGN',
    ratesTable: mockRates,
    displayMode: 'replace'
  });

  const convertedCount = scanner.convert();
  assert.equal(convertedCount, 2); // $199.99 and $9.95

  // Confirm prices were converted
  assert.ok(doc.body.innerHTML.includes('₦') || doc.body.innerHTML.includes('NGN'));
  assert.ok(!doc.body.innerHTML.includes('$199.99'));

  // Revert
  scanner.revert();
  assert.equal(doc.body.innerHTML, originalHtml, 'Revert must restore byte-for-byte identical DOM');
});

test('scanner: European comma-decimal numbers (149,50 € and 1.299,99 €)', () => {
  const html = loadFixture('european.html');
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const originalHtml = doc.body.innerHTML;

  const scanner = new PageScanner({
    doc,
    targetCurrency: 'USD',
    ratesTable: mockRates,
    displayMode: 'replace'
  });

  const count = scanner.convert();
  assert.equal(count, 2);
  assert.ok(doc.body.innerHTML.includes('$') || doc.body.innerHTML.includes('USD'));
  assert.ok(!doc.body.innerHTML.includes('149,50 €'));

  scanner.revert();
  assert.equal(doc.body.innerHTML, originalHtml);
});

test('scanner: Amazon split-price structure and revert fidelity', () => {
  const html = loadFixture('amazon_split.html');
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const originalHtml = doc.body.innerHTML;

  const scanner = new PageScanner({
    doc,
    targetCurrency: 'NGN',
    ratesTable: mockRates,
    displayMode: 'replace'
  });

  const count = scanner.convert();
  assert.ok(count >= 1);
  assert.ok(doc.body.innerHTML.includes('₦') || doc.body.innerHTML.includes('NGN'));

  scanner.revert();
  assert.equal(doc.body.innerHTML, originalHtml, 'Amazon split price must revert cleanly');
});

test('scanner: sup cents structure and revert fidelity', () => {
  const html = loadFixture('sup_cents.html');
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const originalHtml = doc.body.innerHTML;

  const scanner = new PageScanner({
    doc,
    targetCurrency: 'EUR',
    ratesTable: mockRates,
    displayMode: 'replace'
  });

  const count = scanner.convert();
  assert.ok(count >= 1);
  assert.ok(doc.body.innerHTML.includes('€') || doc.body.innerHTML.includes('EUR'));

  scanner.revert();
  assert.equal(doc.body.innerHTML, originalHtml);
});

test('scanner: ranges and was/now pairs', () => {
  const htmlRanges = loadFixture('ranges.html');
  const domRanges = new JSDOM(htmlRanges);
  const scannerRanges = new PageScanner({
    doc: domRanges.window.document,
    targetCurrency: 'CAD',
    ratesTable: mockRates
  });
  const countRanges = scannerRanges.convert();
  assert.ok(countRanges >= 2);

  const htmlWasNow = loadFixture('was_now.html');
  const domWasNow = new JSDOM(htmlWasNow);
  const scannerWasNow = new PageScanner({
    doc: domWasNow.window.document,
    targetCurrency: 'GBP',
    ratesTable: mockRates
  });
  const countWasNow = scannerWasNow.convert();
  assert.equal(countWasNow, 3); // $120.00, $79.99, $40.01
});

test('scanner: skip lists (input, textarea, code, pre, contenteditable, data-cc-ignore)', () => {
  const html = loadFixture('skip_lists.html');
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  const scanner = new PageScanner({
    doc,
    targetCurrency: 'NGN',
    ratesTable: mockRates
  });

  const count = scanner.convert();
  // Only the .valid-price should be converted!
  assert.equal(count, 1);
  assert.equal(doc.querySelector('input').value, '$50.00');
  assert.equal(doc.querySelector('textarea').textContent, '$100.00');
  assert.equal(doc.querySelector('code').textContent, "const price = '$15.00';");
  assert.equal(doc.querySelector('[contenteditable="true"]').textContent, '$300.00');
  assert.equal(doc.querySelector('[data-cc-ignore]').textContent, '$400.00');
  assert.ok(doc.querySelector('.valid-price').textContent.includes('₦') || doc.querySelector('.valid-price').textContent.includes('NGN'));
});

test('scanner: idempotency (running convert twice changes nothing the second time)', () => {
  const html = loadFixture('simple.html');
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  const scanner = new PageScanner({
    doc,
    targetCurrency: 'NGN',
    ratesTable: mockRates
  });

  const count1 = scanner.convert();
  const htmlAfterFirst = doc.body.innerHTML;

  const count2 = scanner.convert();
  const htmlAfterSecond = doc.body.innerHTML;

  assert.equal(count1, 2);
  assert.equal(count2, 0); // No new conversions
  assert.equal(htmlAfterFirst, htmlAfterSecond);
});

test('scanner: target currency equals source currency skip', () => {
  const html = loadFixture('simple.html');
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const originalHtml = doc.body.innerHTML;

  // Source is USD and target is USD -> should not convert
  const scanner = new PageScanner({
    doc,
    targetCurrency: 'USD',
    ratesTable: mockRates
  });

  const count = scanner.convert();
  assert.equal(count, 0);
  assert.equal(doc.body.innerHTML, originalHtml);
});

test('scanner: dynamic mutations via MutationObserver', async () => {
  const dom = new JSDOM('<div id="container"><div class="item">$10.00</div></div>');
  const doc = dom.window.document;

  const scanner = new PageScanner({
    doc,
    targetCurrency: 'NGN',
    ratesTable: mockRates
  });

  scanner.convert();
  scanner.startObserving();

  // Dynamically insert a new item
  const newItem = doc.createElement('div');
  newItem.className = 'new-item';
  newItem.textContent = 'Special Deal: $25.00';
  doc.getElementById('container').appendChild(newItem);

  // Wait for debounced mutation handler
  await new Promise(r => setTimeout(r, 200));

  assert.ok(newItem.textContent.includes('₦') || newItem.textContent.includes('NGN'));
  scanner.stopObserving();
});

test('scanner: nested inline elements (e.g. nested spans for symbol, whole, cents)', () => {
  const dom = new JSDOM('<div class="price-container"><span><span class="curr">$</span><span class="val">49</span>.<span class="dec">99</span></span></div>');
  const doc = dom.window.document;
  const originalHtml = doc.body.innerHTML;

  const scanner = new PageScanner({
    doc,
    targetCurrency: 'CAD',
    ratesTable: mockRates,
    displayMode: 'replace'
  });

  const count = scanner.convert();
  assert.equal(count, 1);
  assert.ok(doc.body.innerHTML.includes('CA$') || doc.body.innerHTML.includes('CAD'));

  scanner.revert();
  assert.equal(doc.body.innerHTML, originalHtml, 'Nested inline elements must revert byte-for-byte');
});

test('scanner: open shadow DOM scanning and conversion', () => {
  const dom = new JSDOM('<div id="host"></div>');
  const doc = dom.window.document;
  const host = doc.getElementById('host');
  const shadow = host.attachShadow({ mode: 'open' });
  const shadowChild = doc.createElement('div');
  shadowChild.className = 'shadow-price';
  shadowChild.textContent = 'Member price: $35.00';
  shadow.appendChild(shadowChild);

  const scanner = new PageScanner({
    doc,
    targetCurrency: 'NGN',
    ratesTable: mockRates,
    displayMode: 'replace'
  });

  const count = scanner.convert();
  assert.equal(count, 1);
  assert.ok(shadow.innerHTML.includes('₦') || shadow.innerHTML.includes('NGN'));

  scanner.revert();
  assert.equal(shadowChild.textContent, 'Member price: $35.00');
});

test('scanner: no infinite observer loop when scanner mutates DOM', async () => {
  const dom = new JSDOM('<div id="box"><span class="price">$12.50</span></div>');
  const doc = dom.window.document;

  let extraConvertCalls = 0;
  const scanner = new PageScanner({
    doc,
    targetCurrency: 'NGN',
    ratesTable: mockRates
  });

  scanner.convert();
  scanner.startObserving();

  const originalConvert = scanner.convert.bind(scanner);
  scanner.convert = (...args) => {
    extraConvertCalls++;
    return originalConvert(...args);
  };

  // Trigger internal revert & convert
  scanner.revert();
  scanner.convert();

  // Wait a debounce cycle
  await new Promise(r => setTimeout(r, 250));

  // The scanner should not trigger endless conversions from its own changes
  assert.equal(extraConvertCalls, 1, 'Only the manual convert() call should run, not an infinite observer loop');
  scanner.stopObserving();
});

test('scanner: Hard Bailout Gate — USD to USD leaves DOM 100% untouched and counts 0 conversions', () => {
  const dom = new JSDOM('<!DOCTYPE html><html><head><meta property="og:price:currency" content="USD"></head><body><div id="shop"><p class="price">$100.00</p><p class="price">$250.00</p></div></body></html>');
  const doc = dom.window.document;
  const originalHtml = doc.body.innerHTML;

  const scanner = new PageScanner({
    doc,
    targetCurrency: 'USD',
    ratesTable: mockRates,
    displayMode: 'replace'
  });

  const convertedCount = scanner.convert();

  assert.equal(convertedCount, 0, 'USD -> USD must report 0 conversions');
  assert.equal(scanner.isConverted, false, 'isConverted must be false on bailout');
  assert.equal(doc.body.innerHTML, originalHtml, 'DOM must be 100% untouched when source === target');
  assert.equal(doc.querySelectorAll('[data-cc-converted]').length, 0, 'No data-cc-converted elements should exist');
});

test('scanner: Canadian Dollar page context disambiguation converts bare $50.00 to USD', () => {
  const dom = new JSDOM('<!DOCTYPE html><html><head><meta property="og:price:currency" content="CAD"></head><body><div id="shop"><p class="price">$50.00</p></div></body></html>');
  const doc = dom.window.document;
  const originalHtml = doc.body.innerHTML;

  const scanner = new PageScanner({
    doc,
    targetCurrency: 'USD',
    ratesTable: mockRates, // CAD: 1.50, USD: 1.10 -> 50 / 1.5 * 1.1 = 36.67 USD
    displayMode: 'replace'
  });

  const convertedCount = scanner.convert();

  assert.equal(convertedCount, 1, 'Must convert the bare $ price disambiguated as CAD');
  assert.ok(scanner.isConverted, 'Scanner state is converted');
  assert.ok(!doc.body.innerHTML.includes('$50.00'), 'Original $50.00 is replaced');
  assert.ok(doc.body.innerHTML.includes('36.67'), 'Calculated CAD -> USD price is present');

  // Revert restores original HTML
  scanner.revert();
  assert.equal(doc.body.innerHTML, originalHtml, 'Revert restores exact original HTML');
});

test('scanner: consecutive convert calls are strictly idempotent and do not duplicate spans', () => {
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="shop"><p class="price">$50.00</p></div></body></html>');
  const doc = dom.window.document;
  const originalHtml = doc.body.innerHTML;

  const scanner = new PageScanner({
    doc,
    targetCurrency: 'EUR',
    ratesTable: mockRates,
    displayMode: 'replace_highlight'
  });

  const count1 = scanner.convert();
  assert.equal(count1, 1);
  const convertedHtml1 = doc.body.innerHTML;

  // Running convert a second time without reverting should not re-wrap or alter anything
  const count2 = scanner.convert();
  assert.equal(count2, 0, 'Subsequent convert on already converted nodes must convert 0 additional nodes');
  assert.equal(doc.body.innerHTML, convertedHtml1, 'HTML must be identical on redundant convert');
  assert.equal(doc.querySelectorAll('[data-cc-converted]').length, 1, 'Only one wrapper span exists');

  // Revert still works cleanly
  scanner.revert();
  assert.equal(doc.body.innerHTML, originalHtml, 'Revert succeeds even after multiple convert passes');
});

test('scanner: Jumia Nigeria e-commerce price conversion and revert', () => {
  const html = `
    <!DOCTYPE html>
    <html lang="en-NG">
    <head><title>Jumia Nigeria</title></head>
    <body>
      <div class="info">
        <h3 class="name">Oraimo FreePods 4</h3>
        <div class="prc">₦ 14,500</div>
      </div>
      <div class="info">
        <h3 class="name">Samsung Galaxy A15</h3>
        <div class="prc">₦ 120,000</div>
      </div>
      <div class="info">
        <h3 class="name">Apple iPhone 15 Pro Max</h3>
        <div class="prc">₦ 1,250,000</div>
      </div>
      <div class="info">
        <h3 class="name">Smart Watch Series 9</h3>
        <div class="prc">₦ 5,000 - ₦ 8,000</div>
      </div>
    </body>
    </html>
  `;
  const dom = new JSDOM(html, { url: 'https://www.jumia.com.ng/phones-tablets/' });
  const doc = dom.window.document;
  const originalHtml = doc.body.innerHTML;

  const scanner = new PageScanner({
    doc,
    targetCurrency: 'USD',
    ratesTable: mockRates,
    displayMode: 'replace'
  });

  const convertedCount = scanner.convert();
  assert.ok(convertedCount > 0, 'convertedCount must be greater than 0');
  assert.ok(scanner.isConverted, 'Scanner isConverted must be true');
  assert.equal(scanner.primarySourceCurrency, 'NGN');
  assert.ok(scanner.detectedCurrencies.has('NGN'));

  // Confirm original ₦ prices were replaced with $
  assert.ok(!doc.body.innerHTML.includes('₦ 14,500'));
  assert.ok(!doc.body.innerHTML.includes('₦ 120,000'));
  assert.ok(doc.body.innerHTML.includes('$'));

  // Confirm byte-for-byte revert
  scanner.revert();
  assert.equal(doc.body.innerHTML, originalHtml, 'Revert must restore exact original Jumia HTML');
});


test('scanner: getHoverMetadata resolves metadata for standard text-node prices in replace & append modes as well as split prices', () => {
  const dom = new JSDOM(`
    <!DOCTYPE html>
    <html>
      <body>
        <div class="price-single">€249.00</div>
        <div class="price-split"><span class="cur">€</span><span class="amt">680</span><span class="dec">.00</span></div>
      </body>
    </html>
  `);
  const doc = dom.window.document;

  const scanner = new PageScanner({
    doc,
    targetCurrency: 'USD',
    ratesTable: mockRates,
    displayMode: 'replace',
    rateDate: '2026-10-30'
  });

  const count = scanner.convert();
  assert.equal(count, 2);

  const singleEl = doc.querySelector('.price-single');
  const splitEl = doc.querySelector('.price-split');

  const singleHover = scanner.getHoverMetadata(singleEl);
  assert.ok(singleHover, 'Standard text-node price in replace mode must return hover metadata');
  assert.equal(singleHover.element, singleEl);
  assert.equal(singleHover.meta.originalAmount, 249);
  assert.equal(singleHover.meta.originalCurrency, 'EUR');
  assert.equal(singleHover.meta.date, '2026-10-30');

  const splitHover = scanner.getHoverMetadata(splitEl);
  assert.ok(splitHover, 'Split-element price must return hover metadata');
  assert.equal(splitHover.element, splitEl);
  assert.equal(splitHover.meta.originalAmount, 680);
  assert.equal(splitHover.meta.originalCurrency, 'EUR');
});

test('scanner: context.siteOverride and context.ambiguousDollarSetting disambiguate bare $ prices when converting to USD', () => {
  const dom1 = new JSDOM('<!DOCTYPE html><html><head><meta property="og:price:currency" content="USD"></head><body><div id="p1">$150.00</div></body></html>');
  const scannerSiteOverride = new PageScanner({
    doc: dom1.window.document,
    targetCurrency: 'USD',
    ratesTable: mockRates, // CAD: 1.50, USD: 1.10 -> 150 / 1.5 * 1.1 = 110.00 USD
    displayMode: 'replace',
    context: { siteOverride: 'CAD' }
  });
  assert.equal(scannerSiteOverride.convert(), 1);
  assert.ok(dom1.window.document.getElementById('p1').textContent.includes('110.00'));
  assert.equal(scannerSiteOverride.primarySourceCurrency, 'CAD');

  const dom2 = new JSDOM('<!DOCTYPE html><html><body><div id="p2">$150.00</div></body></html>');
  const scannerAmbiguous = new PageScanner({
    doc: dom2.window.document,
    targetCurrency: 'USD',
    ratesTable: mockRates,
    displayMode: 'replace',
    context: { ambiguousDollarSetting: 'CAD' }
  });
  assert.equal(scannerAmbiguous.convert(), 1);
  assert.ok(dom2.window.document.getElementById('p2').textContent.includes('110.00'));
  assert.equal(scannerAmbiguous.primarySourceCurrency, 'CAD');
});

test('scanner: scanCandidates performs read-only candidate counting without mutating DOM', () => {
  const html = `<!DOCTYPE html><html><body>
    <div class="product-1">€49.00</div>
    <div class="product-2">€89.50</div>
    <div class="product-3">€120.00</div>
    <div class="domestic">$15.00 USD</div>
  </body></html>`;
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const originalHtml = doc.body.innerHTML;

  const scanner = new PageScanner({
    doc,
    targetCurrency: 'USD'
  });

  const candidates = scanner.scanCandidates(doc.body);
  assert.equal(candidates.count, 3, 'Must detect 3 foreign EUR prices and ignore domestic USD');
  assert.equal(candidates.primaryCurrency, 'EUR', 'Primary detected foreign currency should be EUR');
  assert.equal(candidates.targetCurrency, 'USD');

  // Verify ZERO DOM mutation
  assert.equal(doc.body.innerHTML, originalHtml, 'scanCandidates must NOT mutate any DOM nodes or attributes');
  assert.equal(scanner.convertedCount, 0, 'scanner.convertedCount must remain 0');
  assert.equal(scanner.isConverted, false, 'scanner.isConverted must remain false');
});

test('scanner & parser: mightContainPrice covers 100% of ISO codes and currency symbols while rejecting plain numeric text', () => {
  for (const sym of Object.keys(EXPLICIT_SYMBOL_MAP)) {
    assert.equal(mightContainPrice(`${sym} 99.50`), true, `Explicit symbol ${sym} must pass mightContainPrice`);
  }
  for (const sym of AMBIGUOUS_SYMBOL_KEYS) {
    if (sym === 'R') continue; // Bare 'R' is not a standalone price token in extractPrices
    assert.equal(mightContainPrice(`${sym} 99.50`), true, `Ambiguous symbol ${sym} must pass mightContainPrice`);
  }
  for (const code of ISO_CODES) {
    assert.equal(mightContainPrice(`99.50 ${code}`), true, `ISO code ${code} must pass mightContainPrice`);
  }

  // Plain numeric strings without currency markers must return false
  assert.equal(mightContainPrice('Post #12'), false);
  assert.equal(mightContainPrice('15 mins ago'), false);
  assert.equal(mightContainPrice('2026-11-05'), false);
  assert.equal(mightContainPrice('100%'), false);
  assert.equal(mightContainPrice('version 2.4.1 in section 8'), false);
});

test('scanner: all 13 HTML fixtures convert and revert byte-for-byte cleanly', () => {
  const fixtureFiles = fs.readdirSync(fixturesDir).filter(f => f.endsWith('.html'));
  assert.ok(fixtureFiles.length >= 13, 'Must test all HTML fixtures');

  for (const file of fixtureFiles) {
    const html = loadFixture(file);
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    const originalHtml = doc.body.innerHTML;

    const scanner = new PageScanner({
      doc,
      targetCurrency: 'NGN',
      ratesTable: mockRates,
      displayMode: 'replace'
    });

    const candidates = scanner.scanCandidates(doc.body);
    assert.equal(doc.body.innerHTML, originalHtml, `scanCandidates must not mutate ${file}`);

    const convertedCount = scanner.convert();
    assert.equal(convertedCount > 0, candidates.count > 0, `scanCandidates presence must match convert() on ${file}`);
    assert.ok(candidates.count >= convertedCount, `scanCandidates price count (${candidates.count}) must be >= converted node count (${convertedCount}) on ${file}`);

    scanner.revert();
    assert.equal(doc.body.innerHTML, originalHtml, `revert() must restore byte-for-byte HTML on ${file}`);
  }
});

test('scanner: large 3,200-element non-shopping DOM scans quickly without layout/selector thrashing', () => {
  let html = '<!DOCTYPE html><html><body><div id="app">';
  for (let i = 0; i < 400; i++) {
    html += `<div class="card"><div class="header"><span>Post #${i}</span><span>${i * 3} mins ago</span></div><p>Some discussion text with numbers like 2026 and 100% and version 2.4.1 in section ${i}.</p><div class="footer"><span>${i * 12} comments</span><span>Share</span></div></div>`;
  }
  html += '</div></body></html>';

  const dom = new JSDOM(html, { url: 'https://example.com/' });
  const doc = dom.window.document;
  const scanner = new PageScanner({ doc, targetCurrency: 'USD', ratesTable: mockRates });

  const t0 = performance.now();
  const res = scanner.scanCandidates(doc.body);
  const elapsedMs = performance.now() - t0;

  assert.equal(res.count, 0);
  assert.ok(elapsedMs < 220, `Expected 3,204-element scanCandidates to complete under 220ms in JSDOM, took ${elapsedMs.toFixed(2)}ms`);
});


