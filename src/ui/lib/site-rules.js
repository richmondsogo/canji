// src/ui/lib/site-rules.js
import { normalizeHost, migrateSettings } from '../../shared/settings.js';

/**
 * Returns effective site caption when inheriting default mode, or empty string if explicit mode is set.
 * @param {object|null|undefined} rule 
 * @param {boolean} autoConvertAll 
 * @returns {string}
 */
export function getEffectiveSiteCaption(rule, autoConvertAll) {
  if (!rule || !rule.mode) {
    return `Using your default: ${autoConvertAll ? 'Always' : 'Ask'}`;
  }
  return '';
}

/**
 * Validates domain input for adding a custom site rule.
 * @param {string} rawDomain 
 * @param {object} existingPerSite 
 * @returns {{ ok: boolean, clean?: string, error?: string }}
 */
export function validateDomainInput(rawDomain, existingPerSite = {}) {
  const trimmed = typeof rawDomain === 'string' ? rawDomain.trim() : '';
  if (!trimmed) {
    return { ok: false, error: 'Please enter a website (e.g. amazon.de)' };
  }
  const clean = normalizeHost(trimmed);
  if (!clean || !clean.includes('.')) {
    return { ok: false, error: "That doesn't look like a website. Try something like amazon.de." };
  }
  if (existingPerSite && existingPerSite[clean]) {
    return { ok: false, error: `${clean} is already in your list` };
  }
  return { ok: true, clean };
}

/**
 * Checks if more currencies can be pinned (max 8).
 * @param {string[]} pinnedCurrencies 
 * @returns {boolean}
 */
export function canAddPinned(pinnedCurrencies) {
  if (!Array.isArray(pinnedCurrencies)) return true;
  return pinnedCurrencies.length < 8;
}

/**
 * Validates JSON content for settings import.
 * @param {string} rawText 
 * @returns {object} Validated migrated settings
 */
export function validateImportContent(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('That file is empty.');
  }
  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch (err) {
    throw new Error("That file isn't valid JSON.");
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error("That doesn't look like a Canji settings file.");
  }
  return migrateSettings(parsed);
}
