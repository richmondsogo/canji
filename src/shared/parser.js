// src/shared/parser.js
import {
  CURRENCIES_DATA,
  AMBIGUOUS_SYMBOLS,
  resolveAmbiguousSymbol,
  isAmbiguousSymbol
} from './currencies.js';

// Explicit unambiguous symbols/prefixes mapped directly to ISO code (longest first)
export const EXPLICIT_SYMBOL_MAP = {
  'CAD$': 'CAD',
  'CA$': 'CAD',
  'C$': 'CAD',
  'AUD$': 'AUD',
  'AU$': 'AUD',
  'A$': 'AUD',
  'NZ$': 'NZD',
  'HK$': 'HKD',
  'SG$': 'SGD',
  'S$': 'SGD',
  'US$': 'USD',
  'U.S.$': 'USD',
  'R$': 'BRL',
  'MX$': 'MXN',
  'Mex$': 'MXN',
  'COL$': 'COP',
  'CLP$': 'CLP',
  'AR$': 'ARS',
  'GH₵': 'GHS',
  'GHc': 'GHS',
  'KSh': 'KES',
  'Ksh': 'KES',
  'CHF': 'CHF',
  'SFr': 'CHF',
  'Fr.': 'CHF',
  '€': 'EUR',
  '₦': 'NGN',
  '₹': 'INR',
  '₩': 'KRW',
  'zł': 'PLN',
  'zl': 'PLN',
  'Kč': 'CZK',
  'Kc': 'CZK',
  'Ft': 'HUF',
  '₺': 'TRY',
  '₽': 'RUB',
  '₴': 'UAH',
  '₪': 'ILS',
  '฿': 'THB',
  '₫': 'VND',
  '₱': 'PHP',
  'RM': 'MYR',
  'Rp': 'IDR',
  '৳': 'BDT',
  'د.إ': 'AED',
  'ر.س': 'SAR',
  'ر.ق': 'QAR',
  'د.ب': 'BHD',
  'ر.ع.': 'OMR',
  'د.أ': 'JOD'
};

// Ambiguous symbols needing context resolution
export const AMBIGUOUS_SYMBOL_KEYS = ['$', '¥', 'kr', '£', 'Rs', 'Rs.', '₨', 'R', 'د.ك'];

// Common ISO 4217 currency codes
export const ISO_CODES = Object.keys(CURRENCIES_DATA);

// Pre-sorted explicit symbol keys (longest first) and pre-compiled ISO word-boundary regexes
export const EXPLICIT_SYMBOL_KEYS = Object.keys(EXPLICIT_SYMBOL_MAP).sort((a, b) => b.length - a.length);
const ISO_CODE_REGEX_ENTRIES = ISO_CODES.map((code) => [code, new RegExp(`\\b${code}\\b`)]);

const QUICK_CURRENCY_SYMBOL_RE = /[$€£¥₦₹₩₺₽₴₪฿₫₱৳₵₡₲₭₮₸₨]|د\.إ|ر\.س|ر\.ق|د\.ب|ر\.ع\.|د\.أ|د\.ك|(?:^|[^A-Za-z])(?:zł|zl|Kč|Kc|Ft|RM|Rp|Fr\.|SFr|GHc|KSh|Ksh|kr|Rs\.?)(?![A-Za-z])/i;
const CURRENCY_CODE_TOKEN_RE = /\b([A-Za-z]{3,5})\b/g;

/**
 * Fast check that returns true only if text contains a known currency symbol/prefix
 * or a valid ISO/crypto currency code.
 */
export function hasCurrencyMarker(text) {
  if (!text || typeof text !== 'string') return false;
  if (QUICK_CURRENCY_SYMBOL_RE.test(text)) return true;
  CURRENCY_CODE_TOKEN_RE.lastIndex = 0;
  let m;
  while ((m = CURRENCY_CODE_TOKEN_RE.exec(text)) !== null) {
    if (CURRENCIES_DATA[m[1].toUpperCase()]) return true;
  }
  return false;
}

