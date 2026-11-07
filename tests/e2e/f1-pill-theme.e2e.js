// tests/e2e/f1-pill-theme.e2e.js
// Step 11 (real Chromium): the in-page pill follows the extension Theme setting and the OS
// preference ('system'), loading the saved theme before first paint; the popup keeps its
// behavioral contract and never renders text below the 12px design-scale minimum.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchExtensionBrowser } from '../../scripts/launch-browser.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.resolve(__dirname, '..', 'fixtures');
const SHOTS_DIR = path.resolve(__dirname, '..', '..', 'dist', 'test-screenshots');
const usdSuffixHtml = fs.readFileSync(path.join(FIXTURES_DIR, 'usd_suffix.html'), 'utf8');

const LIGHT_SURFACE = 'rgba(247, 245, 240, 0.86)';
const DARK_SURFACE = 'rgba(24, 24, 22, 0.86)';
const LIGHT_TEXT = 'rgb(25, 24, 21)';
const DARK_TEXT = 'rgb(236, 233, 226)';

async function routeFixtures(context) {
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.protocol.startsWith('chrome-extension')) return route.continue();
    if (url.hostname.includes('frankfurter') || url.pathname.includes('latest')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ amount: 1, base: 'USD', date: '2026-10-22', rates: { EUR: 0.92, GBP: 0.79, NGN: 1500, USD: 1 } })
      });
    }
    return route.fulfill({ status: 200, contentType: 'text/html', body: usdSuffixHtml });
  });
}

async function setSettings(page, extensionId, payload) {
  await page.goto(`chrome-extension://${extensionId}/options/options.html#general`);
  await page.waitForLoadState('domcontentloaded');
  await page.evaluate(async (p) => {
    await chrome.runtime.sendMessage({ type: 'CC_UPDATE_SETTINGS', payload: p });
  }, payload);
  await page.waitForTimeout(300);
}

async function readPill(page) {
  return page.evaluate(() => {
    const host = document.getElementById('cc-dynamic-island-host');
    const root = host?.shadowRoot;
    const island = root?.querySelector('.cc-dynamic-island');
    const code = root?.querySelector('.cc-currency-code');
    const dot = root?.querySelector('.cc-status-dot');
    const container = root?.querySelector('.cc-island-container');
    if (!island) return null;
    return {
      dataTheme: container.getAttribute('data-theme'),
      background: getComputedStyle(island).backgroundColor,
      text: getComputedStyle(code).color,
      dot: getComputedStyle(dot).backgroundColor
    };
  });
}

test('F1: pill follows Theme setting (light/dark/system) and OS preference, loading saved theme before first paint', async () => {
  fs.mkdirSync(SHOTS_DIR, { recursive: true });
  const browser = await launchExtensionBrowser({ build: 'fresh' });
  try {
    const { context, extensionId } = browser;
    await routeFixtures(context);

    const setup = await context.newPage();
    await setSettings(setup, extensionId, { targetCurrency: 'NGN' });
    await setup.goto(`chrome-extension://${extensionId}/options/options.html#sites`);
    await setup.waitForSelector('#input-new-site');
    await setup.locator('#input-new-site').fill('shop.test');
    await setup.locator('button[aria-label="Always convert"]').click();
    await setup.locator('button[aria-label="Add site"]').click();
    await setup.waitForSelector('span.font-mono:has-text("shop.test")', { timeout: 5000 });
    await setup.waitForTimeout(500);

    const scenarios = [
      { theme: 'light', os: 'dark', surface: LIGHT_SURFACE, text: LIGHT_TEXT, attr: 'light' },
      { theme: 'dark', os: 'light', surface: DARK_SURFACE, text: DARK_TEXT, attr: 'dark' },
      { theme: 'system', os: 'light', surface: LIGHT_SURFACE, text: LIGHT_TEXT, attr: null },
      { theme: 'system', os: 'dark', surface: DARK_SURFACE, text: DARK_TEXT, attr: null }
    ];

    for (const sc of scenarios) {
      await setSettings(setup, extensionId, { theme: sc.theme });

      const page = await context.newPage();
      await page.emulateMedia({ colorScheme: sc.os });
      await page.goto('http://shop.test/catalog');
      await page.waitForFunction(
        () => document.getElementById('cc-dynamic-island-host')?.shadowRoot?.querySelector('.cc-dynamic-island'),
        null,
        { timeout: 15000 }
      );

      const pill = await readPill(page);
      const label = `theme=${sc.theme} os=${sc.os}`;
      assert.ok(pill, `${label}: pill must mount`);
      assert.equal(pill.dataTheme, sc.attr, `${label}: data-theme attribute on FIRST mount`);
      assert.equal(pill.background, sc.surface, `${label}: pill surface must follow theme`);
      assert.equal(pill.text, sc.text, `${label}: pill text must follow theme`);

      const viewport = page.viewportSize() || { width: 1280, height: 720 };
      const clip = { x: Math.max(0, viewport.width / 2 - 330), y: 0, width: 660, height: 110 };
      await page.screenshot({ path: path.join(SHOTS_DIR, `11-pill-theme-${sc.theme}-os-${sc.os}.png`), clip });

      await page.evaluate(() => {
        const island = document.getElementById('cc-dynamic-island-host').shadowRoot.querySelector('.cc-dynamic-island');
        island.classList.add('cc-expanded');
      });
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(SHOTS_DIR, `11-pill-theme-${sc.theme}-os-${sc.os}-expanded.png`), clip });

      await page.close();
    }
    console.log('[F1] pill theme scenarios passed:', scenarios.length);
  } finally {
    await browser.close();
  }
});

test('F2: popup keeps its behavioral contract and renders no text under 12px', async () => {
  fs.mkdirSync(SHOTS_DIR, { recursive: true });
  const browser = await launchExtensionBrowser({ build: 'fresh' });
  try {
    const { context, extensionId } = browser;
    await routeFixtures(context);

    for (const scheme of ['light', 'dark']) {
      const popup = await context.newPage();
      await popup.setViewportSize({ width: 360, height: 640 });
      await popup.emulateMedia({ colorScheme: scheme });
      await popup.goto(`chrome-extension://${extensionId}/popup/popup.html`);
      await popup.waitForSelector('#btn-convert-toggle');
      await popup.waitForTimeout(600);

      for (const id of ['btn-open-options', 'main-controls', 'from-display', 'picker-to-btn', 'btn-convert-toggle', 'live-status', 'rates-meta', 'rates-freshness-text']) {
        assert.ok(await popup.locator(`#${id}`).count(), `popup must keep #${id}`);
      }

      const small = await popup.evaluate(() => {
        const offenders = [];
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let node;
        while ((node = walker.nextNode())) {
          if (!node.textContent.trim()) continue;
          const el = node.parentElement;
          const size = parseFloat(getComputedStyle(el).fontSize);
          if (size < 12) offenders.push(`${el.tagName.toLowerCase()}:${size}px "${node.textContent.trim().slice(0, 24)}"`);
        }
        return offenders;
      });
      assert.deepEqual(small, [], `popup (${scheme}) must not render text below 12px`);

      await popup.screenshot({ path: path.join(SHOTS_DIR, `11-popup-${scheme}.png`) });
      await popup.close();
    }
    console.log('[F2] popup contract + type scale verified');
  } finally {
    await browser.close();
  }
});
