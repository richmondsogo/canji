import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_SETTINGS,
  CURRENT_SCHEMA_VERSION,
  migrateSettings,
  validateSettings,
  SettingsManager,
  normalizeHost,
  getLookupHosts,
  getSiteMode,
  getSiteCurrencies,
  setSiteMode,
  shouldAutoConvertPage
} from '../src/shared/settings.js';

// Mock storage for settings
class MockStorage {
  constructor(initialData = {}) {
    this.data = { ...initialData };
  }
  async get(keys) {
    if (typeof keys === 'string') return { [keys]: this.data[keys] };
    const res = {};
    for (const k of keys) {
      if (this.data[k] !== undefined) res[k] = this.data[k];
    }
    return res;
  }
  async set(obj) {
    Object.assign(this.data, obj);
  }
}

test('settings: default settings schema', () => {
  assert.equal(DEFAULT_SETTINGS.schemaVersion, 3);
  assert.equal(DEFAULT_SETTINGS.targetCurrency, 'USD');
  assert.deepEqual(DEFAULT_SETTINGS.pinnedCurrencies, [
    'NGN', 'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'INR'
  ]);
  assert.equal(DEFAULT_SETTINGS.displayMode, 'replace');
  assert.equal(DEFAULT_SETTINGS.roundWhole, false);
  assert.equal(DEFAULT_SETTINGS.showCrypto, false);
  assert.equal(DEFAULT_SETTINGS.ambiguousDollar, 'USD');
  assert.equal(DEFAULT_SETTINGS.showInPageBar, true);
  assert.equal(DEFAULT_SETTINGS.theme, 'system');
  assert.deepEqual(DEFAULT_SETTINGS.perSite, {});
});

test('settings: migration matrix', () => {
  const v2Raw = {
    schemaVersion: 2,
    targetCurrency: 'USD',
    perSite: {
      'always.com': { autoConvert: true, neverConvert: false },
      'never.com': { autoConvert: false, neverConvert: true },
      'both.com': { autoConvert: true, neverConvert: true },
      'currency-only.com': { autoConvert: false, neverConvert: false, assumedCurrency: 'CAD' },
      'empty-flags.com': { autoConvert: false, neverConvert: false },
      'www.collision.com': { autoConvert: true },
      'collision.com': { neverConvert: true }
    }
  };

  const migrated = migrateSettings(v2Raw);
  assert.equal(migrated.schemaVersion, 3);

  // always-only -> mode 'always'
  assert.deepEqual(migrated.perSite['always.com'], { mode: 'always', assumedCurrency: null });

  // never-only -> mode 'never'
  assert.deepEqual(migrated.perSite['never.com'], { mode: 'never', assumedCurrency: null });

  // both-true (contradictory) -> conservative choice mode 'never'
  assert.deepEqual(migrated.perSite['both.com'], { mode: 'never', assumedCurrency: null });

  // neither with assumedCurrency -> mode absent, assumedCurrency preserved
  assert.equal(migrated.perSite['currency-only.com'].mode, undefined);
  assert.equal(migrated.perSite['currency-only.com'].assumedCurrency, 'CAD');

  // neither without assumedCurrency -> rule dropped (not retained in perSite)
  assert.equal(migrated.perSite['empty-flags.com'], undefined);

  // collision on normalized host: www.collision.com ('always') vs collision.com ('never') -> 'never' beats 'always'
  assert.equal(migrated.perSite['collision.com'].mode, 'never');

  // empty perSite
  const migratedEmpty = migrateSettings({ perSite: {} });
  assert.deepEqual(migratedEmpty.perSite, {});

  // unversioned / v1 migration
  const v1Data = { targetCurrency: 'EUR' };
  const migratedV1 = migrateSettings(v1Data);
  assert.equal(migratedV1.schemaVersion, 3);
  assert.equal(migratedV1.targetCurrency, 'EUR');

  // already-v3 untouched
  const v3Data = {
    schemaVersion: 3,
    targetCurrency: 'GBP',
    perSite: {
      'store.com': { mode: 'always', assumedCurrency: 'USD' }
    }
  };
  const migratedV3 = migrateSettings(v3Data);
  assert.equal(migratedV3.schemaVersion, 3);
  assert.deepEqual(migratedV3.perSite['store.com'], { mode: 'always', assumedCurrency: 'USD' });
});

