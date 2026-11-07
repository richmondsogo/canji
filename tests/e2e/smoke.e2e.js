import test from 'node:test';
import assert from 'node:assert/strict';
import { launchExtensionBrowser } from '../../scripts/launch-browser.js';

test('E2E Smoke: Extension loads in real browser, service worker is alive, and options page renders', async () => {
  const browser = await launchExtensionBrowser({ build: 'fresh' });
  try {
    // 1. Verify service worker
    assert.ok(browser.sw, 'Service worker must be running');
    assert.match(browser.sw.url(), /^chrome-extension:\/\/[a-z0-9]+\/background\.js$/, 'Service worker URL must match extension schema');
    assert.ok(browser.extensionId, 'Extension ID must be present');
    assert.equal(browser.extensionId.length, 32, 'Extension ID must be a 32-character Chrome extension hash');

    // 2. Verify options page
    const optionsPage = await browser.context.newPage();
    await optionsPage.goto(`chrome-extension://${browser.extensionId}/options/options.html`);
    await optionsPage.waitForLoadState('domcontentloaded');

    const optionsTitle = await optionsPage.title();
    assert.equal(optionsTitle, 'General', 'Options page title must match');

    const hasNav = await optionsPage.locator('nav[aria-label="Settings sections"]').isVisible();
    assert.ok(hasNav, 'Options page navigation must be visible');

    const headingText = (await optionsPage.locator('h1').textContent()).trim();
    assert.equal(headingText, 'General', 'General settings section must be visible');

    // 3. Verify popup page
    const popupPage = await browser.context.newPage();
    await popupPage.goto(`chrome-extension://${browser.extensionId}/popup/popup.html`);
    await popupPage.waitForLoadState('domcontentloaded');

    const popupTitle = await popupPage.title();
    assert.equal(popupTitle, 'Canji', 'Popup page title must match');

    const hasQuickConvert = await popupPage.locator('#btn-convert-toggle').isVisible();
    assert.ok(hasQuickConvert, 'Convert page button must be visible in popup');

    console.log('[E2E Smoke] Passed: Service Worker alive, Options and Popup pages render cleanly.');
  } finally {
    await browser.close();
  }
});