/**
 * Fast O(1)-allocation pre-filter that returns true only if text contains at least one digit
 * AND either a known currency symbol/prefix or a valid ISO/crypto currency code.
 */
export function mightContainPrice(text) {
  if (!text || typeof text !== 'string' || !/\d/.test(text)) return false;
  return hasCurrencyMarker(text);
}

/**
 * Normalizes and parses numeric string with international conventions:
 * 1. Both comma and dot: whichever is last is decimal separator.
 * 2. Swiss apostrophe: 1'234.56
 * 3. Space separators: 1 234,56 / 1 234.56
 * 4. Only comma:
 *    - if ends with 1-2 digits (and not multiple commas): decimal
 *    - if 3 digits (e.g. 1,500): thousands
 * 5. Multiplier suffix: k/K (1e3), m/M (1e6), bn/b/B (1e9)
 */
export function parseNumberString(rawNum, multiplier = 1) {
  if (!rawNum) return null;
  let s = String(rawNum).trim();

  // Strip enclosing parentheses if negative, e.g. (15.00)
  s = s.replace(/^\((.+)\)$/, '$1');

  // Swiss apostrophes
  s = s.replace(/'/g, '');

  // Strip non-breaking spaces & normal spaces
  s = s.replace(/[\s\u00A0\u202F]+/g, '');

  if (s.includes(',') && s.includes('.')) {
    if (s.indexOf(',') < s.indexOf('.')) {
      // 1,234.56 -> comma is thousands, dot is decimal
      s = s.replace(/,/g, '');
    } else {
      // 1.234,56 -> dot is thousands, comma is decimal
      s = s.replace(/\./g, '').replace(',', '.');
    }
  } else if (s.includes(',')) {
    // Only comma
    const commaCount = (s.match(/,/g) || []).length;
    if (commaCount === 1 && (/,\d{1,2}$/.test(s) || /^-?0,\d+$/.test(s))) {
      // e.g. 149,50 or 15,5 or 0,500
      s = s.replace(',', '.');
    } else {
      // e.g. 1,500 or 1,000,000
      s = s.replace(/,/g, '');
    }
  } else if (s.includes('.')) {
    // Only dot
    const dotCount = (s.match(/\./g) || []).length;
    if (dotCount > 1) {
      // Multiple dots: e.g. 1.000.000
      s = s.replace(/\./g, '');
    }
  }

  const n = parseFloat(s);
  if (isNaN(n)) return null;

  const result = n * (multiplier || 1);
  return result;
}

const _pageCurrencyCache = new WeakMap();

/**
 * Determines the page's native currency before resolving ambiguous symbols:
 * 1. Meta tags (og:price:currency, product:price:currency, itemprop)
 * 2. JSON-LD scripts ("priceCurrency": "...")
 * 3. TLD & <html lang> heuristics (.ca -> CAD, .au -> AUD, .nz -> NZD, .sg -> SGD, .hk -> HKD, .uk -> GBP, .ng -> NGN, .jp -> JPY)
 */
export function inferPageCurrency(doc) {
  if (!doc) return null;
  if (_pageCurrencyCache.has(doc)) {
    return _pageCurrencyCache.get(doc);
  }

  let inferred = null;

  // 1. Meta tags
  try {
    const meta = doc.querySelector(
      'meta[property="og:price:currency"], meta[property="product:price:currency"], meta[itemprop="priceCurrency"], [itemprop="priceCurrency"]'
    );
    if (meta) {
      const val = meta.getAttribute('content') || meta.textContent;
      if (val && /^[A-Za-z]{3}$/.test(val.trim())) {
        inferred = val.trim().toUpperCase();
      }
    }
  } catch {}

  // 2. JSON-LD scripts
  if (!inferred) {
    try {
      const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
      for (const s of scripts) {
        const txt = s.textContent;
        if (txt && txt.includes('priceCurrency')) {
          const match = txt.match(/"priceCurrency"\s*:\s*"([A-Za-z]{3})"/i);
          if (match) {
            inferred = match[1].toUpperCase();
            break;
          }
        }
      }
    } catch {}
  }

  // 3. TLD & <html lang> heuristics
  if (!inferred) {
    const hostname = (doc.location && doc.location.hostname) ? doc.location.hostname.toLowerCase() : '';
    const lang = (doc.documentElement && doc.documentElement.lang) ? doc.documentElement.lang.trim().toLowerCase() : '';

    if (hostname.endsWith('.ca') || lang === 'en-ca' || lang === 'fr-ca' || lang.startsWith('en-ca') || lang.startsWith('fr-ca')) {
      inferred = 'CAD';
    } else if (hostname.endsWith('.com.au') || hostname.endsWith('.au') || lang === 'en-au' || lang.startsWith('en-au')) {
      inferred = 'AUD';
    } else if (hostname.endsWith('.co.nz') || hostname.endsWith('.nz') || lang === 'en-nz' || lang.startsWith('en-nz')) {
      inferred = 'NZD';
    } else if (hostname.endsWith('.sg') || lang === 'en-sg' || lang.startsWith('en-sg')) {
      inferred = 'SGD';
    } else if (hostname.endsWith('.hk') || lang === 'zh-hk' || lang.startsWith('zh-hk')) {
      inferred = 'HKD';
    } else if (hostname.endsWith('.co.uk') || hostname.endsWith('.uk') || lang === 'en-gb' || lang.startsWith('en-gb')) {
      inferred = 'GBP';
    } else if (hostname.endsWith('.ng') || lang === 'en-ng' || lang.startsWith('en-ng')) {
      inferred = 'NGN';
    } else if (hostname.endsWith('.jp') || lang === 'ja' || lang.startsWith('ja')) {
      inferred = 'JPY';
    }
  }

  _pageCurrencyCache.set(doc, inferred);
  try {
    doc.__cc_inferred_currency = inferred;
  } catch {}
  return inferred;
}

/**
 * Detect currency from string, using contextual hints for ambiguous symbols.
 */
export function detectCurrency(text, context = {}) {
  if (!text) return 'USD';

  const trimmed = text.trim();
  // Compound country-prefixed dollar symbols
  if (/^(?:US|U\.S\.)\s*\$$/i.test(trimmed)) return 'USD';
  if (/^(?:CA|CAD|C)\s*\$$/i.test(trimmed)) return 'CAD';
  if (/^(?:AU|AUD|A)\s*\$$/i.test(trimmed)) return 'AUD';
  if (/^(?:NZ|NZD)\s*\$$/i.test(trimmed)) return 'NZD';
  if (/^(?:HK|HKD)\s*\$$/i.test(trimmed)) return 'HKD';
  if (/^(?:SG|SGD|S)\s*\$$/i.test(trimmed)) return 'SGD';

  // 1. Check explicit multi-character and unambiguous symbols first (longest first)
  for (const sym of EXPLICIT_SYMBOL_KEYS) {
    if (text.includes(sym)) {
      return EXPLICIT_SYMBOL_MAP[sym];
    }
  }

  // 2. Check ISO 4217 codes with word boundaries
  const upper = text.toUpperCase();
  for (const [code, regex] of ISO_CODE_REGEX_ENTRIES) {
    if (regex.test(upper)) {
      return code;
    }
  }

  // 3. Check ambiguous symbols
  for (const sym of AMBIGUOUS_SYMBOL_KEYS) {
    if (text.includes(sym)) {
      return resolveAmbiguousSymbol(sym, context);
    }
  }

  // 4. If no symbol or code is found, check structured hint or site override or pageContextISO or TLD
  if (context.siteOverride) return context.siteOverride.toUpperCase();
  if (context.pageContextISO) return context.pageContextISO.toUpperCase();
  if (context.structuredHint) return context.structuredHint.toUpperCase();
  if (context.tld) {
    const tldCur = resolveAmbiguousSymbol('$', context);
    if (tldCur) return tldCur;
  }

  return 'USD';
}

/**
 * Backwards compatible extractAmount for v1 tests and context-menu selections.
 * Returns float amount or null.
 */
export function extractAmount(text) {
  if (!text) return null;

  // Filter out standalone percentage or zero
  if (/^\s*0(?:\.0+|,0+)?\s*$/.test(text)) return null;

  // Strip currency symbols and ISO codes
  let s = text
    .replace(/[£€₦₹₩¥₣$]/g, ' ')
    .replace(/\b[A-Z]{3}\b/g, ' ')
    .trim();

  // Extract first number sequence with optional separators
  const match = s.match(/\d[\d,. \u00A0\u202F']*/);
  if (!match) return null;

  const raw = match[0].trim();
  const n = parseNumberString(raw, 1);
  return n === null || isNaN(n) || n <= 0 ? null : n;
}

/**
 * High-precision regex pattern to match price tokens in webpage text.
 * Covers:
 * - Prefix symbols: $10, € 15, CA$99.99, ₦5,000, -$12.50, ($15.00)
 * - Suffix symbols: 15 €, 99.00 USD, 100 kr
 * - Multipliers: $1.5M, €2.5k, $10bn
 */
export function extractPrices(text, context = {}) {
  if (!text || typeof text !== 'string') return [];

  // Ignore text that has no digits or no currency-like token
  if (!mightContainPrice(text)) return [];

  const results = [];

  // Match multiplier suffix
  function getMultiplier(suffix) {
    if (!suffix) return 1;
    const s = suffix.toLowerCase().trim();
    if (s === 'k') return 1000;
    if (s === 'm') return 1000000;
    if (s === 'b' || s === 'bn') return 1000000000;
    return 1;
  }

  // Regex 1: Prefix currency symbol or code with optional country prefix and optional trailing ISO code:
  // e.g. from $10, -$12.50, ($15.00), (-$12.50), ₦ 14,500, € 15, CA$99.99, US $133.00, $25 CAD
  const prefixRegex = /(?:(\bfrom\s+)|(\()\s*(-)?|((?<!\d)-(?!\s)))?(\b(?:US|U\.S\.|CA|CAD|AU|AUD|NZ|NZD|HK|HKD|SG|SGD|Mex|COL|CLP|AR)\s*\$|CAD\$|CA\$|C\$|AUD\$|AU\$|A\$|NZ\$|HK\$|SG\$|S\$|US\$|U\.S\.\$|R\$|MX\$|Mex\$|COL\$|CLP\$|AR\$|GH₵|GHc|KSh|Ksh|CHF|SFr|Fr\.|€|£|¥|₦|₹|₩|zł|Kč|Ft|₺|₽|₴|₪|฿|₫|₱|RM|Rp|৳|\$|kr|\b[A-Z]{3}\b)\s*(\d(?:[\d,. \u00A0\u202F']*\d)?)(?:[\s\u00A0\u202F]*(k|m|b|bn)\b)?(\)?)(?:[\s\u00A0\u202F]+([A-Z]{3})\b)?/gi;

  // Regex 2: Suffix currency symbol or code:
  // e.g. 149,50 € / 100 kr / 99.00 USD
  const suffixRegex = /(?:(\bfrom\s+)|(\()\s*(-)?|((?<!\d)-(?!\s)))?(\d(?:[\d,. \u00A0\u202F']*\d)?)(?:[\s\u00A0\u202F]*(k|m|b|bn)\b)?\s*(CAD\$|CA\$|C\$|AUD\$|AU\$|A\$|NZ\$|HK\$|SG\$|S\$|US\$|U\.S\.\$|R\$|MX\$|Mex\$|COL\$|CLP\$|AR\$|GH₵|GHc|KSh|Ksh|CHF|SFr|Fr\.|€|£|¥|₦|₹|₩|zł|Kč|Ft|₺|₽|₴|₪|฿|₫|₱|RM|Rp|৳|\$|kr|\b[A-Z]{3}\b)(\)?)/gi;

  const matchedRanges = [];

  function isOverlapping(start, end) {
    return matchedRanges.some(([s, e]) => Math.max(start, s) < Math.min(end, e));
  }

  // Scan prefix matches
  let match;
  while ((match = prefixRegex.exec(text)) !== null) {
    let raw = match[0];
    const fromPrefix = match[1] || '';
    const openParen = match[2] || '';
    const minusInParen = match[3] || '';
    const minusNoParen = match[4] || '';
    const sym = match[5];
    const numPart = match[6];
    const multiplierSuffix = match[7] || '';
    const closeParen = match[8] || '';
    const trailingIso = match[9] || '';

    // If symbol is just a 3-letter word, verify it is a valid currency ISO code
    if (/^[A-Z]{3}$/i.test(sym) && !CURRENCIES_DATA[sym.toUpperCase()]) {
      continue;
    }

    let currency;
    if (trailingIso && CURRENCIES_DATA[trailingIso.toUpperCase()]) {
      // Trailing ISO code is authoritative and consumed together with the price
      currency = trailingIso.toUpperCase();
    } else {
      if (trailingIso) {
        // Trailing 3-letter word is not a valid currency (e.g. "OFF", "FOR", etc.)
        const lastIdx = raw.lastIndexOf(trailingIso);
        raw = raw.slice(0, lastIdx).trimEnd();
      }
      currency = detectCurrency(sym, context);
    }

    const multiplier = getMultiplier(multiplierSuffix);
    const amount = parseNumberString(numPart, multiplier);
    if (amount === null || isNaN(amount) || amount <= 0) continue;

    const isNegative = Boolean(minusInParen || minusNoParen || (openParen && closeParen));

    const startIndex = match.index;
    const endIndex = match.index + raw.length;
    prefixRegex.lastIndex = endIndex;

    if (!isOverlapping(startIndex, endIndex)) {
      matchedRanges.push([startIndex, endIndex]);
      results.push({
        startIndex,
        endIndex,
        raw,
        amount,
        currency,
        isNegative,
        symbolPosition: 'prefix',
        originalCurrencySymbol: sym,
        multiplier
      });
    }
  }

  // Scan suffix matches
  while ((match = suffixRegex.exec(text)) !== null) {
    const raw = match[0];
    const fromPrefix = match[1] || '';
    const openParen = match[2] || '';
    const minusInParen = match[3] || '';
    const minusNoParen = match[4] || '';
    const numPart = match[5];
    const multiplierSuffix = match[6] || '';
    const sym = match[7];
    const closeParen = match[8] || '';

    if (/^[A-Z]{3}$/i.test(sym) && !CURRENCIES_DATA[sym.toUpperCase()]) {
      continue;
    }

    // Ignore versions like "2.0.0 released"
    if (/^\d+\.\d+\.\d+$/.test(numPart.trim())) {
      continue;
    }

    const multiplier = getMultiplier(multiplierSuffix);
    const amount = parseNumberString(numPart, multiplier);
    if (amount === null || isNaN(amount) || amount <= 0) continue;

    const isNegative = Boolean(minusInParen || minusNoParen || (openParen && closeParen));
    const currency = detectCurrency(sym, context);

    const startIndex = match.index;
    const endIndex = match.index + raw.length;

    if (!isOverlapping(startIndex, endIndex)) {
      matchedRanges.push([startIndex, endIndex]);
      results.push({
        startIndex,
        endIndex,
        raw,
        amount,
        currency,
        isNegative,
        symbolPosition: 'suffix',
        originalCurrencySymbol: sym,
        multiplier
      });
    }
  }

  // Sort by startIndex
  results.sort((a, b) => a.startIndex - b.startIndex);
  return results;
}
