// src/shared/settings.js
export const SETTINGS_STORAGE_KEY = 'currency_converter_settings_v2';
export const CURRENT_SCHEMA_VERSION = 3;

export const DEFAULT_SETTINGS = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  targetCurrency: 'USD',
  // @deprecated since Step 06 - Automatic and menu conversions always use targetCurrency. Retained in schema for backward compatibility.
  lastUsedTarget: 'USD',
  pinnedCurrencies: ['NGN', 'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'INR'],
  displayMode: 'replace', // 'replace' | 'append' | 'replace_highlight'
  roundWhole: false,
  ambiguousDollar: 'USD',
  showCrypto: false,
  showInPageBar: true,
  autoConvertAll: false,
  theme: 'system', // 'system' | 'light' | 'dark'
  soundFeedback: false, // Rule a11y-toggle-setting: opt-in tactile audio
  perSite: {} // { [hostname]: { mode?: 'ask'|'always'|'never', assumedCurrency: string|null } }
};

const KNOWN_TWO_PART_TLDS = new Set([
  'co.uk', 'org.uk', 'gov.uk', 'ac.uk', 'me.uk', 'net.uk', 'ltd.uk', 'plc.uk',
  'com.au', 'net.au', 'org.au', 'edu.au', 'gov.au',
  'co.nz', 'net.nz', 'org.nz', 'govt.nz', 'ac.nz',
  'co.jp', 'ne.jp', 'or.jp', 'go.jp', 'ac.jp',
  'com.ng', 'org.ng', 'gov.ng', 'edu.ng', 'net.ng',
  'com.br', 'net.br', 'org.br', 'gov.br',
  'co.za', 'org.za', 'net.za', 'gov.za',
  'com.mx', 'org.mx', 'net.mx', 'edu.mx', 'gob.mx',
  'co.kr', 'ne.kr', 'or.kr', 're.kr', 'pe.kr', 'go.kr',
  'com.sg', 'net.sg', 'org.sg', 'gov.sg', 'edu.sg',
  'com.tr', 'net.tr', 'org.tr', 'edu.tr', 'gov.tr',
  'co.in', 'net.in', 'org.in', 'gen.in', 'firm.in', 'ind.in', 'ac.in', 'edu.in', 'res.in', 'gov.in',
  'com.hk', 'org.hk', 'net.hk', 'edu.hk', 'gov.hk',
  'com.tw', 'org.tw', 'net.tw', 'edu.tw', 'gov.tw',
  'com.my', 'net.my', 'org.my', 'gov.my', 'edu.my'
]);

/**
 * Normalizes hostnames: lowercase, trimmed, no protocol/path/port, no trailing dots, no leading 'www.'.
 */
