import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { launchExtensionBrowser } from '../../scripts/launch-browser.js';

test('T3 Regression: Context menu installation, listener lifecycle, and action dispatch', async () => {
  const browser = await launchExtensionBrowser({ build: 'fresh' });
  try {
    const context = browser.context;
    const fixtureHtml = fs.readFileSync(path.resolve('tests/fixtures/european.html'), 'utf8');

    await context.route(/^http:\/\//, (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'text/html; charset=utf-8',
        body: fixtureHtml
      });
    });

    // 1. Verify Service Worker has listeners registered for onInstalled, onStartup, and contextMenus.onClicked
    const swListeners = await browser.sw.evaluate(() => {
      return {
        hasInstalledListener: chrome.runtime.onInstalled.hasListeners(),
        hasStartupListener: chrome.runtime.onStartup.hasListeners(),
        hasContextMenuClickListener: chrome.contextMenus.onClicked.hasListeners()
      };
    });

    assert.equal(swListeners.hasInstalledListener, true, 'runtime.onInstalled must have listener');
    assert.equal(swListeners.hasStartupListener, true, 'runtime.onStartup must have listener');
    assert.equal(swListeners.hasContextMenuClickListener, true, 'contextMenus.onClicked must have listener');

    // 2. Open a test tab with prices
    const page = await context.newPage();
    await page.goto('http://shop.test/product');
    await page.waitForLoadState('domcontentloaded');

    // Pre-check: Not converted yet (may have Ask offer pill mounted, but not converted)
    const preCheck = await page.evaluate(() => {
      const host = document.getElementById('cc-dynamic-island-host');
      const dot = host?.shadowRoot?.querySelector('.cc-status-dot');
      return {
        isConverted: Boolean(dot && !dot.classList.contains('cc-status-inactive'))
      };
    });
    assert.equal(preCheck.isConverted, false, 'Pre-check: page must not be converted yet');

    // 3. Drive the "convert this page" context menu action via Service Worker
    const dispatchResult = await browser.sw.evaluate(async () => {
      const tabs = await chrome.tabs.query({ url: '*://shop.test/*' });
      if (!tabs[0]) return { success: false, error: 'Tab not found' };

      // Dispatch onClicked event for menuItemId 'cc-page-convert'
      try {
        chrome.contextMenus.onClicked.dispatch(
          { menuItemId: 'cc-page-convert' },
          tabs[0]
        );
        return { success: true, tabId: tabs[0].id };
      } catch (err) {
        return { success: false, error: err.message };
      }
    });

    assert.equal(dispatchResult.success, true, `Context menu click event must dispatch successfully, got error: ${dispatchResult.error}`);
    console.log('[T3] dispatchResult:', dispatchResult);

    // 4. Verify in the tab that the handler ran and converted the page
    const hostEl = await page.waitForSelector('#cc-dynamic-island-host', { state: 'attached', timeout: 10000 });
    assert.ok(hostEl, 'Dynamic island host must be mounted after context menu click');

    await page.waitForFunction(() => {
      const host = document.getElementById('cc-dynamic-island-host');
      const dot = host?.shadowRoot?.querySelector('.cc-status-dot');
      return Boolean(dot && !dot.classList.contains('cc-status-inactive'));
    }, { timeout: 10000 });

    const postCheck = await page.evaluate(() => {
      const host = document.getElementById('cc-dynamic-island-host');
      const shadow = host?.shadowRoot;
      const dot = shadow?.querySelector('.cc-status-dot');
      const count = shadow?.querySelector('.cc-count-badge')?.textContent;
      const text = document.body.textContent;
      return {
        hasHost: Boolean(host),
        dotActive: dot && !dot.classList.contains('cc-status-inactive'),
        count,
        hasConvertedPrice: text.includes('EUR') || text.includes('€') || text.includes('USD') || text.includes('153.33')
      };
    });

    assert.equal(postCheck.hasHost, true, 'Dynamic island host must be mounted after context menu click');
    assert.equal(postCheck.dotActive, true, 'Status dot must be active green');
    assert.ok(parseInt(postCheck.count, 10) > 0, 'Pill count must be greater than 0');

  } finally {
    await browser.close();
  }
});