test('settings: idempotency of migration', () => {
  const v2Data = {
    schemaVersion: 2,
    targetCurrency: 'USD',
    perSite: {
      'shop.com': { autoConvert: true },
      'bank.com': { neverConvert: true, assumedCurrency: 'EUR' },
      'info.com': { assumedCurrency: 'CAD' }
    }
  };

  const pass1 = migrateSettings(v2Data);
  const pass2 = migrateSettings(pass1);
  assert.deepEqual(pass2, pass1);

  const pass3 = migrateSettings(migrateSettings(pass2));
  assert.deepEqual(pass3, pass1);
});

test('settings: import of v2 export JSON yields v3', async () => {
  const v2ExportJson = JSON.stringify({
    schemaVersion: 2,
    targetCurrency: 'EUR',
    perSite: {
      'amazon.de': { autoConvert: true, assumedCurrency: 'EUR' },
      'bank.de': { neverConvert: true }
    }
  });

  const storage = new MockStorage();
  const manager = new SettingsManager({ storage });
  await manager.importJson(v2ExportJson);

  const settings = await manager.getSettings();
  assert.equal(settings.schemaVersion, 3);
  assert.equal(settings.targetCurrency, 'EUR');
  assert.deepEqual(settings.perSite['amazon.de'], { mode: 'always', assumedCurrency: 'EUR' });
  assert.deepEqual(settings.perSite['bank.de'], { mode: 'never', assumedCurrency: null });
});

test('settings: getSiteMode resolution', () => {
  const settings = {
    schemaVersion: 3,
    autoConvertAll: false,
    perSite: {
      'ebay.com': { mode: 'always', assumedCurrency: null },
      'amazon.com': { mode: 'ask', assumedCurrency: null },
      'bank.com': { mode: 'never', assumedCurrency: null },
      'store.com': { assumedCurrency: 'EUR' }, // mode absent
      'malformed.com': { mode: 'UNKNOWN_VAL', assumedCurrency: null }
    }
  };

  // 1. Exact host
  assert.deepEqual(getSiteMode(settings, 'ebay.com'), {
    mode: 'always',
    source: 'site',
    matchedKey: 'ebay.com'
  });

  // 2. www host normalized to exact host
  assert.deepEqual(getSiteMode(settings, 'www.ebay.com'), {
    mode: 'always',
    source: 'site',
    matchedKey: 'ebay.com'
  });

  // 3. Subdomain walk-up: shop.deals.ebay.com -> ebay.com
  assert.deepEqual(getSiteMode(settings, 'shop.deals.ebay.com'), {
    mode: 'always',
    source: 'site',
    matchedKey: 'ebay.com'
  });

  // 4. Unrelated host with autoConvertAll false -> default mode 'ask'
  assert.deepEqual(getSiteMode(settings, 'wikipedia.org'), {
    mode: 'ask',
    source: 'default',
    matchedKey: null
  });

  // 5. Unrelated host with autoConvertAll true -> default mode 'always'
  const settingsAutoAll = { ...settings, autoConvertAll: true };
  assert.deepEqual(getSiteMode(settingsAutoAll, 'wikipedia.org'), {
    mode: 'always',
    source: 'default',
    matchedKey: null
  });

  // 6. Rule with absent mode + autoConvertAll true -> inherits default 'always'
  assert.deepEqual(getSiteMode(settingsAutoAll, 'store.com'), {
    mode: 'always',
    source: 'default',
    matchedKey: null
  });

  // 7. Rule with absent mode + autoConvertAll false -> inherits default 'ask'
  assert.deepEqual(getSiteMode(settings, 'store.com'), {
    mode: 'ask',
    source: 'default',
    matchedKey: null
  });

  // 8. Explicit 'ask' beating autoConvertAll true
  assert.deepEqual(getSiteMode(settingsAutoAll, 'amazon.com'), {
    mode: 'ask',
    source: 'site',
    matchedKey: 'amazon.com'
  });

  // 9. Malformed mode treated as absent -> inherits default
  assert.deepEqual(getSiteMode(settings, 'malformed.com'), {
    mode: 'ask',
    source: 'default',
    matchedKey: null
  });
});