export function normalizeHost(hostname) {
  if (typeof hostname !== 'string') return '';
  let host = hostname.trim().toLowerCase();
  if (!host) return '';
  // Strip protocol if present
  host = host.replace(/^[a-z]+:\/\//i, '');
  // Strip path, query, hash
  host = host.split(/[/?#]/)[0];
  // Strip port
  host = host.split(':')[0];
  // Strip trailing dots
  host = host.replace(/\.+$/, '');
  // Strip leading www.
  host = host.replace(/^(?:www\.)+/i, '');
  return host;
}

/**
 * Generates the lookup chain for a hostname: normalized host first,
 * then walking up parent domains while at least 2 non-TLD labels remain.
 */
export function getLookupHosts(hostname) {
  const normalized = normalizeHost(hostname);
  if (!normalized) return [];
  const hosts = [normalized];
  const parts = normalized.split('.');
  while (parts.length > 2) {
    parts.shift();
    const candidate = parts.join('.');
    if (parts.length === 2 && KNOWN_TWO_PART_TLDS.has(candidate)) {
      break;
    }
    hosts.push(candidate);
  }
  return hosts;
}

/**
 * Single source of truth lookup for effective site mode.
 * Returns { mode: 'ask'|'always'|'never', source: 'site'|'default', matchedKey: string|null }.
 */
export function getSiteMode(settings, hostname) {
  const s = settings || DEFAULT_SETTINGS;
  const defaultMode = s.autoConvertAll ? 'always' : 'ask';
  const lookupHosts = getLookupHosts(hostname);

  if (!lookupHosts.length || !s.perSite || typeof s.perSite !== 'object') {
    return { mode: defaultMode, source: 'default', matchedKey: null };
  }

  for (const key of lookupHosts) {
    const rule = s.perSite[key];
    if (rule && typeof rule === 'object') {
      const validModes = ['ask', 'always', 'never'];
      if (rule.mode && validModes.includes(rule.mode)) {
        return { mode: rule.mode, source: 'site', matchedKey: key };
      }
      // Rule matched but mode is absent or unknown: stop walk and inherit default
      return { mode: defaultMode, source: 'default', matchedKey: null };
    }
  }

  return { mode: defaultMode, source: 'default', matchedKey: null };
}

/**
 * Resolves effective source (assumed) and target currencies for a hostname.
 * Returns { assumedCurrency: string|null, targetCurrency: string, hasSiteTarget: boolean, matchedKey: string|null }.
 */
export function getSiteCurrencies(settings, hostname) {
  const s = settings || DEFAULT_SETTINGS;
  const defaultTarget = s.targetCurrency || DEFAULT_SETTINGS.targetCurrency || 'USD';
  const lookupHosts = getLookupHosts(hostname);

  if (!lookupHosts.length || !s.perSite || typeof s.perSite !== 'object') {
    return {
      assumedCurrency: null,
      targetCurrency: defaultTarget,
      hasSiteTarget: false,
      matchedKey: null
    };
  }

  for (const key of lookupHosts) {
    const rule = s.perSite[key];
    if (rule && typeof rule === 'object') {
      const assumedCurrency = typeof rule.assumedCurrency === 'string' && rule.assumedCurrency
        ? rule.assumedCurrency
        : null;
      const hasSiteTarget = typeof rule.targetCurrency === 'string' && Boolean(rule.targetCurrency);
      const targetCurrency = hasSiteTarget ? rule.targetCurrency : defaultTarget;
      return {
        assumedCurrency,
        targetCurrency,
        hasSiteTarget,
        matchedKey: key
      };
    }
  }

  return {
    assumedCurrency: null,
    targetCurrency: defaultTarget,
    hasSiteTarget: false,
    matchedKey: null
  };
}

/**
 * Updates or clears the mode for a given hostname in a settings object.
 * Passing mode=null removes the mode but preserves assumedCurrency and targetCurrency;
 * the rule is deleted only if nothing remains.
 */
export function setSiteMode(settings, hostname, mode) {
  if (!settings || typeof settings !== 'object') return settings;
  const normalized = normalizeHost(hostname);
  if (!normalized) return settings;

  if (!settings.perSite || typeof settings.perSite !== 'object') {
    settings.perSite = {};
  }

  const validModes = ['ask', 'always', 'never'];
  const cleanMode = validModes.includes(mode) ? mode : null;
  const existingRule = settings.perSite[normalized] || {};
  const assumedCurrency = existingRule.assumedCurrency || null;
  const targetCurrency = existingRule.targetCurrency || null;

  if (cleanMode === null) {
    if (assumedCurrency || targetCurrency) {
      const nextRule = { assumedCurrency };
      if (targetCurrency) nextRule.targetCurrency = targetCurrency;
      settings.perSite[normalized] = nextRule;
    } else {
      delete settings.perSite[normalized];
    }
  } else {
    const nextRule = {
      mode: cleanMode,
      assumedCurrency
    };
    if (targetCurrency) nextRule.targetCurrency = targetCurrency;
    settings.perSite[normalized] = nextRule;
  }

  return settings;
}

/**
 * Pure decision function for automatic page conversion.
 */
export function shouldAutoConvertPage(settings, hostname) {
  const { mode } = getSiteMode(settings, hostname);
  return mode === 'always';
}

function mergeSiteModes(modeA, modeB) {
  if (modeA === 'never' || modeB === 'never') return 'never';
  if (modeA === 'always' || modeB === 'always') return 'always';
  if (modeA === 'ask' || modeB === 'ask') return 'ask';
  return undefined;
}

/**
 * Validates and migrates settings from previous versions (v1, v2) or empty state to v3.
 * Idempotent: migrateSettings(migrateSettings(x)) deep-equals migrateSettings(x).
 */
export function migrateSettings(raw) {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_SETTINGS };
  }

  // Version 3 current
  if (raw.schemaVersion === CURRENT_SCHEMA_VERSION) {
    const migratedPerSite = {};
    for (const [k, r] of Object.entries(raw.perSite || {})) {
      const normKey = normalizeHost(k);
      if (!normKey) continue;
      const validModes = ['ask', 'always', 'never'];
      const mode = validModes.includes(r?.mode) ? r.mode : undefined;
      const assumedCurrency = r?.assumedCurrency || null;
      const targetCurrency = typeof r?.targetCurrency === 'string' && r.targetCurrency ? r.targetCurrency : undefined;
      if (mode !== undefined || assumedCurrency !== null || targetCurrency !== undefined) {
        if (migratedPerSite[normKey]) {
          const existing = migratedPerSite[normKey];
          const mergedMode = mergeSiteModes(existing.mode, mode);
          const mergedCurrency = existing.assumedCurrency || assumedCurrency;
          const mergedTarget = existing.targetCurrency || targetCurrency;
          const entry = mergedMode !== undefined
            ? { mode: mergedMode, assumedCurrency: mergedCurrency }
            : { assumedCurrency: mergedCurrency };
          if (mergedTarget) entry.targetCurrency = mergedTarget;
          migratedPerSite[normKey] = entry;
        } else {
          const entry = mode !== undefined
            ? { mode, assumedCurrency }
            : { assumedCurrency };
          if (targetCurrency) entry.targetCurrency = targetCurrency;
          migratedPerSite[normKey] = entry;
        }
      }
    }
    return {
      ...DEFAULT_SETTINGS,
      ...raw,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      perSite: migratedPerSite
    };
  }

  // Version 1 or 2 or unversioned migration -> Version 3
  const migratedPerSite = {};
  for (const [k, r] of Object.entries(raw.perSite || {})) {
    const normKey = normalizeHost(k);
    if (!normKey) continue;

    let mode;
    if (r && typeof r === 'object') {
      if (r.mode && ['ask', 'always', 'never'].includes(r.mode)) {
        mode = r.mode;
      } else if (r.autoConvert && r.neverConvert) {
        mode = 'never'; // Contradictory flags: conservative choice
      } else if (r.autoConvert) {
        mode = 'always';
      } else if (r.neverConvert) {
        mode = 'never';
      } else {
        mode = undefined; // Neither flag true: leave mode absent
      }
    } else {
      mode = undefined;
    }

    const assumedCurrency = (r && r.assumedCurrency) || null;
    const targetCurrency = (r && typeof r.targetCurrency === 'string' && r.targetCurrency) ? r.targetCurrency : undefined;

    if (mode !== undefined || assumedCurrency !== null || targetCurrency !== undefined) {
      if (migratedPerSite[normKey]) {
        const existing = migratedPerSite[normKey];
        const mergedMode = mergeSiteModes(existing.mode, mode);
        const mergedCurrency = existing.assumedCurrency || assumedCurrency;
        const mergedTarget = existing.targetCurrency || targetCurrency;
        const entry = mergedMode !== undefined
          ? { mode: mergedMode, assumedCurrency: mergedCurrency }
          : { assumedCurrency: mergedCurrency };
        if (mergedTarget) entry.targetCurrency = mergedTarget;
        migratedPerSite[normKey] = entry;
      } else {
        const entry = mode !== undefined
          ? { mode, assumedCurrency }
          : { assumedCurrency };
        if (targetCurrency) entry.targetCurrency = targetCurrency;
        migratedPerSite[normKey] = entry;
      }
    }
  }

  const migrated = {
    ...DEFAULT_SETTINGS,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    targetCurrency: raw.targetCurrency || DEFAULT_SETTINGS.targetCurrency,
    lastUsedTarget: raw.lastUsedTarget || raw.targetCurrency || DEFAULT_SETTINGS.lastUsedTarget,
    pinnedCurrencies: Array.isArray(raw.pinnedCurrencies) && raw.pinnedCurrencies.length > 0
      ? raw.pinnedCurrencies.slice(0, 8)
      : [...DEFAULT_SETTINGS.pinnedCurrencies],
    displayMode: ['replace', 'append', 'replace_highlight'].includes(raw.displayMode)
      ? raw.displayMode
      : DEFAULT_SETTINGS.displayMode,
    roundWhole: Boolean(raw.roundWhole),
    ambiguousDollar: raw.ambiguousDollar || DEFAULT_SETTINGS.ambiguousDollar,
    showCrypto: Boolean(raw.showCrypto),
    showInPageBar: raw.showInPageBar !== undefined ? Boolean(raw.showInPageBar) : DEFAULT_SETTINGS.showInPageBar,
    autoConvertAll: Boolean(raw.autoConvertAll),
    theme: ['system', 'light', 'dark'].includes(raw.theme) ? raw.theme : DEFAULT_SETTINGS.theme,
    perSite: migratedPerSite
  };

  return migrated;
}

export function validateSettings(settings) {
  const s = migrateSettings(settings);
  if (s.pinnedCurrencies.length > 8) {
    s.pinnedCurrencies = s.pinnedCurrencies.slice(0, 8);
  }
  return s;
}

export class SettingsManager {
  constructor({ storage = null } = {}) {
    this.storage = storage || this._resolveBrowserStorage();
  }

  _resolveBrowserStorage() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      return chrome.storage.local;
    }
    if (typeof browser !== 'undefined' && browser.storage && browser.storage.local) {
      return browser.storage.local;
    }
    const mem = {};
    return {
      get: async (k) => (typeof k === 'string' ? { [k]: mem[k] } : mem),
      set: async (obj) => Object.assign(mem, obj)
    };
  }

  async getSettings() {
    try {
      const data = await this.storage.get(SETTINGS_STORAGE_KEY);
      return migrateSettings(data ? data[SETTINGS_STORAGE_KEY] : null);
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  async updateSettings(partial) {
    const current = await this.getSettings();
    const updated = validateSettings({
      ...current,
      ...partial
    });
    await this.storage.set({ [SETTINGS_STORAGE_KEY]: updated });
    try {
      if (typeof localStorage !== 'undefined' && updated.theme) {
        localStorage.setItem('currency_converter_theme', updated.theme);
      }
    } catch {}
    return updated;
  }

  async setSiteRule(hostname, rule) {
    if (!hostname) return;
    const normalized = normalizeHost(hostname);
    const current = await this.getSettings();
    const perSite = { ...current.perSite };
    perSite[normalized] = {
      ...(perSite[normalized] || {}),
      ...rule
    };
    return this.updateSettings({ perSite });
  }

  async setSiteMode(hostname, mode) {
    if (!hostname) return;
    const current = await this.getSettings();
    setSiteMode(current, hostname, mode);
    return this.updateSettings({ perSite: current.perSite });
  }

  async getSiteMode(hostname) {
    if (!hostname) return { mode: 'ask', source: 'default', matchedKey: null };
    const settings = await this.getSettings();
    return getSiteMode(settings, hostname);
  }

  async getSiteRule(hostname) {
    if (!hostname) return null;
    const normalized = normalizeHost(hostname);
    const settings = await this.getSettings();
    return settings.perSite[normalized] || null;
  }

  async removeSiteRule(hostname) {
    if (!hostname) return;
    const normalized = normalizeHost(hostname);
    const current = await this.getSettings();
    const perSite = { ...current.perSite };
    delete perSite[normalized];
    return this.updateSettings({ perSite });
  }

  async resetDefaults() {
    await this.storage.set({ [SETTINGS_STORAGE_KEY]: { ...DEFAULT_SETTINGS } });
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('currency_converter_theme', DEFAULT_SETTINGS.theme);
      }
    } catch {}
    return { ...DEFAULT_SETTINGS };
  }

  async exportJson() {
    const settings = await this.getSettings();
    return JSON.stringify(settings, null, 2);
  }

  async importJson(jsonString) {
    const parsed = JSON.parse(jsonString);
    const validated = validateSettings(parsed);
    await this.storage.set({ [SETTINGS_STORAGE_KEY]: validated });
    try {
      if (typeof localStorage !== 'undefined' && validated.theme) {
        localStorage.setItem('currency_converter_theme', validated.theme);
      }
    } catch {}
    return validated;
  }
}
