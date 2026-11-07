import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distChrome = path.join(rootDir, 'dist', 'chrome');
const distFirefox = path.join(rootDir, 'dist', 'firefox');
const packagesDir = path.join(rootDir, 'dist', 'packages');

function readZipEntries(zipPath) {
  const buf = fs.readFileSync(zipPath);
  let offset = 0;
  const names = [];
  while (offset < buf.length - 4) {
    if (buf.readUInt32LE(offset) === 0x04034b50) {
      const fnLen = buf.readUInt16LE(offset + 26);
      const extraLen = buf.readUInt16LE(offset + 28);
      const compSize = buf.readUInt32LE(offset + 18);
      const name = buf.toString('utf8', offset + 30, offset + 30 + fnLen);
      names.push(name);
      offset += 30 + fnLen + extraLen + compSize;
    } else {
      offset++;
    }
  }
  return names;
}

test('build: manifest structure and permissions for Chrome', () => {
  const manifestPath = path.join(distChrome, 'manifest.json');
  assert.ok(fs.existsSync(manifestPath), 'Chrome manifest.json must exist');

  const raw = fs.readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(raw);

  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.version, '2.0.0');
  assert.equal(manifest.name, 'Canji');
  assert.equal(manifest.background.service_worker, 'background.js');

  const expectedPermissions = ['contextMenus', 'notifications', 'storage', 'activeTab', 'scripting', 'tabs'];
  assert.deepEqual(manifest.permissions.sort(), expectedPermissions.sort());

  const expectedHostPermissions = [
    '<all_urls>'
  ];
  assert.deepEqual(manifest.host_permissions.sort(), expectedHostPermissions.sort());

  // Check referenced files exist in dist/chrome
  assert.ok(fs.existsSync(path.join(distChrome, manifest.background.service_worker)));
  assert.ok(fs.existsSync(path.join(distChrome, manifest.action.default_popup)));
  assert.ok(fs.existsSync(path.join(distChrome, manifest.options_ui.page)));
  for (const iconPath of Object.values(manifest.icons)) {
    assert.ok(fs.existsSync(path.join(distChrome, iconPath)));
  }
});

test('build: manifest structure and permissions for Firefox', () => {
  const manifestPath = path.join(distFirefox, 'manifest.json');
  assert.ok(fs.existsSync(manifestPath), 'Firefox manifest.json must exist');

  const raw = fs.readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(raw);

  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.version, '2.0.0');
  assert.equal(manifest.name, 'Canji');
  assert.deepEqual(manifest.background.scripts, ['background.js']);
  assert.ok(manifest.browser_specific_settings && manifest.browser_specific_settings.gecko);
  assert.equal(manifest.browser_specific_settings.gecko.id, 'canji@richmond.addons');

  const expectedPermissions = ['contextMenus', 'notifications', 'storage', 'activeTab', 'scripting', 'tabs'];
  assert.deepEqual(manifest.permissions.sort(), expectedPermissions.sort());

  const expectedHostPermissions = [
    '<all_urls>'
  ];
  assert.deepEqual(manifest.host_permissions.sort(), expectedHostPermissions.sort());

  // Check referenced files exist in dist/firefox
  assert.ok(fs.existsSync(path.join(distFirefox, manifest.background.scripts[0])));
  assert.ok(fs.existsSync(path.join(distFirefox, manifest.action.default_popup)));
  assert.ok(fs.existsSync(path.join(distFirefox, manifest.options_ui.page)));
  for (const iconPath of Object.values(manifest.icons)) {
    assert.ok(fs.existsSync(path.join(distFirefox, iconPath)));
  }
});

test('build: zip packages exist and contain manifest.json at root', () => {
  const chromeZip = path.join(packagesDir, 'canji-chrome-v2.0.0.zip');
  const firefoxZip = path.join(packagesDir, 'canji-firefox-v2.0.0.zip');

  assert.ok(fs.existsSync(chromeZip), 'Chrome zip package must exist');
  assert.ok(fs.existsSync(firefoxZip), 'Firefox zip package must exist');

  const chromeEntries = readZipEntries(chromeZip);
  const firefoxEntries = readZipEntries(firefoxZip);

  assert.ok(chromeEntries.includes('manifest.json'), 'Chrome zip must contain manifest.json at root');
  assert.ok(chromeEntries.includes('background.js'), 'Chrome zip must contain background.js at root');
  assert.ok(chromeEntries.includes('content.js'), 'Chrome zip must contain content.js at root');

  assert.ok(firefoxEntries.includes('manifest.json'), 'Firefox zip must contain manifest.json at root');
  assert.ok(firefoxEntries.includes('background.js'), 'Firefox zip must contain background.js at root');
  assert.ok(firefoxEntries.includes('content.js'), 'Firefox zip must contain content.js at root');

  // Verify zero stale .woff/.woff2 webfont bloat in zip packages and explicit MV3 CSP in manifests
  const staleFontsChrome = chromeEntries.filter((e) => e.endsWith('.woff') || e.endsWith('.woff2'));
  const staleFontsFirefox = firefoxEntries.filter((e) => e.endsWith('.woff') || e.endsWith('.woff2'));
  assert.equal(staleFontsChrome.length, 0, 'Chrome zip must not bundle stale .woff/.woff2 webfonts');
  assert.equal(staleFontsFirefox.length, 0, 'Firefox zip must not bundle stale .woff/.woff2 webfonts');

  const chromeManifest = JSON.parse(fs.readFileSync(path.join(distChrome, 'manifest.json'), 'utf8'));
  const firefoxManifest = JSON.parse(fs.readFileSync(path.join(distFirefox, 'manifest.json'), 'utf8'));
  assert.equal(
    chromeManifest.content_security_policy?.extension_pages,
    "script-src 'self'; object-src 'self'; base-uri 'none';"
  );
  assert.equal(
    firefoxManifest.content_security_policy?.extension_pages,
    "script-src 'self'; object-src 'self'; base-uri 'none';"
  );
});
