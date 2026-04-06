/**
 * utils/formatters.js
 * Low-level utility functions ported from Apps Script 16_Utils.gs.
 */

const { VENDOR_LOGO_MAP, HEBREW_MONTHS } = require('./constants');

/**
 * Normalize currency string to ISO code.
 * Accepts symbols and common aliases.
 */
function normalizeCurrency(c) {
  const x = String(c || '').toUpperCase().trim();
  if (x === '\u20AA' || x === 'ILS' || x === 'NIS') return 'ILS';
  if (x === '$' || x === 'USD') return 'USD';
  if (x === '\u20AC' || x === 'EUR') return 'EUR';
  if (x === '\u00A3' || x === 'GBP') return 'GBP';
  return 'ILS';
}

/**
 * Normalize a vendor/text name for matching.
 * Lowercase, remove non-alphanumeric except Hebrew chars.
 */
function normalizeName(str) {
  return str
    ? String(str)
        .toLowerCase()
        .replace(/[^a-z0-9\u05D0-\u05EA]/g, '')
    : '';
}

/**
 * Normalize MIME type (fix common variants).
 */
function normalizeMime(m) {
  const s = String(m || '').toLowerCase().trim();
  return s === 'image/jpg' ? 'image/jpeg' : s;
}

/**
 * Safe parseFloat with fallback to 0.
 */
function safeNumber(v) {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

/**
 * Parse JSON leniently: strip markdown code fences, trim, parse.
 * Returns empty object on failure.
 */
function parseJsonLenient(text) {
  try {
    const cleaned = String(text || '')
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();
    return JSON.parse(cleaned);
  } catch (e) {
    return {};
  }
}

/**
 * Format a date as DD/MM/YYYY.
 */
function formatDate(date) {
  if (!date) return '';
  if (date instanceof Date) {
    if (isNaN(date.getTime())) return '';
    const d = ('0' + date.getDate()).slice(-2);
    const m = ('0' + (date.getMonth() + 1)).slice(-2);
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  }
  // If it is a Firestore Timestamp
  if (date && typeof date.toDate === 'function') {
    return formatDate(date.toDate());
  }
  return String(date).substring(0, 10);
}

/**
 * Get Clearbit logo URL for a vendor name.
 */
function getLogoUrl(vendor) {
  if (!vendor) return '';
  const lowVendor = String(vendor).toLowerCase();
  for (const [key, domain] of Object.entries(VENDOR_LOGO_MAP)) {
    if (lowVendor.includes(key.toLowerCase())) {
      return `https://logo.clearbit.com/${domain}`;
    }
  }
  return '';
}

/**
 * Extract a Google Drive file ID from a URL or raw ID string.
 */
function extractFileId(url) {
  if (!url) return null;
  const s = String(url);
  const m = s.match(/\/d\/([a-zA-Z0-9_-]{10,})/);
  if (m) return m[1];
  const m2 = s.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  if (m2) return m2[1];
  // If already a bare ID (no slashes, no query params)
  if (/^[a-zA-Z0-9_-]{10,}$/.test(s.trim())) return s.trim();
  return null;
}

/**
 * Build a Drive preview URL from a file ID.
 */
function getPreviewUrl(fileIdOrUrl) {
  const fid = extractFileId(fileIdOrUrl);
  if (!fid) return '';
  return `https://drive.google.com/file/d/${fid}/preview`;
}

module.exports = {
  normalizeCurrency,
  normalizeName,
  normalizeMime,
  safeNumber,
  parseJsonLenient,
  formatDate,
  getLogoUrl,
  extractFileId,
  getPreviewUrl,
  HEBREW_MONTHS,
};
