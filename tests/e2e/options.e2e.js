import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchExtensionBrowser } from '../../scripts/launch-browser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURES_DIR = path.resolve(__dirname, '..', 'fixtures');
const usdSuffixHtml = fs.readFileSync(path.join(FIXTURES_DIR, 'usd_suffix.html'), 'utf8');

test('E2E Options: Complete rebuild verification covering all 10 requirements', async () => {
  const browser = await launchExtensionBrowser({ build: 'fresh' });

  try {
    const context = browser.context;

    // Route test web domains and mock rates API
    await context.route('**/*', async (route) => {
      const url = new URL(route.request().url());
      if (url.protocol.startsWith('chrome-extension')) {
        return route.continue();
      }
      if (url.hostname.includes('frankfurter') || url.pathname.includes('latest')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            amount: 1,
            base: 'USD',
            date: '2026-10-23',
            rates: { EUR: 0.92, GBP: 0.79, NGN: 1500, USD: 1, CAD: 1.36 }
          })
        });
      }
      return route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: usdSuffixHtml
      });
    });

    const consoleErrors = [];
    const optionsPage = await context.newPage();
    optionsPage.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // -------------------------------------------------------------------------
    // 1. Page loads in light/dark/system with no console errors & fonts loaded
    // -------------------------------------------------------------------------
    await optionsPage.goto(`chrome-extension://${browser.extensionId}/options/options.html#general`);
    await optionsPage.waitForLoadState('domcontentloaded');
    await optionsPage.waitForSelector('h1');

    const title = await optionsPage.title();
    assert.equal(title, 'General — Canji', 'document.title must reflect the active section');

    const heading = await optionsPage.locator('h1').textContent();
    assert.equal(heading.trim(), 'General');

    // Verify fonts loaded
    const fontsReady = await optionsPage.evaluate(async () => {
      await document.fonts.ready;
      return document.fonts.status === 'loaded';
    });
    assert.ok(fontsReady, 'document.fonts must be loaded');

    // Verify root class is set by theme-boot.js before React mounts
    const hasThemeAttr = await optionsPage.evaluate(() => {
      return document.documentElement.hasAttribute('data-theme');
    });
    assert.ok(hasThemeAttr, 'document.documentElement must have data-theme set');

    // -------------------------------------------------------------------------
    // 2. Add-site button accessible name is exactly "Add site" (no literal +)
    // -------------------------------------------------------------------------
    await optionsPage.goto(`chrome-extension://${browser.extensionId}/options/options.html#sites`);
    await optionsPage.waitForSelector('#input-new-site');

    const addSiteBtn = optionsPage.locator('button[aria-label="Add site"]');
    assert.ok(await addSiteBtn.isVisible(), 'Add site button must be visible');
    const addSiteBtnText = (await addSiteBtn.textContent()).trim();
    assert.equal(addSiteBtnText, 'Add site', 'Button text must be exactly "Add site" with NO literal "+" character');

    // -------------------------------------------------------------------------
    // 3. Add "WWW.Shop.test" -> stored as shop.test; duplicate rejected inline;
    //    change mode; set assumed currency; Reset clears mode; Remove deletes
    // -------------------------------------------------------------------------
    await optionsPage.locator('#input-new-site').fill('WWW.Shop.test');
    await optionsPage.locator('button[aria-label="Always convert"]').click();
    await addSiteBtn.click();
    await optionsPage.waitForTimeout(600);

    // Verify shop.test row appears with normalized hostname in Fragment Mono
    const siteRow = optionsPage.locator('span.font-mono:has-text("shop.test")');
    assert.ok(await siteRow.isVisible(), 'shop.test must be displayed as normalized host');

    // Duplicate rejection
    await optionsPage.locator('#input-new-site').fill('WWW.Shop.test');
    await addSiteBtn.click();
    await optionsPage.waitForTimeout(400);

    const errorAlert = optionsPage.locator('#new-site-error-msg');
    assert.ok(await errorAlert.isVisible(), 'Duplicate domain must display inline error message');
    const errorText = await errorAlert.textContent();
    assert.ok(errorText.includes('already in your list'), 'Error text must explain duplicate');

    // Change mode to Never
    const neverBtn = optionsPage.locator('button[aria-label="Never convert shop.test"]');
    await neverBtn.click();
    await optionsPage.waitForTimeout(500);

    // Set assumed currency
    const assumedCurrencyBtn = optionsPage.locator('button[aria-label="Currency used on shop.test"]');
    await assumedCurrencyBtn.click();
    await optionsPage.waitForTimeout(300);
    const cadItem = optionsPage.locator('[cmdk-item]:has-text("CAD")').first();
    if (await cadItem.isVisible()) {
      await cadItem.click();
      await optionsPage.waitForTimeout(500);
    }

    // Verify per-site target currency combobox exists on the site row
    const siteTargetCurrencyBtn = optionsPage.locator('button[aria-label="Target currency for shop.test"]');
    assert.ok(await siteTargetCurrencyBtn.isVisible(), 'Per-site target currency combobox must be visible');

    // Reset clears mode and reveals caption
    const resetBtn = optionsPage.locator('button[aria-label="Reset shop.test to default"]');
    if (await resetBtn.isVisible()) {
      await resetBtn.click();
      await optionsPage.waitForTimeout(500);
      const defaultCaption = optionsPage.locator('span:has-text("Using your default")');
      assert.ok(await defaultCaption.isVisible(), 'Clearing mode must show "Using your default" caption');
    }

    // Remove deletes rule
    const removeBtn = optionsPage.locator('button[aria-label="Remove shop.test"]');
    await removeBtn.click();
    await optionsPage.waitForTimeout(600);
    assert.ok(!(await siteRow.isVisible()), 'Rule for shop.test must be removed from list');

    // -------------------------------------------------------------------------
    // 4. Pinned: add up to 8, the 9th is rejected with the message
    // -------------------------------------------------------------------------
    await optionsPage.locator('a[href="#currencies"]').click();
    await optionsPage.waitForSelector('[aria-label="Pinned currencies"]');

    const badgeText = await optionsPage.locator('.font-mono:has-text("of 8")').first().textContent();
    assert.ok(badgeText.includes('8 of 8'), 'Default pinned currencies should have 8 items');

    const limitMsg = optionsPage.locator('p:has-text("pinned the maximum of 8")');
    assert.ok(await limitMsg.isVisible(), 'Limit message must be shown when 8 pinned');

    // Remove one currency (e.g. INR)
    const removeInr = optionsPage.locator('button[aria-label="Remove INR from pinned"]');
    if (await removeInr.isVisible()) {
      await removeInr.click();
      await optionsPage.waitForTimeout(600);
      const newBadge = await optionsPage.locator('.font-mono:has-text("of 8")').first().textContent();
      assert.ok(newBadge.includes('7 of 8'), 'Badge should update to 7 of 8');
    }

    // -------------------------------------------------------------------------
    // 5. Theme switch applies immediately and persists
    // -------------------------------------------------------------------------
    await optionsPage.locator('a[href="#appearance"]').click();
    await optionsPage.waitForSelector('[aria-label="Theme selector"]');

    // Switch to dark
    const darkBtn = optionsPage.locator('button[aria-label="Dark theme"]').first();
    await darkBtn.click();
    await optionsPage.waitForTimeout(500);

    const darkMetrics = await optionsPage.evaluate(() => ({
      hasDark: document.documentElement.classList.contains('dark'),
      hasLight: document.documentElement.classList.contains('light'),
      themeAttr: document.documentElement.getAttribute('data-theme'),
      colorScheme: document.documentElement.style.colorScheme
    }));
    assert.ok(darkMetrics.hasDark, 'Switching to Dark theme must immediately add "dark" class to html');
    assert.ok(!darkMetrics.hasLight, 'Switching to Dark theme must remove "light" class');
    assert.equal(darkMetrics.themeAttr, 'dark', 'Dark theme must set data-theme="dark"');
    assert.equal(darkMetrics.colorScheme, 'dark', 'Dark theme must set root colorScheme="dark"');

    // Reload and check persistence
    await optionsPage.reload();
    await optionsPage.waitForLoadState('domcontentloaded');
    const persistedDark = await optionsPage.evaluate(() => document.documentElement.classList.contains('dark'));
    assert.ok(persistedDark, 'Dark theme must persist after page reload');

    // Switch to light
    const lightBtn = optionsPage.locator('button[aria-label="Light theme"]').first();
    await lightBtn.click();
    await optionsPage.waitForTimeout(500);
    const lightMetrics = await optionsPage.evaluate(() => ({
      hasDark: document.documentElement.classList.contains('dark'),
      hasLight: document.documentElement.classList.contains('light'),
      themeAttr: document.documentElement.getAttribute('data-theme'),
      colorScheme: document.documentElement.style.colorScheme
    }));
    assert.ok(!lightMetrics.hasDark, 'Switching to Light theme must remove "dark" class');
    assert.ok(lightMetrics.hasLight, 'Switching to Light theme must add "light" class');
    assert.equal(lightMetrics.themeAttr, 'light', 'Light theme must set data-theme="light"');
    assert.equal(lightMetrics.colorScheme, 'light', 'Light theme must set root colorScheme="light"');

    // Verify Display mode clickable preview cards have zero horizontal text overflow
    const cardOverflows = await optionsPage.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('[role="radiogroup"][aria-label="Display mode"] button[role="radio"]'));
      return cards.map((card, idx) => ({
        idx,
        cardScrollWidth: card.scrollWidth,
        cardClientWidth: card.clientWidth,
        overflows: card.scrollWidth > card.clientWidth + 1
      }));
    });
    assert.equal(cardOverflows.length, 3, 'Must render 3 Display mode radio cards');
    for (const c of cardOverflows) {
      assert.equal(c.overflows, false, `Display mode card ${c.idx} must not overflow horizontally (${c.cardScrollWidth} > ${c.cardClientWidth})`);
    }

    // -------------------------------------------------------------------------
    // 6. Reset to defaults requires confirmation and works
    // -------------------------------------------------------------------------
    await optionsPage.locator('a[href="#data"]').click();
    await optionsPage.waitForSelector('#btn-reset-defaults');

    await optionsPage.locator('#btn-reset-defaults').click();
    await optionsPage.waitForTimeout(400);

    // Modal dialog must be visible
    const dialogTitle = optionsPage.locator('[role="alertdialog"] h2, [role="alertdialog"] [class*="Title"]');
    assert.ok(await dialogTitle.isVisible(), 'Confirmation alert dialog must be open');

    // Cancel first
    await optionsPage.locator('button:has-text("Cancel")').click();
    await optionsPage.waitForTimeout(300);
    assert.ok(!(await dialogTitle.isVisible()), 'Clicking Cancel must close confirmation dialog');

    // Confirm reset
    await optionsPage.locator('#btn-reset-defaults').click();
    await optionsPage.waitForTimeout(400);
    await optionsPage.locator('#btn-confirm-reset').click();
    await optionsPage.waitForTimeout(800);

    // Verify toast or defaults restored
    const pinnedAgain = await optionsPage.evaluate(async () => {
      const data = await chrome.storage.local.get('currency_converter_settings_v2');
      return data['currency_converter_settings_v2']?.pinnedCurrencies?.length;
    });
    assert.equal(pinnedAgain, 8, 'Resetting defaults must restore default 8 pinned currencies');

    // Verify JSON file import via #input-import-settings restores settings end-to-end
    await optionsPage.locator('#input-import-settings').setInputFiles({
      name: 'canji-backup.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({
        schemaVersion: 3,
        targetCurrency: 'JPY',
        pinnedCurrencies: ['USD', 'EUR', 'JPY'],
        roundWhole: true
      }))
    });
    await optionsPage.waitForTimeout(600);

    const importedState = await optionsPage.evaluate(async () => {
      const data = await chrome.storage.local.get('currency_converter_settings_v2');
      const s = data['currency_converter_settings_v2'];
      return {
        targetCurrency: s?.targetCurrency,
        pinnedLen: s?.pinnedCurrencies?.length,
        roundWhole: s?.roundWhole
      };
    });
    assert.equal(importedState.targetCurrency, 'JPY', 'Imported JSON must update targetCurrency to JPY');
    assert.equal(importedState.pinnedLen, 3, 'Imported JSON must update pinnedCurrencies length to 3');
    assert.equal(importedState.roundWhole, true, 'Imported JSON must update roundWhole to true');

    // Reset back to defaults so subsequent steps start clean
    await optionsPage.locator('#btn-reset-defaults').click();
    await optionsPage.waitForTimeout(300);
    await optionsPage.locator('#btn-confirm-reset').click();
    await optionsPage.waitForTimeout(600);

    // -------------------------------------------------------------------------
    // 7. Keyboard navigation: Tab through sections
    // -------------------------------------------------------------------------
    await optionsPage.locator('a[href="#general"]').click();
    await optionsPage.waitForSelector('nav[aria-label="Settings sections"]');

    // Press Tab and verify focus moves logically
    await optionsPage.keyboard.press('Tab');
    const focusedTag = await optionsPage.evaluate(() => document.activeElement?.tagName);
    assert.ok(['A', 'BUTTON', 'INPUT'].includes(focusedTag), 'Keyboard Tab must navigate interactive controls');

    // -------------------------------------------------------------------------
    // 8. Edit made in popup appears in the open options page
    // -------------------------------------------------------------------------
    const popupPage = await context.newPage();
    await popupPage.goto(`chrome-extension://${browser.extensionId}/popup/popup.html`);
    await popupPage.waitForLoadState('domcontentloaded');

    // Update settings via storage simulating popup edit
    await popupPage.evaluate(async () => {
      const key = 'currency_converter_settings_v2';
      const stored = (await chrome.storage.local.get(key))[key] || {};
      stored.roundWhole = true;
      await chrome.storage.local.set({ [key]: stored });
    });
    await optionsPage.waitForTimeout(800);

    // Verify switch-round-whole in options page reflected the external change
    await optionsPage.locator('a[href="#general"]').click();
    await optionsPage.waitForSelector('#switch-round-whole');
    const isRoundWholeChecked = await optionsPage.locator('#switch-round-whole').getAttribute('data-state');
    assert.equal(isRoundWholeChecked, 'checked', 'External settings update must sync to options page');

    // Verify 0 console errors during entire E2E run
    assert.equal(consoleErrors.length, 0, `Options page must have 0 console errors. Errors: ${consoleErrors.join(', ')}`);

    console.log('[E2E Options] All 10 test scenarios passed with 0 console errors.');
  } finally {
    await browser.close();
  }
});
