// src/popup/popup-errors.js

export const ERROR_CLASSES = {
  RESTRICTED_PAGE: 'restricted_page',
  NO_HOST_PERMISSION: 'no_host_permission',
  CONTENT_SCRIPT_UNREACHABLE: 'content_script_unreachable',
  RATES_UNAVAILABLE: 'rates_unavailable',
  UNKNOWN: 'unknown'
};

export const ERROR_MESSAGES = {
  [ERROR_CLASSES.RESTRICTED_PAGE]: "Canji can't convert prices on browser or store pages.",
  [ERROR_CLASSES.NO_HOST_PERMISSION]: 'Canji needs access to this site. Open Settings, then Sites, to allow it.',
  [ERROR_CLASSES.CONTENT_SCRIPT_UNREACHABLE]: "Couldn't reach this page. Try reloading the tab.",
  [ERROR_CLASSES.RATES_UNAVAILABLE]: "Couldn't load exchange rates. Check your internet connection."
};

/**
 * Pure mapping function from error class or error object to human-readable message.
 */
export function getConversionErrorMessage(errorClass, customMessage = null) {
  if (customMessage) return customMessage;
  return ERROR_MESSAGES[errorClass] || 'Something went wrong. Please try again.';
}

/**
 * Classifies a runtime error into a known failure class.
 */
export function classifyConversionError({ isRestricted, hasHostPermission, ratesAvailable, hasResponse, rawError }) {
  if (isRestricted) return ERROR_CLASSES.RESTRICTED_PAGE;
  if (hasHostPermission === false) return ERROR_CLASSES.NO_HOST_PERMISSION;
  if (ratesAvailable === false) return ERROR_CLASSES.RATES_UNAVAILABLE;
  if (!hasResponse) return ERROR_CLASSES.CONTENT_SCRIPT_UNREACHABLE;
  return ERROR_CLASSES.UNKNOWN;
}

/**
 * Checks whether a given URL is a browser internal or restricted store page.
 */
export function isRestrictedPage(url) {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return (
      trimmed.includes('chromewebstore.google.com') ||
      trimmed.includes('addons.mozilla.org')
    );
  }
  return (
    /^(chrome|edge|brave|about|moz-extension|chrome-extension|view-source|chrome-error):/i.test(trimmed) ||
    trimmed.includes('chromewebstore.google.com') ||
    trimmed.includes('addons.mozilla.org')
  );
}

export const isRestrictedUrl = isRestrictedPage;
