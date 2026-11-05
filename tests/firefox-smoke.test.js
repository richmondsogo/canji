// tests/firefox-smoke.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { createRequire } from 'node:module';

const req = createRequire(import.meta.url);
const { Builder } = req('selenium-webdriver');
const firefox = req('selenium-webdriver/firefox');

test('Firefox MV3 Smoke: Add-on loads, popup opens, and converts prices on real page', async (t) => {
  const firefoxPath = 'C:\\Program Files\\Mozilla Firefox\\firefox.exe';
  if (!fs.existsSync(firefoxPath)) {
    t.skip('Firefox binary not found at ' + firefoxPath);
    return;
  }

  // 1. Create a local fixture server
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!DOCTYPE html>
<html>
<head><title>Product Page</title></head>
<body>
  <h1>Item for sale</h1>
  <div class="price" id="p1">$100.00</div>
  <div class="price" id="p2">&euro;50.00</div>
  <div class="price" id="p3">&pound;25.00</div>
</body>
</html>`);
  });

  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const webPageUrl = `http://127.0.0.1:${port}/test.html`;

  // Firefox installs the immutable copy for this run. This prevents another test
  // rebuilding dist/ from replacing add-on files during install or startup.
  const extensionDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-firefox-smoke-'));
  fs.cpSync(path.resolve('dist/firefox'), extensionDir, { recursive: true });

  const options = new firefox.Options();
  options.addArguments('-headless');
  options.addArguments('-remote-allow-system-access');
  options.setBinary(firefoxPath);
  process.env.MOZ_REMOTE_ALLOW_SYSTEM_ACCESS = '1';

  const driver = await new Builder()
    .forBrowser('firefox')
    .setFirefoxOptions(options)
    .build();

  try {
    assert.ok(fs.existsSync(extensionDir), 'isolated Firefox extension directory must exist');

    // Install add-on as temporary
    const addonId = await driver.installAddon(extensionDir, true);
    assert.ok(addonId, 'Add-on must be installed with an ID');

    // Resolve internal extension UUID
    await driver.setContext('chrome');
    const extUrl = await driver.executeScript(`
      const policy = WebExtensionPolicy.getByID("${addonId}");
      return policy ? policy.getURL("") : null;
    `);
    await driver.setContext('content');
    assert.ok(extUrl, 'Extension URL must be resolved');

    // Navigate tab 0 to web page
    await driver.get(webPageUrl);

    // Open popup window
    const popupUrl = extUrl + 'popup/popup.html';
    await driver.switchTo().newWindow('window');
    await driver.get(popupUrl);
    await new Promise(r => setTimeout(r, 1500));

    // Initial popup state
    const initialStatus = await driver.executeScript(`
      return document.getElementById('live-status')?.textContent?.trim();
    `);
    assert.equal(initialStatus, 'Ready to convert');

    // Verify Firefox popup theming attributes and classes
    const popupTheme = await driver.executeScript(`
      return {
        hasDark: document.documentElement.classList.contains('dark'),
        hasLight: document.documentElement.classList.contains('light'),
        themeAttr: document.documentElement.getAttribute('data-theme'),
        colorScheme: document.documentElement.style.colorScheme
      };
    `);
    assert.ok(popupTheme.themeAttr === 'dark' || popupTheme.themeAttr === 'light', 'Firefox popup must have data-theme');
    assert.ok(popupTheme.hasDark || popupTheme.hasLight, 'Firefox popup must have dark or light class');
    assert.ok(popupTheme.colorScheme === 'dark' || popupTheme.colorScheme === 'light', 'Firefox popup must set colorScheme');

    // Click Convert this page
    await driver.executeScript(`
      document.getElementById('btn-convert-toggle')?.click();
    `);

    // Poll for status
    let finalStatus = '';
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 500));
      finalStatus = await driver.executeScript(`
        return document.getElementById('live-status')?.textContent?.trim();
      `);
      if (finalStatus && finalStatus !== 'Ready to convert' && finalStatus !== 'Scanning and converting...' && finalStatus !== 'Converting…') {
        break;
      }
    }

    console.log('[Firefox Smoke Test] Popup final status:', finalStatus);
    assert.notEqual(finalStatus, 'Conversion failed', 'Popup must not fail conversion in Firefox');
    assert.match(finalStatus, /prices converted/i, 'Popup must report prices converted');

    // Switch to web page and check DOM mutation
    const handles = await driver.getAllWindowHandles();
    await driver.switchTo().window(handles[0]);
    const p2Text = await driver.executeScript(`return document.getElementById('p2')?.textContent?.trim();`);
    console.log('[Firefox Smoke Test] Converted price p2:', p2Text);
    assert.ok(p2Text.startsWith('$'), 'EUR 50.00 must be converted to USD ($)');

  } finally {
    await driver.quit();
    server.close();
    fs.rmSync(extensionDir, { recursive: true, force: true });
  }
});
