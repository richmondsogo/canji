// scripts/capture-production-screenshots.js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchExtensionBrowser } from './launch-browser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const outDir = path.join(projectRoot, 'screenshots');
const demoStoreHtml = fs.readFileSync(path.join(__dirname, 'demo-store.html'), 'utf8');

fs.mkdirSync(outDir, { recursive: true });

async function run() {
  console.log('[Screenshots] Launching Chrome with unpacked extension...');
  const browser = await launchExtensionBrowser({ build: 'fresh', headed: false });

  try {
    const context = browser.context;

    // Route fake domain to demo store
    await context.route('https://store.nordicliving.com/**', async (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: demoStoreHtml
      });
    });

    // 0. Pre-configure extension settings so store.nordicliving.com auto-converts
    console.log('[Screenshots] Pre-configuring settings for store.nordicliving.com...');
    const setupPage = await context.newPage();
    await setupPage.goto(`chrome-extension://${browser.extensionId}/options/options.html#general`);
    await setupPage.waitForLoadState('domcontentloaded');
    await setupPage.evaluate(async () => {
      await chrome.runtime.sendMessage({
        type: 'CC_UPDATE_SETTINGS',
        payload: {
          targetCurrency: 'USD',
          displayMode: 'replace',
          showInPageBar: true,
          perSite: {
            'store.nordicliving.com': { mode: 'always' }
          }
        }
      });
    });
    await setupPage.waitForTimeout(500);
    await setupPage.close();

    // -------------------------------------------------------------------------
    // 1. In-Page Dynamic Island & Price Translation (screenshot-inpage-bar.png)
    // -------------------------------------------------------------------------
    console.log('[Screenshots] 1. Capturing In-Page Dynamic Island on Demo Store...');
    const storePage = await context.newPage();
    await storePage.setViewportSize({ width: 1280, height: 800 });
    await storePage.goto('https://store.nordicliving.com/');
    await storePage.waitForLoadState('domcontentloaded');

    // Wait for the Dynamic Island to mount inside shadow root
    await storePage.waitForFunction(() => {
      const host = document.getElementById('cc-dynamic-island-host');
      return Boolean(host?.shadowRoot?.querySelector('.cc-dynamic-island'));
    }, { timeout: 10000 });

    await storePage.waitForTimeout(800);

    // Expand Dynamic Island capsule so full controls are showcased
    await storePage.evaluate(() => {
      const host = document.getElementById('cc-dynamic-island-host');
      const island = host?.shadowRoot?.querySelector('.cc-dynamic-island');
      if (island) island.classList.add('cc-expanded');
    });

    // Hover over the first converted price to show the tooltip
    const priceEl = storePage.locator('.price-main').first();
    if (await priceEl.count() > 0) {
      await priceEl.hover();
      await storePage.waitForTimeout(600);
    }

    await storePage.screenshot({
      path: path.join(outDir, 'screenshot-inpage-bar.png')
    });
    console.log('[Screenshots] Saved screenshot-inpage-bar.png');

    // Hide the price tooltip before compositing popup screenshots
    await storePage.evaluate(() => {
      const host = document.getElementById('cc-dynamic-island-host');
      const tip = host?.shadowRoot?.querySelector('.cc-tooltip');
      if (tip) tip.classList.remove('visible');
    });

    // Helper to composite a 360x560 popup PNG buffer onto the 1280x800 storePage
    async function savePopupCompositeOnStore(popupBuffer, filename) {
      const base64 = popupBuffer.toString('base64');
      await storePage.evaluate((dataUrl) => {
        let frame = document.getElementById('cc-cws-popup-composite');
        if (!frame) {
          frame = document.createElement('img');
          frame.id = 'cc-cws-popup-composite';
          frame.style.position = 'fixed';
          frame.style.top = '16px';
          frame.style.right = '24px';
          frame.style.width = '360px';
          frame.style.height = 'auto';
          frame.style.borderRadius = '12px';
          frame.style.border = '1px solid #E2DED4';
          frame.style.boxShadow = '0 20px 48px rgba(25, 24, 21, 0.22), 0 4px 12px rgba(25, 24, 21, 0.08)';
          frame.style.zIndex = '2147483647';
          document.body.appendChild(frame);
        }
        frame.src = `data:image/png;base64,${dataUrl}`;
      }, base64);
      await storePage.waitForTimeout(200);
      await storePage.screenshot({
        path: path.join(outDir, filename)
      });
      await storePage.evaluate(() => {
        document.getElementById('cc-cws-popup-composite')?.remove();
      });
    }

    // -------------------------------------------------------------------------
    // 2. Action Popup (screenshot-popup.png — 1280x800 CWS compliant)
    // -------------------------------------------------------------------------
    console.log('[Screenshots] 2. Capturing Toolbar Action Popup...');
    const popupPage = await context.newPage();
    await popupPage.setViewportSize({ width: 360, height: 560 });
    const popupUrl = `chrome-extension://${browser.extensionId}/popup/popup.html`;
    await popupPage.goto(popupUrl);
    await popupPage.waitForLoadState('domcontentloaded');
    await popupPage.waitForTimeout(800);

    const popupBuf = await popupPage.screenshot();
    await savePopupCompositeOnStore(popupBuf, 'screenshot-popup.png');
    console.log('[Screenshots] Saved screenshot-popup.png');

    // -------------------------------------------------------------------------
    // 3. Searchable Combobox (screenshot-combobox.png — 1280x800 CWS compliant)
    // -------------------------------------------------------------------------
    console.log('[Screenshots] 3. Capturing Searchable Currency Combobox...');
    const pickerBtn = popupPage.locator('#picker-to-btn');
    if (await pickerBtn.count() > 0) {
      await pickerBtn.click();
      await popupPage.waitForTimeout(400);

      const searchInput = popupPage.locator('input[placeholder="Search currencies…"]');
      if (await searchInput.count() > 0) {
        await searchInput.fill('jpy');
        await popupPage.waitForTimeout(400);
      }
    }

    const comboboxBuf = await popupPage.screenshot();
    await savePopupCompositeOnStore(comboboxBuf, 'screenshot-combobox.png');
    console.log('[Screenshots] Saved screenshot-combobox.png');

    // -------------------------------------------------------------------------
    // 4. Options Dashboard (screenshot-options.png — 1280x800 CWS compliant)
    // -------------------------------------------------------------------------
    console.log('[Screenshots] 4. Capturing Options Dashboard...');
    const optionsPage = await context.newPage();
    await optionsPage.setViewportSize({ width: 1280, height: 800 });
    const optionsUrl = `chrome-extension://${browser.extensionId}/options/options.html`;
    await optionsPage.goto(optionsUrl);
    await optionsPage.waitForLoadState('domcontentloaded');
    await optionsPage.waitForTimeout(1000);

    await optionsPage.screenshot({
      path: path.join(outDir, 'screenshot-options.png')
    });
    console.log('[Screenshots] Saved screenshot-options.png');

    // -------------------------------------------------------------------------
    // 5. Context Menu Selection (real-work-test-context-menu.png — 1280x800 CWS compliant)
    // -------------------------------------------------------------------------
    console.log('[Screenshots] 5. Capturing Context Menu Selection...');
    const contextPage = await context.newPage();
    await contextPage.setViewportSize({ width: 1280, height: 800 });
    await contextPage.goto('https://store.nordicliving.com/');
    await contextPage.waitForLoadState('domcontentloaded');
    await contextPage.waitForTimeout(500);

    // Highlight text and render an authentic Scandinavian context menu
    await contextPage.evaluate(() => {
      const priceText = document.querySelector('.price-main');
      if (priceText) {
        const range = document.createRange();
        range.selectNodeContents(priceText);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);

        const rect = priceText.getBoundingClientRect();
        const menu = document.createElement('div');
        menu.id = 'demo-context-menu';
        menu.style.position = 'fixed';
        menu.style.left = `${rect.right + 16}px`;
        menu.style.top = `${Math.min(rect.top - 20, window.innerHeight - 250)}px`;
        menu.style.background = '#FFFFFF';
        menu.style.border = '1px solid #E2DED4';
        menu.style.borderRadius = '8px';
        menu.style.boxShadow = '0 12px 32px rgba(25, 24, 21, 0.12)';
        menu.style.padding = '6px';
        menu.style.width = '240px';
        menu.style.zIndex = '999999';
        menu.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        menu.style.fontSize = '13px';
        menu.style.color = '#191815';

        const items = [
          { text: 'Copy', shortcut: 'Ctrl+C' },
          { text: 'Search Google for "€249.00"', shortcut: '' },
          { divider: true },
          { text: 'Convert to USD ($)', active: true, icon: 'fx' },
          { text: 'Convert to NGN (₦)', icon: 'fx' },
          { text: 'Convert to GBP (£)', icon: 'fx' },
          { text: 'Convert to JPY (¥)', icon: 'fx' }
        ];

        for (const item of items) {
          if (item.divider) {
            const hr = document.createElement('div');
            hr.style.height = '1px';
            hr.style.background = '#EFECE5';
            hr.style.margin = '4px 0';
            menu.appendChild(hr);
            continue;
          }
          const row = document.createElement('div');
          row.style.padding = '6px 10px';
          row.style.borderRadius = '4px';
          row.style.display = 'flex';
          row.style.alignItems = 'center';
          row.style.justifyContent = 'space-between';
          row.style.cursor = 'default';
          if (item.active) {
            row.style.background = '#EFECE5';
            row.style.color = '#1E6B52';
            row.style.fontWeight = '600';
          }
          const left = document.createElement('span');
          left.textContent = item.text;
          row.appendChild(left);
          if (item.shortcut) {
            const sc = document.createElement('span');
            sc.textContent = item.shortcut;
            sc.style.color = '#9B968B';
            sc.style.fontSize = '11px';
            row.appendChild(sc);
          }
          menu.appendChild(row);
        }
        document.body.appendChild(menu);
      }
    });

    await contextPage.waitForTimeout(400);
    await contextPage.screenshot({
      path: path.join(outDir, 'real-work-test-context-menu.png')
    });
    console.log('[Screenshots] Saved real-work-test-context-menu.png');

    // -------------------------------------------------------------------------
    // 6. Chrome Web Store Promo Banner (promo-small-440x280.png)
    // -------------------------------------------------------------------------
    console.log('[Screenshots] 6. Capturing Chrome Web Store Promo Banner (440x280)...');
    const promoPage = await context.newPage();
    await promoPage.setViewportSize({ width: 440, height: 280 });

    const promoHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 440px;
    height: 280px;
    background: #F7F5F0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border: 1px solid #E2DED4;
    overflow: hidden;
    position: relative;
    user-select: none;
  }
  .accent-bar {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: #1E6B52;
  }
  .icon-container {
    width: 60px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 10px;
  }
  .title {
    font-size: 24px;
    font-weight: 600;
    letter-spacing: -0.02em;
    color: #191815;
    margin-bottom: 3px;
  }
  .subtitle {
    font-size: 13px;
    font-weight: 400;
    color: #67635A;
    margin-bottom: 16px;
  }
  .pill-preview {
    background: #FFFFFF;
    border: 1px solid #E2DED4;
    border-radius: 9999px;
    box-shadow: 0 4px 14px rgba(25, 24, 21, 0.08);
    padding: 6px 14px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    margin-bottom: 18px;
  }
  .pill-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #1E6B52;
  }
  .pill-from {
    color: #9B968B;
    text-decoration: line-through;
    font-weight: 400;
  }
  .pill-arrow {
    color: #67635A;
    font-size: 11px;
  }
  .pill-to {
    color: #1E6B52;
    font-weight: 600;
  }
  .pill-tag {
    background: #EFECE5;
    color: #191815;
    font-size: 10px;
    font-weight: 600;
    padding: 1px 6px;
    border-radius: 4px;
    letter-spacing: 0.02em;
    margin-left: 2px;
  }
  .meta {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #9B968B;
  }
