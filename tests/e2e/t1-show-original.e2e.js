import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { launchExtensionBrowser } from '../../scripts/launch-browser.js';

test('T1 Regression: Show original stays original on late mutations, re-converts cleanly', async () => {
  const browser = await launchExtensionBrowser({ build: 'fresh' });
  try {
    const context = browser.context;
    const fixtureHtml = fs.readFileSync(path.resolve('tests/fixtures/t1_late_prices.html'), 'utf8');

    await context.route(/^http:\/\//, (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: fixtureHtml
      });
    });

    const page = await context.newPage();

    // Configure options: shop.test -> always autoConvert, targetCurrency -> NGN
    await page.goto(`chrome-extension://${browser.extensionId}/options/options.html#general`);
    await page.waitForLoadState('domcontentloaded');

    await page.locator('#select-target-currency').click();
    await page.locator('[cmdk-input]').fill('NGN');
    await page.locator('[cmdk-item]:has-text("NGN")').first().click();
    await page.waitForTimeout(400);

    await page.goto(`chrome-extension://${browser.extensionId}/options/options.html#sites`);
    await page.locator('#input-new-site').fill('shop.test');
    await page.locator('button[aria-label="Always convert"]').click();
    await page.locator('button[aria-label="Add site"]').click();
    await page.waitForTimeout(1000);

    // ==========================================
    // Part A: Auto-Convert Scenario
    // ==========================================
    await page.goto('http://shop.test/catalog');
    await page.waitForTimeout(1000);

    // Verify auto-convert converted initial price
    const initialAutoCheck = await page.evaluate(() => {
      const initPrice = document.getElementById('initial-price')?.textContent;
      const host = document.getElementById('cc-dynamic-island-host');
      const shadow = host?.shadowRoot;
      const dot = shadow?.querySelector('.cc-status-dot');
      const count = shadow?.querySelector('.cc-count-badge')?.textContent;
      const originalBtnActive = shadow?.querySelector('.cc-segment-original')?.classList.contains('active');
      const convertedBtnActive = shadow?.querySelector('.cc-segment-converted')?.classList.contains('active');
      return {
        initPrice,
        hasNgn: initPrice?.includes('NGN'),
        hasHost: Boolean(host),
        dotActive: dot && !dot.classList.contains('cc-status-inactive'),
        count,
        originalBtnActive,
        convertedBtnActive
      };
    });

    assert.equal(initialAutoCheck.hasNgn, true, 'Initial price must auto-convert to NGN');
    assert.equal(initialAutoCheck.dotActive, true, 'Dot must be active (green)');
    assert.equal(initialAutoCheck.count, '1', 'Initial converted count must be 1');

    // Click "Original" on the pill
    await page.evaluate(() => {
      const host = document.getElementById('cc-dynamic-island-host');
      const shadow = host?.shadowRoot;
      const btnOriginal = shadow?.querySelector('.cc-segment-original');
      btnOriginal?.click();
    });
    await page.waitForTimeout(300);

    // Verify reverted to original
    const revertedCheck = await page.evaluate(() => {
      const initPrice = document.getElementById('initial-price')?.textContent;
      const host = document.getElementById('cc-dynamic-island-host');
      const shadow = host?.shadowRoot;
      const dot = shadow?.querySelector('.cc-status-dot');
      const count = shadow?.querySelector('.cc-count-badge')?.textContent;
      const originalBtnActive = shadow?.querySelector('.cc-segment-original')?.classList.contains('active');
      return {
        initPrice,
        isOriginalText: initPrice?.includes('$25.00 USD'),
        dotInactive: dot && dot.classList.contains('cc-status-inactive'),
        count,
        originalBtnActive
      };
    });

    assert.equal(revertedCheck.isOriginalText, true, 'Initial price must revert to $25.00 USD');
    assert.equal(revertedCheck.dotInactive, true, 'Status dot must be inactive in Original mode');
    assert.equal(revertedCheck.count, '0', 'Count must show 0 in Original mode');
    assert.equal(revertedCheck.originalBtnActive, true, 'Original button must be active');

    // Wait 2500ms so the 1500ms setTimeout inserts the late price
    await page.waitForTimeout(2500);

    // CRITICAL CHECK: Late price must NOT convert; page must remain in original state
    const lateWhileOriginalCheck = await page.evaluate(() => {
      const lateEl = document.getElementById('late-price');
      const lateText = lateEl?.textContent;
      const host = document.getElementById('cc-dynamic-island-host');
      const shadow = host?.shadowRoot;
      const dot = shadow?.querySelector('.cc-status-dot');
      const count = shadow?.querySelector('.cc-count-badge')?.textContent;
      const originalBtnActive = shadow?.querySelector('.cc-segment-original')?.classList.contains('active');
      return {
        lateText,
        hasLate: Boolean(lateEl),
        isLateOriginal: lateText === '$120.00 USD',
        dotInactive: dot && dot.classList.contains('cc-status-inactive'),
        count,
        originalBtnActive
      };
    });

    assert.equal(lateWhileOriginalCheck.hasLate, true, 'Late price element must be inserted');
    assert.equal(lateWhileOriginalCheck.isLateOriginal, true, 'Late price must remain untouched in original currency ($120.00 USD)');
    assert.equal(lateWhileOriginalCheck.dotInactive, true, 'Pill dot must remain inactive');
    assert.equal(lateWhileOriginalCheck.count, '0', 'Pill count must remain 0');

    // Click "Converted" on the pill
    await page.evaluate(() => {
      const host = document.getElementById('cc-dynamic-island-host');
      const shadow = host?.shadowRoot;
      const btnConverted = shadow?.querySelector('.cc-segment-converted');
      btnConverted?.click();
    });
    await page.waitForTimeout(1000);

    // Verify all prices (initial + late) convert cleanly
    const reConvertedCheck = await page.evaluate(() => {
      const initPrice = document.getElementById('initial-price')?.textContent;
      const latePrice = document.getElementById('late-price')?.textContent;
      const host = document.getElementById('cc-dynamic-island-host');
      const shadow = host?.shadowRoot;
      const dot = shadow?.querySelector('.cc-status-dot');
      const count = shadow?.querySelector('.cc-count-badge')?.textContent;
      const convertedBtnActive = shadow?.querySelector('.cc-segment-converted')?.classList.contains('active');
      return {
        initPrice,
        latePrice,
        initHasNgn: initPrice?.includes('NGN'),
        lateHasNgn: latePrice?.includes('NGN'),
        dotActive: dot && !dot.classList.contains('cc-status-inactive'),
        count,
        convertedBtnActive
      };
    });

    assert.equal(reConvertedCheck.initHasNgn, true, 'Initial price must re-convert to NGN');
    assert.equal(reConvertedCheck.lateHasNgn, true, 'Late price must convert to NGN');
    assert.equal(reConvertedCheck.dotActive, true, 'Dot must be active (green)');
    assert.equal(reConvertedCheck.count, '2', 'Pill count must equal total converted nodes (2)');
    assert.equal(reConvertedCheck.convertedBtnActive, true, 'Converted button must be active');

    // ==========================================
    // Part B: Manual Convert Scenario
    // ==========================================
    // Navigate to a site without auto-convert rule: other.test
    await page.goto('http://other.test/product');
    await page.waitForTimeout(500);

    // Trigger manual convert via message
    await browser.sw.evaluate(async () => {
      const tabs = await chrome.tabs.query({ url: '*://other.test/*' });
      if (tabs[0]) {
        await chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          files: ['content.js']
        });
        await chrome.tabs.sendMessage(tabs[0].id, {
          type: 'CC_CONVERT_PAGE',
          payload: {
            targetCurrency: 'EUR',
            ratesTable: { USD: 1, EUR: 0.92, NGN: 1500 },
            displayMode: 'replace',
            showInPageBar: true,
            manual: true
          }
        });
      }
    });
    await page.waitForTimeout(1000);

    // Initial converted state
    const manualInit = await page.evaluate(() => {
      const initText = document.getElementById('initial-price')?.textContent;
      return {
        hasEur: initText?.includes('€') || initText?.includes('EUR')
      };
    });
    assert.equal(manualInit.hasEur, true, 'Initial price must manually convert to EUR');

    // Click "Original"
    await page.evaluate(() => {
      const host = document.getElementById('cc-dynamic-island-host');
      const shadow = host?.shadowRoot;
      shadow?.querySelector('.cc-segment-original')?.click();
    });
    await page.waitForTimeout(300);

    // Wait 2500ms for late price to appear
    await page.waitForTimeout(2500);

    // Check late price did not convert
    const manualLateWhileOriginal = await page.evaluate(() => {
      const lateText = document.getElementById('late-price')?.textContent;
      return {
        isLateOriginal: lateText === '$120.00 USD'
      };
    });
    assert.equal(manualLateWhileOriginal.isLateOriginal, true, 'Late price in manual flow must remain untouched original');

    // Click "Converted"
    await page.evaluate(() => {
      const host = document.getElementById('cc-dynamic-island-host');
      const shadow = host?.shadowRoot;
      shadow?.querySelector('.cc-segment-converted')?.click();
    });
    await page.waitForTimeout(1000);

    // Verify all converted
    const manualReConverted = await page.evaluate(() => {
      const initPrice = document.getElementById('initial-price')?.textContent;
      const latePrice = document.getElementById('late-price')?.textContent;
      const host = document.getElementById('cc-dynamic-island-host');
      const shadow = host?.shadowRoot;
      const count = shadow?.querySelector('.cc-count-badge')?.textContent;
      return {
        initHasEur: initPrice?.includes('€') || initPrice?.includes('EUR'),
        lateHasEur: latePrice?.includes('€') || latePrice?.includes('EUR'),
        count
      };
    });
    assert.equal(manualReConverted.initHasEur, true, 'Manual initial price must re-convert');
    assert.equal(manualReConverted.lateHasEur, true, 'Manual late price must convert');
    assert.equal(manualReConverted.count, '2', 'Manual count must equal 2');

  } finally {
    await browser.close();
  }
});
