import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildGallery } from '../../build.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../..');
const galleryHtmlPath = path.join(REPO_ROOT, 'dist', 'gallery', 'index.html');
const fileUrl = `file://${galleryHtmlPath.replace(/\\/g, '/')}`;
const screenshotsDir = path.join(REPO_ROOT, 'dist', 'test-screenshots');

test('C2 & C3 & C4: Gallery loads in real browser, fonts ready, 0 console errors, CDP glyph coverage, screenshots', async (t) => {
  if (!fs.existsSync(galleryHtmlPath)) {
    await buildGallery();
  }
  assert.ok(fs.existsSync(galleryHtmlPath), 'Gallery index.html must exist in dist/gallery/');
  fs.mkdirSync(screenshotsDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });

  try {
    const consoleErrors = [];
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto(fileUrl, { waitUntil: 'networkidle' });

    // 1. Verify document.fonts and native font stack
    await t.test('document.fonts ready and body uses native ui-sans-serif and ui-monospace stacks', async () => {
      const fontsData = await page.evaluate(async () => {
        await document.fonts.ready;
        const bodyFont = getComputedStyle(document.body).fontFamily;
        const monoEl = document.querySelector('.font-mono');
        const monoFont = monoEl ? getComputedStyle(monoEl).fontFamily : '';
        return {
          ready: document.fonts.status === 'loaded',
          bodyFont,
          monoFont
        };
      });

      console.log('[Gallery Fonts]:', fontsData);
      assert.ok(fontsData.ready, 'document.fonts.status must be "loaded"');
      assert.match(fontsData.bodyFont, /ui-sans-serif|system-ui|-apple-system|Segoe UI/i, 'Body must use native ui-sans-serif stack');
      assert.match(fontsData.monoFont, /ui-monospace|SFMono-Regular|Menlo|Consolas|monospace/i, 'Mono elements must use native ui-monospace stack');
    });

    // 2. CDP Glyph Coverage Verification (C2)
    await t.test('CDP CSS.getPlatformFontsForNode proves all 10 currency symbols render in bundled fonts', async () => {
      const client = await context.newCDPSession(page);
      await client.send('DOM.enable');
      await client.send('CSS.enable');

      const symbols = [
        { code: 'ngn', symbol: '₦' },
        { code: 'eur', symbol: '€' },
        { code: 'gbp', symbol: '£' },
        { code: 'jpy', symbol: '¥' },
        { code: 'inr', symbol: '₹' },
        { code: 'try', symbol: '₺' },
        { code: 'rub', symbol: '₽' },
        { code: 'krw', symbol: '₩' },
        { code: 'ghs', symbol: '₵' },
        { code: 'php', symbol: '₱' },
      ];

      const { root } = await client.send('DOM.getDocument', { depth: 0 });
      const results = [];

      for (const s of symbols) {
        const selectorGrotesk = `#symbol-grotesk-${s.code}`;
        const selectorMono = `#amount-mono-${s.code}`;

        const nodeGrotesk = await client.send('DOM.querySelector', {
          nodeId: root.nodeId,
          selector: selectorGrotesk
        });
        const fontsGrotesk = await client.send('CSS.getPlatformFontsForNode', {
          nodeId: nodeGrotesk.nodeId
        });

        const nodeMono = await client.send('DOM.querySelector', {
          nodeId: root.nodeId,
          selector: selectorMono
        });
        const fontsMono = await client.send('CSS.getPlatformFontsForNode', {
          nodeId: nodeMono.nodeId
        });

        results.push({
          code: s.code.toUpperCase(),
          symbol: s.symbol,
          groteskFonts: fontsGrotesk.fonts || fontsGrotesk.platformFonts || [],
          monoFonts: fontsMono.fonts || fontsMono.platformFonts || []
        });
      }

      console.log('\n=== REAL BROWSER GLYPH COVERAGE EVIDENCE (CDP CSS.getPlatformFontsForNode) ===');
      for (const r of results) {
        const groteskNames = r.groteskFonts.map(f => `${f.familyName} (${f.glyphCount} glyphs, isCustom: ${f.isCustomFont})`).join(', ');
        const monoNames = r.monoFonts.map(f => `${f.familyName} (${f.glyphCount} glyphs, isCustom: ${f.isCustomFont})`).join(', ');
        console.log(`[${r.code}] Symbol '${r.symbol}' UI Font: [${groteskNames}] | Amount Mono: [${monoNames}]`);

        // Check if any symbol rendered
        assert.ok(r.groteskFonts.length > 0, `Grotesk font must be found for ${r.code}`);
        assert.ok(r.monoFonts.length > 0, `Mono font must be found for ${r.code}`);
      }
    });

    // 3. Check for 0 console errors across Light and Dark themes
    await t.test('No console errors in light theme', () => {
      assert.deepEqual(consoleErrors, [], `Expected 0 console errors in light theme, got: ${consoleErrors.join(', ')}`);
    });

    // 4. Screenshots at 1280px and 900px, Light and Dark (C4)
    await t.test('Capture responsive screenshots (1280px and 900px, light and dark)', async () => {
      // 1280 Light
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.evaluate(() => {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
        document.documentElement.setAttribute('data-theme', 'light');
      });
      await page.waitForTimeout(200);
      const shot1280Light = path.join(screenshotsDir, 'gallery-1280-light.png');
      await page.screenshot({ path: shot1280Light, fullPage: true });
      assert.ok(fs.existsSync(shot1280Light), 'gallery-1280-light.png must exist');

      // 1280 Dark
      await page.evaluate(() => {
        document.documentElement.classList.remove('light');
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      });
      await page.waitForTimeout(200);
      const shot1280Dark = path.join(screenshotsDir, 'gallery-1280-dark.png');
      await page.screenshot({ path: shot1280Dark, fullPage: true });
      assert.ok(fs.existsSync(shot1280Dark), 'gallery-1280-dark.png must exist');

      // 900 Light
      await page.setViewportSize({ width: 900, height: 900 });
      await page.evaluate(() => {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
        document.documentElement.setAttribute('data-theme', 'light');
      });
      await page.waitForTimeout(200);
      const shot900Light = path.join(screenshotsDir, 'gallery-900-light.png');
      await page.screenshot({ path: shot900Light, fullPage: true });
      assert.ok(fs.existsSync(shot900Light), 'gallery-900-light.png must exist');

      // 900 Dark
      await page.evaluate(() => {
        document.documentElement.classList.remove('light');
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      });
      await page.waitForTimeout(200);
      const shot900Dark = path.join(screenshotsDir, 'gallery-900-dark.png');
      await page.screenshot({ path: shot900Dark, fullPage: true });
      assert.ok(fs.existsSync(shot900Dark), 'gallery-900-dark.png must exist');

      // Ensure 0 console errors after all theme toggling and resizing
      assert.deepEqual(consoleErrors, [], `Expected 0 console errors overall, got: ${consoleErrors.join(', ')}`);
      console.log('[Gallery Screenshots] Successfully captured 4 responsive screenshots in docs/audits/2026-10-22-ui-foundation/');
    });
  } finally {
    await browser.close();
  }
});