test('settings: hostname normalization and edge cases', () => {
  // Uppercase and trailing dots
  assert.equal(normalizeHost('EBAY.COM'), 'ebay.com');
  assert.equal(normalizeHost('ebay.com.'), 'ebay.com');
  assert.equal(normalizeHost('https://www.Ebay.com./items?x=1'), 'ebay.com');
  assert.equal(normalizeHost('www.www.store.com'), 'store.com');

  // getLookupHosts
  assert.deepEqual(getLookupHosts('shop.ebay.com'), ['shop.ebay.com', 'ebay.com']);
  assert.deepEqual(getLookupHosts('a.b.ebay.com'), ['a.b.ebay.com', 'b.ebay.com', 'ebay.com']);

  // "co.uk" is never matched as a parent
  const ukHosts = getLookupHosts('shop.ebay.co.uk');
  assert.deepEqual(ukHosts, ['shop.ebay.co.uk', 'ebay.co.uk']);
  assert.ok(!ukHosts.includes('co.uk'), 'co.uk must never be in lookup hosts');

  const settingsWithCoUk = {
    schemaVersion: 3,
    autoConvertAll: false,
    perSite: {
      'co.uk': { mode: 'always', assumedCurrency: null },
      'ebay.co.uk': { mode: 'never', assumedCurrency: null }
    }
  };

  // shop.ebay.co.uk stops at ebay.co.uk and never matches co.uk
  assert.deepEqual(getSiteMode(settingsWithCoUk, 'shop.ebay.co.uk'), {
    mode: 'never',
    source: 'site',
    matchedKey: 'ebay.co.uk'
  });

  // other.co.uk does not match co.uk as a parent
  assert.deepEqual(getSiteMode(settingsWithCoUk, 'other.co.uk'), {
    mode: 'ask',
    source: 'default',
    matchedKey: null
  });
});

test('settings: background-logic shouldAutoConvertPage matches old behavior', () => {
  // 1. always rule: auto-converts
  const sAlways = {
    schemaVersion: 3,
    autoConvertAll: false,
    perSite: { 'site.com': { mode: 'always' } }
  };
  assert.equal(shouldAutoConvertPage(sAlways, 'site.com'), true);
  assert.equal(shouldAutoConvertPage(sAlways, 'www.site.com'), true);

  // 2. never rule: does not auto-convert
  const sNever = {
    schemaVersion: 3,
    autoConvertAll: false,
    perSite: { 'site.com': { mode: 'never' } }
  };
  assert.equal(shouldAutoConvertPage(sNever, 'site.com'), false);

  // 3. no rule + autoConvertAll true: auto-converts
  const sAutoAll = {
    schemaVersion: 3,
    autoConvertAll: true,
    perSite: {}
  };
  assert.equal(shouldAutoConvertPage(sAutoAll, 'site.com'), true);

  // 4. no rule + autoConvertAll false: does not auto-convert
  const sNoAuto = {
    schemaVersion: 3,
    autoConvertAll: false,
    perSite: {}
  };
  assert.equal(shouldAutoConvertPage(sNoAuto, 'site.com'), false);

  // 5. never rule + autoConvertAll true: does not auto-convert (never wins)
  const sNeverAutoAll = {
    schemaVersion: 3,
    autoConvertAll: true,
    perSite: { 'site.com': { mode: 'never' } }
  };
  assert.equal(shouldAutoConvertPage(sNeverAutoAll, 'site.com'), false);

  // 6. ask rule + autoConvertAll true: does not auto-convert (ask suppresses global always)
  const sAskAutoAll = {
    schemaVersion: 3,
    autoConvertAll: true,
    perSite: { 'site.com': { mode: 'ask' } }
  };
  assert.equal(shouldAutoConvertPage(sAskAutoAll, 'site.com'), false);
});

