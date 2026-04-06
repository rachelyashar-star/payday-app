/**
 * services/businessLogic.js
 * Business logic ported from Apps Script 09_Business_Logic.gs.
 * Determines invoice status based on AI data, auto-pay rules, and duplicate checks.
 */

const { normalizeName, safeNumber } = require('../utils/formatters');
const { INVOICE_STATUSES } = require('../utils/constants');

/**
 * Apply business logic to determine invoice status.
 *
 * @param {Object} data - Extracted invoice data from Gemini
 * @param {Array<{vendor: string, contra: string, isAuto: boolean}>} autoPayRules - Auto-pay rules from tenant settings
 * @param {Array<{vendor_name: string, total_amount: number, id: string}>} existingInvoices - Existing invoices for duplicate check
 * @returns {{ status: string, notes: string }}
 */
function applyBusinessLogic(data, autoPayRules = [], existingInvoices = []) {
  // 1) If invoice is already paid (receipt / CC charge)
  if (data.is_paid === true) {
    return {
      status: INVOICE_STATUSES.AUTO_PAID_AI,
      notes: '\u05D6\u05D5\u05D4\u05D4 \u05DB\u05DE\u05E9\u05D5\u05DC\u05DD (\u05E7\u05D1\u05DC\u05D4 \u05D0\u05D5 \u05D7\u05D9\u05D5\u05D1 \u05D0\u05E9\u05E8\u05D0\u05D9)',
    };
  }

  // 1.5) If AI identified this as a SaaS/subscription auto-paid invoice
  if (data.is_saas_autopaid === true) {
    return {
      status: INVOICE_STATUSES.AUTO_PAID_AI,
      notes: '\u05D6\u05D5\u05D4\u05D4 \u05DB\u05DE\u05E0\u05D5\u05D9 SaaS (\u05EA\u05E9\u05DC\u05D5\u05DD \u05D0\u05D5\u05D8\u05D5\u05DE\u05D8\u05D9)',
    };
  }

  // 2) AUTO_PAID_CC based on vendor auto-pay rules
  if (autoPayRules && autoPayRules.length > 0) {
    const normalizedVendor = normalizeName(data.vendor_name);

    for (const rule of autoPayRules) {
      if (!rule.isAuto) continue;
      const dbVendor = normalizeName(rule.vendor);
      if (dbVendor.length <= 1) continue;

      if (normalizedVendor.includes(dbVendor) || dbVendor.includes(normalizedVendor)) {
        return {
          status: INVOICE_STATUSES.AUTO_PAID_CC,
          notes: `\u05D0\u05D5\u05E9\u05E8 \u05D0\u05D5\u05D8\u05D5\u05DE\u05D8\u05D9\u05EA (\u05DE\u05D6\u05D5\u05D4\u05D4 \u05E2"\u05D9: ${rule.contra || rule.vendor})`,
        };
      }
    }
  }

  // 3) Duplicate check (vendor + total)
  const dup = checkDuplicate(data.vendor_name, safeNumber(data.total_amount), existingInvoices);
  if (dup.isDuplicate) {
    return {
      status: INVOICE_STATUSES.DUPLICATE_FLAG,
      notes: `\u05D7\u05E9\u05D3 \u05DC\u05DB\u05E4\u05D9\u05DC\u05D5\u05EA: ${dup.details}`,
    };
  }

  // 4) Default: pending client approval
  return {
    status: INVOICE_STATUSES.PENDING_CLIENT,
    notes: '',
  };
}

/**
 * Check if an invoice is a duplicate based on vendor name and total amount.
 *
 * @param {string} vendorName
 * @param {number} total
 * @param {Array<{vendor_name: string, total_amount: number, id: string}>} existingInvoices
 * @returns {{ isDuplicate: boolean, details: string }}
 */
function checkDuplicate(vendorName, total, existingInvoices = []) {
  const vNorm = normalizeName(vendorName);

  for (const inv of existingInvoices) {
    const rowVendor = normalizeName(inv.vendor_name);
    const rowTotal = safeNumber(inv.total_amount);

    if (rowVendor && vNorm && rowVendor === vNorm && Math.abs(rowTotal - total) < 1) {
      return {
        isDuplicate: true,
        details: `Invoice ID: ${inv.id}`,
      };
    }
  }

  return { isDuplicate: false, details: '' };
}

module.exports = { applyBusinessLogic, checkDuplicate, normalizeName };
