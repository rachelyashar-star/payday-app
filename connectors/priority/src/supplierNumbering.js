/**
 * supplierNumbering.js
 * Pure logic for computing the next supplier number in Priority.
 *
 * Business rule (decided with the user):
 *   Supplier numbers look like "PREFIX-SEQ", where PREFIX is a group number
 *   (typically 200–300) and SEQ is a running number, e.g. "213-12".
 *   A new supplier continues from the LAST supplier in the system overall:
 *   keep the prefix of the last supplier and increment the sequence by 1.
 *   e.g. last "213-12"  ->  next "213-13".
 *
 * This module is pure (no I/O) so it can be unit-tested in isolation.
 */

'use strict';

/**
 * Parse a Priority supplier number into its parts.
 * @param {string} raw e.g. "213-12"
 * @returns {{ raw: string, hasDash: boolean, prefix: string|null,
 *             seq: number, seqWidth: number }}
 */
function parseSupplierNumber(raw) {
  const value = String(raw == null ? '' : raw).trim();
  const dash = value.lastIndexOf('-');
  if (dash <= 0 || dash === value.length - 1) {
    // No usable "PREFIX-SEQ" shape — treat the whole thing as the sequence.
    const seq = Number(value);
    return {
      raw: value,
      hasDash: false,
      prefix: null,
      seq: Number.isFinite(seq) ? seq : NaN,
      seqWidth: value.length,
    };
  }
  const prefix = value.slice(0, dash);
  const seqStr = value.slice(dash + 1);
  const seq = Number(seqStr);
  return {
    raw: value,
    hasDash: true,
    prefix,
    seq: Number.isFinite(seq) ? seq : NaN,
    seqWidth: seqStr.length,
  };
}

/**
 * Format a supplier number from parts, preserving zero-padding width.
 * @param {string} prefix
 * @param {number} seq
 * @param {number} seqWidth minimum width of the sequence (zero-padded)
 * @returns {string}
 */
function formatSupplierNumber(prefix, seq, seqWidth) {
  const seqStr = String(seq).padStart(seqWidth || 0, '0');
  return `${prefix}-${seqStr}`;
}

/**
 * Compute the next supplier number, given the last/highest existing one.
 * @param {string} lastSupplierNumber e.g. "213-12"
 * @returns {string} e.g. "213-13"
 * @throws if the input cannot be parsed into a number to increment
 */
function computeNextSupplierNumber(lastSupplierNumber) {
  const parsed = parseSupplierNumber(lastSupplierNumber);
  if (Number.isNaN(parsed.seq)) {
    throw new Error(
      `Cannot compute next supplier number from "${lastSupplierNumber}": ` +
        'the part after the dash is not numeric. Confirm the supplier numbering format.'
    );
  }
  if (!parsed.hasDash) {
    // Fallback: pure number, just increment, preserving width.
    return String(parsed.seq + 1).padStart(parsed.seqWidth, '0');
  }
  return formatSupplierNumber(parsed.prefix, parsed.seq + 1, parsed.seqWidth);
}

/**
 * Compare two supplier numbers numerically (prefix first, then sequence),
 * so that "213-12" sorts after "213-9" (unlike a plain string sort).
 * @returns {number} negative if a<b, positive if a>b, 0 if equal
 */
function compareSupplierNumbers(a, b) {
  const pa = parseSupplierNumber(a);
  const pb = parseSupplierNumber(b);
  const prefA = Number(pa.prefix);
  const prefB = Number(pb.prefix);
  if (Number.isFinite(prefA) && Number.isFinite(prefB) && prefA !== prefB) {
    return prefA - prefB;
  }
  if (pa.prefix !== pb.prefix && !(Number.isFinite(prefA) && Number.isFinite(prefB))) {
    return String(pa.prefix).localeCompare(String(pb.prefix));
  }
  return (pa.seq || 0) - (pb.seq || 0);
}

/**
 * Pick the "last" supplier from a list of supplier records.
 * Prefers the most recently created record (by the configured date field);
 * if no usable dates are present, falls back to the highest supplier number.
 *
 * @param {object[]} suppliers records from Priority's SUPPLIERS entity
 * @param {object} fields { keyField, dateField }
 * @returns {object|null} the chosen supplier record, or null if list is empty
 */
function pickLastSupplier(suppliers, { keyField, dateField }) {
  if (!Array.isArray(suppliers) || suppliers.length === 0) return null;

  const withDates = dateField
    ? suppliers.filter((s) => s[dateField])
    : [];

  if (withDates.length === suppliers.length && withDates.length > 0) {
    // All records have a creation date — trust it (most recently created).
    return [...withDates].sort(
      (a, b) => new Date(b[dateField]) - new Date(a[dateField])
    )[0];
  }

  // Fallback: highest supplier number.
  return [...suppliers].sort((a, b) =>
    compareSupplierNumbers(b[keyField], a[keyField])
  )[0];
}

module.exports = {
  parseSupplierNumber,
  formatSupplierNumber,
  computeNextSupplierNumber,
  compareSupplierNumbers,
  pickLastSupplier,
};
