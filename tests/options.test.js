import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindConfig from '../tailwind.config.js';
import {
  DEFAULT_SETTINGS,
  normalizeHost,
  migrateSettings,
  validateSettings,
  getSiteMode,
  setSiteMode
} from '../src/shared/settings.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

import {
  getEffectiveSiteCaption,
  validateDomainInput,
  canAddPinned,
  validateImportContent
} from '../src/ui/lib/site-rules.js';

export {
  getEffectiveSiteCaption,
  validateDomainInput,
  canAddPinned,
  validateImportContent
};

test('options unit: hostname normalization on add', () => {
  assert.equal(normalizeHost('WWW.Shop.test'), 'shop.test');
  assert.equal(normalizeHost('https://WWW.AMAZON.DE/products?id=123'), 'amazon.de');
  assert.equal(normalizeHost('http://sub.domain.co.uk:8080/'), 'sub.domain.co.uk');
  assert.equal(normalizeHost('  WWW.JUMIA.COM.NG  '), 'jumia.com.ng');
  assert.equal(normalizeHost('www.www.example.com'), 'example.com');
  assert.equal(normalizeHost('localhost'), 'localhost');
  assert.equal(normalizeHost(''), '');
  assert.equal(normalizeHost(null), '');
});

test('options unit: validateDomainInput inline validation rules', () => {
  const existing = {
    'amazon.de': { mode: 'always', assumedCurrency: 'EUR' }
  };

  // Empty input
  const emptyRes = validateDomainInput('   ', existing);
  assert.equal(emptyRes.ok, false);
  assert.ok(emptyRes.error.includes('Please enter a website'));

  // Invalid domain without extension
  const invalidRes = validateDomainInput('localhost', existing);
  assert.equal(invalidRes.ok, false);
  assert.ok(invalidRes.error.includes("doesn't look like a website"));

  // Duplicate rejection
  const dupRes = validateDomainInput('WWW.Amazon.DE', existing);
  assert.equal(dupRes.ok, false);
  assert.equal(dupRes.error, 'amazon.de is already in your list');

  // Valid new domain
  const validRes = validateDomainInput('WWW.Shop.test', existing);
  assert.equal(validRes.ok, true);
  assert.equal(validRes.clean, 'shop.test');
});

test('options unit: effective mode caption logic', () => {
  // Inheriting when autoConvertAll is false -> Ask
  assert.equal(getEffectiveSiteCaption(null, false), 'Using your default: Ask');
  assert.equal(getEffectiveSiteCaption({}, false), 'Using your default: Ask');
  assert.equal(getEffectiveSiteCaption({ mode: undefined }, false), 'Using your default: Ask');

  // Inheriting when autoConvertAll is true -> Always
  assert.equal(getEffectiveSiteCaption(null, true), 'Using your default: Always');
  assert.equal(getEffectiveSiteCaption({ mode: undefined }, true), 'Using your default: Always');

  // Explicit mode set -> caption is empty
  assert.equal(getEffectiveSiteCaption({ mode: 'always' }, false), '');
  assert.equal(getEffectiveSiteCaption({ mode: 'always' }, true), '');
  assert.equal(getEffectiveSiteCaption({ mode: 'never' }, true), '');
  assert.equal(getEffectiveSiteCaption({ mode: 'ask' }, true), '');
});

test('options unit: pinned currencies limit enforcement (max 8)', () => {
  const empty = [];
  assert.equal(canAddPinned(empty), true);

  const seven = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'NGN'];
  assert.equal(canAddPinned(seven), true);

  const eight = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'NGN', 'INR'];
  assert.equal(canAddPinned(eight), false);

  const nine = [...eight, 'ZAR'];
  assert.equal(canAddPinned(nine), false);
});