</style>
</head>
<body>
  <div class="accent-bar"></div>
  <div class="icon-container">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="58" height="58">
      <path fill="#191815" d="M35.68 73.40 L35.68 182.60 L130.25 237.20 L220.32 185.20 L220.32 174.80 L130.25 226.80 L44.68 177.40 L44.68 78.60 L130.25 29.20 L220.32 81.20 L220.32 70.80 L130.25 18.80Z"/>
      <path fill="#191815" d="M96.93 91.08 L96.93 164.92 L160.87 201.84 L220.32 167.52 L220.32 157.12 L160.87 191.44 L105.93 159.72 L105.93 96.28 L160.87 64.56 L220.32 98.88 L220.32 88.48 L160.87 54.16Z"/>
      <path fill="#1E6B52" d="M158.17 108.76 L158.17 147.24 L191.50 166.48 L220.32 149.84 L220.32 139.44 L191.50 156.08 L167.17 142.04 L167.17 113.96 L191.50 99.92 L220.32 116.56 L220.32 106.16 L191.50 89.52Z"/>
    </svg>
  </div>
  <h1 class="title">canji</h1>
  <p class="subtitle">Prices, in your currency</p>
  <div class="pill-preview">
    <span class="pill-dot"></span>
    <span class="pill-from">€249.00</span>
    <span class="pill-arrow">→</span>
    <span class="pill-to">$270.65</span>
    <span class="pill-tag">Live Rates</span>
  </div>
  <div class="meta">170+ Currencies · Privacy-First · Instant Revert</div>
</body>
</html>`;

    await promoPage.setContent(promoHtml);
    await promoPage.waitForTimeout(300);
    await promoPage.screenshot({
      path: path.join(outDir, 'promo-small-440x280.png')
    });
    console.log('[Screenshots] Saved promo-small-440x280.png');

    console.log('[Screenshots] All production screenshots captured successfully!');
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('[Screenshots] Error capturing screenshots:', err);
  process.exit(1);
});