test('settings: setSiteMode mutation and removal', () => {
  const settings = {
    schemaVersion: 3,
    perSite: {}
  };

  // Set mode 'always'
  setSiteMode(settings, 'www.ebay.com', 'always');
  assert.deepEqual(settings.perSite['ebay.com'], { mode: 'always', assumedCurrency: null });

  // Update with assumedCurrency preserved
  settings.perSite['ebay.com'].assumedCurrency = 'GBP';
  setSiteMode(settings, 'ebay.com', 'never');
  assert.deepEqual(settings.perSite['ebay.com'], { mode: 'never', assumedCurrency: 'GBP' });

  // Set mode null preserves assumedCurrency
  setSiteMode(settings, 'ebay.com', null);
  assert.deepEqual(settings.perSite['ebay.com'], { assumedCurrency: 'GBP' });

  // Set mode null when assumedCurrency is null removes rule entirely
  setSiteMode(settings, 'amazon.com', 'ask');
  assert.ok(settings.perSite['amazon.com']);
  setSiteMode(settings, 'amazon.com', null);
  assert.equal(settings.perSite['amazon.com'], undefined);
});

test('settings: SettingsManager load, save, setSiteMode, and perSite overrides', async () => {
  const storage = new MockStorage();
  const manager = new SettingsManager({ storage });

  const initial = await manager.getSettings();
  assert.equal(initial.targetCurrency, 'USD');

  // Update target currency
  await manager.updateSettings({ targetCurrency: 'NGN', roundWhole: true });
  const updated = await manager.getSettings();
  assert.equal(updated.targetCurrency, 'NGN');
  assert.equal(updated.roundWhole, true);

  // setSiteMode on manager
  await manager.setSiteMode('amazon.ca', 'always');
  const siteRule = await manager.getSiteRule('amazon.ca');
  assert.equal(siteRule.mode, 'always');

  const siteMode = await manager.getSiteMode('www.amazon.ca');
  assert.equal(siteMode.mode, 'always');
  assert.equal(siteMode.source, 'site');

  // Remove site rule
  await manager.removeSiteRule('amazon.ca');
  const removedRule = await manager.getSiteRule('amazon.ca');
  assert.equal(removedRule, null);
});

test('settings: getSiteCurrencies and per-site targetCurrency persistence', () => {
  const settings = migrateSettings({
    schemaVersion: 3,
    targetCurrency: 'USD',
    perSite: {
      'ebay.com': { mode: 'always', assumedCurrency: 'GBP', targetCurrency: 'NGN' },
      'shop.test': { assumedCurrency: null, targetCurrency: 'EUR' }
    }
  });

  assert.deepEqual(settings.perSite['ebay.com'], {
    mode: 'always',
    assumedCurrency: 'GBP',
    targetCurrency: 'NGN'
  });
  assert.deepEqual(settings.perSite['shop.test'], {
    assumedCurrency: null,
    targetCurrency: 'EUR'
  });

  const ebayCurrencies = getSiteCurrencies(settings, 'www.ebay.com');
  assert.deepEqual(ebayCurrencies, {
    assumedCurrency: 'GBP',
    targetCurrency: 'NGN',
    hasSiteTarget: true,
    matchedKey: 'ebay.com'
  });

  const shopCurrencies = getSiteCurrencies(settings, 'shop.test');
  assert.deepEqual(shopCurrencies, {
    assumedCurrency: null,
    targetCurrency: 'EUR',
    hasSiteTarget: true,
    matchedKey: 'shop.test'
  });

  const defaultCurrencies = getSiteCurrencies(settings, 'other.com');
  assert.deepEqual(defaultCurrencies, {
    assumedCurrency: null,
    targetCurrency: 'USD',
    hasSiteTarget: false,
    matchedKey: null
  });

  // setSiteMode preserves targetCurrency when resetting mode
  setSiteMode(settings, 'ebay.com', null);
  assert.deepEqual(settings.perSite['ebay.com'], {
    assumedCurrency: 'GBP',
    targetCurrency: 'NGN'
  });
});

