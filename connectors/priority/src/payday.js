/**
 * payday.js
 * High-level Pay Day → Priority operations, wiring together the OData client,
 * the field mapping (priorityConfig) and the supplier-numbering logic.
 *
 * Rollout safety (per the user's decisions):
 *   - Suppliers are NEVER created automatically. The flow is two-step:
 *       1) previewNewSupplier()  → read-only, returns what WOULD be created
 *       2) createSupplier()      → writes, only after the bookkeeper approves
 *   - Every document (invoice) is created as a DRAFT (טיוטה). The connector
 *     never finalizes a document or posts journal entries. See
 *     PRIORITY.behavior in priorityConfig.js.
 */

'use strict';

const { readRecords, createRecord } = require('./priorityClient');
const { PRIORITY } = require('./priorityConfig');
const {
  computeNextSupplierNumber,
  pickLastSupplier,
} = require('./supplierNumbering');

/** Escape a value for use inside an OData string literal. */
function odataString(value) {
  return String(value).replace(/'/g, "''");
}

/** Convert "YYYY-MM-DD" to Priority's DateTimeOffset (UTC midnight). */
function toPriorityDate(dateStr) {
  if (!dateStr) return undefined;
  // Already a full datetime? pass through.
  if (/T/.test(dateStr)) return dateStr;
  return `${dateStr}T00:00:00Z`;
}

/**
 * Find suppliers whose name contains the given text (case-insensitive).
 * @param {string} name
 * @returns {Promise<{ count: number, records: object[] }>}
 */
async function findSupplierByName(name) {
  const { entity, keyField, nameField } = PRIORITY.supplier;
  const filter = `contains(tolower(${nameField}),'${odataString(name).toLowerCase()}')`;
  return readRecords(entity, {
    filter,
    select: `${keyField},${nameField}`,
    top: 20,
  });
}

/**
 * Fetch the "last" supplier in the system (most recently created, or, if no
 * usable creation dates are available, the highest supplier number).
 * @returns {Promise<object|null>}
 */
async function getLastSupplier() {
  const { entity, keyField, dateField } = PRIORITY.supplier;

  // Primary: order by creation date descending and take the newest one.
  if (dateField) {
    try {
      const { records } = await readRecords(entity, {
        orderby: `${dateField} desc`,
        top: 1,
        select: `${keyField},${dateField}`,
      });
      if (records.length) return records[0];
    } catch {
      // dateField may not exist on this installation — fall through.
    }
  }

  // Fallback: pull a batch and compute the highest number numerically.
  const { records } = await readRecords(entity, {
    select: keyField,
    top: 500,
  });
  return pickLastSupplier(records, { keyField, dateField });
}

/**
 * Build a PREVIEW of a new supplier — what would be created — WITHOUT writing
 * anything to Priority. The bookkeeper must approve this before createSupplier.
 * @param {string} supplierName
 * @returns {Promise<object>}
 */
async function previewNewSupplier(supplierName) {
  const { keyField, nameField } = PRIORITY.supplier;

  // Don't propose a duplicate if a matching supplier already exists.
  const existing = await findSupplierByName(supplierName);
  if (existing.count > 0) {
    return {
      action: 'none',
      reason: 'A supplier with a similar name already exists.',
      matches: existing.records,
    };
  }

  const last = await getLastSupplier();
  if (!last) {
    return {
      action: 'preview',
      warning:
        'No existing suppliers found to continue numbering from. Confirm the first supplier number manually.',
      preview: { [keyField]: null, [nameField]: supplierName },
    };
  }

  const lastNumber = last[keyField];
  const nextNumber = computeNextSupplierNumber(lastNumber);

  return {
    action: 'preview',
    requiresApproval: true,
    basedOnLastSupplier: lastNumber,
    preview: {
      [keyField]: nextNumber,
      [nameField]: supplierName,
    },
    note:
      `This is a PREVIEW only — nothing was created. ` +
      `If the bookkeeper approves, call priority_create_supplier with this exact record.`,
  };
}

/**
 * Actually create a supplier in Priority. Call this ONLY after the preview
 * from previewNewSupplier() has been approved by the bookkeeper.
 * @param {object} supplierRecord e.g. { SUPNAME: "213-13", SUPDES: "ACME Ltd" }
 * @returns {Promise<{ created: true, record: object }>}
 */
async function createSupplier(supplierRecord) {
  const { entity, keyField } = PRIORITY.supplier;
  if (!supplierRecord || !supplierRecord[keyField]) {
    throw new Error(
      `createSupplier requires a record with a ${keyField}. ` +
        'Get it from previewNewSupplier() and have it approved first.'
    );
  }
  const record = await createRecord(entity, supplierRecord);
  return { created: true, record };
}

/**
 * Search existing expense / G-L accounts by number or description, for the
 * "expense account" dropdown shown when capturing a new supplier's invoice.
 * @param {string} [term] number or description fragment (empty = list top accounts)
 * @returns {Promise<{ count: number, records: object[] }>}
 */
async function searchExpenseAccounts(term) {
  const { entity, keyField, nameField, expenseFilter } = PRIORITY.expenseAccount;
  const clauses = [];
  if (term) {
    const t = odataString(term).toLowerCase();
    clauses.push(
      `(contains(tolower(${keyField}),'${t}') or contains(tolower(${nameField}),'${t}'))`
    );
  }
  if (expenseFilter) clauses.push(`(${expenseFilter})`);
  return readRecords(entity, {
    filter: clauses.join(' and ') || undefined,
    select: `${keyField},${nameField}`,
    top: 50,
  });
}

/**
 * Check whether an expense-account number is free (not yet in use).
 * @param {string} accountNumber
 * @returns {Promise<{ available: boolean, existing: object|null }>}
 */
async function isExpenseAccountAvailable(accountNumber) {
  const { entity, keyField, nameField } = PRIORITY.expenseAccount;
  const { count, records } = await readRecords(entity, {
    filter: `${keyField} eq '${odataString(accountNumber)}'`,
    select: `${keyField},${nameField}`,
    top: 1,
  });
  return { available: count === 0, existing: count > 0 ? records[0] : null };
}

/**
 * Create a new expense account with a bookkeeper-chosen number, after first
 * verifying the number is free. Throws "account number taken" if it isn't.
 * @param {string} accountNumber the number the bookkeeper typed
 * @param {string} accountName   the account description
 * @returns {Promise<{ created: true, record: object }>}
 */
async function createExpenseAccount(accountNumber, accountName) {
  const { entity, keyField, nameField } = PRIORITY.expenseAccount;
  if (!accountNumber) {
    throw new Error('createExpenseAccount requires an account number.');
  }
  const { available, existing } = await isExpenseAccountAvailable(accountNumber);
  if (!available) {
    throw new Error(
      `מספר החשבון תפוס — account number ${accountNumber} is already taken` +
        (existing && existing[nameField] ? ` ("${existing[nameField]}").` : '.')
    );
  }
  const record = await createRecord(entity, {
    [keyField]: accountNumber,
    [nameField]: accountName,
  });
  return { created: true, record };
}

/**
 * Check whether a supplier invoice already exists (dedup), to avoid 409
 * conflicts and double-posting.
 * @param {string} supplierNumber
 * @param {string} invoiceNumber
 */
async function checkInvoiceExists(supplierNumber, invoiceNumber) {
  const { entity, supplierField, invoiceNumberField } = PRIORITY.apInvoice;
  const filter =
    `${supplierField} eq '${odataString(supplierNumber)}' and ` +
    `${invoiceNumberField} eq '${odataString(invoiceNumber)}'`;
  const { count, records } = await readRecords(entity, { filter, top: 5 });
  return { exists: count > 0, records };
}

/**
 * Create a supplier (A/P) invoice in Priority as a DRAFT.
 * Requires the supplier to already exist (we never auto-create suppliers).
 * Performs a duplicate check first.
 *
 * @param {object} inv
 * @param {string} inv.supplierNumber  existing Priority SUPNAME
 * @param {string} inv.invoiceNumber   supplier's invoice number (IVNUM)
 * @param {string} [inv.invoiceDate]   "YYYY-MM-DD"
 * @param {string} [inv.dueDate]       "YYYY-MM-DD"
 * @param {string} [inv.currency]      Pay Day currency code (ILS/USD/EUR/GBP)
 * @param {number} [inv.amountPreVat]
 * @param {number} [inv.vatAmount]
 * @param {number} [inv.totalAmount]
 * @param {string} [inv.description]
 * @returns {Promise<object>}
 */
async function createSupplierInvoiceDraft(inv) {
  const cfg = PRIORITY.apInvoice;

  // Guard: this connector intentionally only creates DRAFTS.
  if (PRIORITY.behavior.finalizeDocuments || PRIORITY.behavior.finalizeTransactions) {
    throw new Error(
      'Finalization/journal posting is enabled in config, but this connector ' +
        'version only supports creating drafts. Implement the finalize step explicitly.'
    );
  }

  // 1) Dedup.
  const dup = await checkInvoiceExists(inv.supplierNumber, inv.invoiceNumber);
  if (dup.exists) {
    return {
      created: false,
      reason: 'duplicate',
      message: `Invoice ${inv.invoiceNumber} for supplier ${inv.supplierNumber} already exists in Priority.`,
      existing: dup.records,
    };
  }

  // 2) Build the draft document (header + one line in the subform).
  const body = {
    [cfg.supplierField]: inv.supplierNumber,
    [cfg.invoiceNumberField]: inv.invoiceNumber,
  };
  if (inv.invoiceDate) body[cfg.invoiceDateField] = toPriorityDate(inv.invoiceDate);
  if (inv.dueDate) body[cfg.dueDateField] = toPriorityDate(inv.dueDate);
  if (inv.currency) {
    body[cfg.currencyField] = PRIORITY.currencyMap[inv.currency] || inv.currency;
  }
  if (inv.totalAmount != null) body[cfg.totalField] = inv.totalAmount;

  const line = {};
  if (inv.amountPreVat != null) line[cfg.line.preVatField] = inv.amountPreVat;
  if (inv.vatAmount != null) line[cfg.line.vatField] = inv.vatAmount;
  if (inv.description) line[cfg.line.descriptionField] = inv.description;
  if (Object.keys(line).length > 0) body[cfg.lineSubform] = [line];

  // 3) Create. We do NOT call any finalize/post action → stays a Draft.
  const record = await createRecord(cfg.entity, body);
  return {
    created: true,
    draft: true,
    note: 'Created as a DRAFT (טיוטה). Not finalized, no journal entries posted.',
    record,
  };
}

module.exports = {
  findSupplierByName,
  getLastSupplier,
  previewNewSupplier,
  createSupplier,
  searchExpenseAccounts,
  isExpenseAccountAvailable,
  createExpenseAccount,
  checkInvoiceExists,
  createSupplierInvoiceDraft,
  // exported for testing / reuse
  toPriorityDate,
  odataString,
};