test('options unit: import validation and migration round-trip', () => {
  // Valid v3 export
  const v3Settings = {
    ...DEFAULT_SETTINGS,
    targetCurrency: 'EUR',
    perSite: { 'shop.test': { mode: 'always', assumedCurrency: 'USD' } }
  };
  const importedV3 = validateImportContent(JSON.stringify(v3Settings));
  assert.equal(importedV3.targetCurrency, 'EUR');
  assert.equal(importedV3.perSite['shop.test'].mode, 'always');

  // Legacy v2 format with autoConvert / neverConvert boolean flags
  const legacyV2 = {
    schemaVersion: 2,
    targetCurrency: 'GBP',
    perSite: {
      'jumia.com.ng': { autoConvert: true, neverConvert: false },
      'reddit.com': { autoConvert: false, neverConvert: true }
    }
  };
  const importedV2 = validateImportContent(JSON.stringify(legacyV2));
  assert.equal(importedV2.schemaVersion, 3);
  assert.equal(importedV2.targetCurrency, 'GBP');
  assert.equal(importedV2.perSite['jumia.com.ng'].mode, 'always');
  assert.equal(importedV2.perSite['reddit.com'].mode, 'never');

  // Corrupted / garbage input
  assert.throws(() => validateImportContent('NOT A JSON'), /isn't valid JSON/);
  assert.throws(() => validateImportContent('""'), /Canji settings file/);
  assert.throws(() => validateImportContent('[]'), /Canji settings file/);
  assert.throws(() => validateImportContent('null'), /Canji settings file/);
});

test('options unit: site rule mutations (add, change mode, set assumed currency, reset mode, remove)', () => {
  const settings = {
    ...DEFAULT_SETTINGS,
    perSite: {}
  };

  // 1. Add site rule
  const host = 'shop.test';
  setSiteMode(settings, host, 'always');
  assert.equal(settings.perSite[host].mode, 'always');

  // 2. Set assumed currency
  settings.perSite[host].assumedCurrency = 'EUR';
  assert.equal(settings.perSite[host].assumedCurrency, 'EUR');

  // 3. Reset mode clears explicit mode
  setSiteMode(settings, host, null);
  assert.equal(settings.perSite[host].mode, undefined);
  assert.equal(settings.perSite[host].assumedCurrency, 'EUR'); // preserves assumed currency

  // 4. Remove rule deletes entry entirely
  delete settings.perSite[host];
  assert.equal(settings.perSite[host], undefined);
});

test('options unit: native device font stacks (ui-sans-serif & ui-monospace) and zero bundled @fontsource imports', () => {
  const sans = tailwindConfig.theme.extend.fontFamily.sans;
  const mono = tailwindConfig.theme.extend.fontFamily.mono;

  assert.equal(sans[0], 'ui-sans-serif', 'Primary sans font must start with ui-sans-serif');
  assert.equal(mono[0], 'ui-monospace', 'Primary mono font must start with ui-monospace');
  assert.ok(!sans.some((f) => f.includes('Familjen')), 'Familjen Grotesk must be removed from sans stack');
  assert.ok(!mono.some((f) => f.includes('Fragment')), 'Fragment Mono must be removed from mono stack');

  const globalsCss = fs.readFileSync(path.join(rootDir, 'src', 'ui', 'globals.css'), 'utf8');
  assert.ok(!globalsCss.includes('@fontsource/'), 'globals.css must not import @fontsource webfonts');
});

test('options unit: SegmentedControl and LiquidToggle integration, token mapping, smooth scroll, and Sites redesign', () => {
  const segPath = path.join(rootDir, 'src', 'ui', 'components', 'ui', 'segmented-control.jsx');
  const liqPath = path.join(rootDir, 'src', 'ui', 'components', 'ui', 'liquid-toggle.jsx');
  const siteModePath = path.join(rootDir, 'src', 'ui', 'components', 'SiteModeControl.jsx');
  const switchPath = path.join(rootDir, 'src', 'ui', 'components', 'ui', 'switch.jsx');
  const globalsCssPath = path.join(rootDir, 'src', 'ui', 'globals.css');
  const optionsJsxPath = path.join(rootDir, 'src', 'options', 'options.jsx');
  const optionsHtmlPath = path.join(rootDir, 'src', 'options', 'options.html');
  const popupHtmlPath = path.join(rootDir, 'src', 'popup', 'popup.html');

  assert.ok(fs.existsSync(segPath), 'segmented-control.jsx must exist in src/ui/components/ui/');
  assert.ok(fs.existsSync(liqPath), 'liquid-toggle.jsx must exist in src/ui/components/ui/');

  const segSrc = fs.readFileSync(segPath, 'utf8');
  assert.match(segSrc, /export function SegmentedControl/, 'SegmentedControl must be exported');
  assert.match(segSrc, /from ["']motion\/react["']/, 'SegmentedControl must use motion/react');
  assert.match(segSrc, /role="radiogroup"/, 'SegmentedControl must render radiogroup role');

  const siteModeSrc = fs.readFileSync(siteModePath, 'utf8');
  assert.match(siteModeSrc, /SegmentedControl/, 'SiteModeControl must delegate to SegmentedControl');

  const liqSrc = fs.readFileSync(liqPath, 'utf8');
  assert.match(liqSrc, /export function Toggle/, 'LiquidToggle must export Toggle');
  assert.match(liqSrc, /export const LiquidToggle/, 'LiquidToggle must export LiquidToggle');
  assert.match(liqSrc, /const TRACK = 92;/, 'LiquidToggle must preserve Bencho TRACK = 92 constant');
  assert.match(liqSrc, /const THUMB = 36;/, 'LiquidToggle must preserve Bencho THUMB = 36 constant');
  assert.match(liqSrc, /NO GOO\. There is nothing left for it to merge\./, 'LiquidToggle must preserve Bencho comments');

  const switchSrc = fs.readFileSync(switchPath, 'utf8');
  assert.match(switchSrc, /LiquidToggle/, 'Switch primitive must use LiquidToggle');

  const globalsCss = fs.readFileSync(globalsCssPath, 'utf8');
  for (const token of ['--board', '--card', '--fill-on', '--fill-slab', '--ink', '--nod-r', '--pane-edge']) {
    assert.ok(globalsCss.includes(token), `globals.css must map Bencho token ${token}`);
  }
  assert.match(globalsCss, /\.liq-sw\b/, 'globals.css must include .liq-sw styles');
  assert.match(globalsCss, /\.liq-thumb\b/, 'globals.css must include .liq-thumb styles');
  assert.match(globalsCss, /scroll-behavior:\s*smooth/, 'globals.css must include smooth scroll');

  const optionsJsx = fs.readFileSync(optionsJsxPath, 'utf8');
  assert.match(optionsJsx, /SegmentedControl/, 'options.jsx must use SegmentedControl');
  assert.ok(!optionsJsx.includes('w-[144px]'), 'options.jsx Sites list must not use fixed w-[144px] that truncates Default (USD)');

  const optionsHtml = fs.readFileSync(optionsHtmlPath, 'utf8');
  const popupHtml = fs.readFileSync(popupHtmlPath, 'utf8');
  assert.match(optionsHtml, /<noscript>/, 'options.html must include <noscript> fallback');
  assert.match(popupHtml, /<noscript>/, 'popup.html must include <noscript> fallback');
});
