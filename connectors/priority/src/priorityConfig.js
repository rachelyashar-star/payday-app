/**
 * priorityConfig.js
 * Mapping between Pay Day data and Priority ERP entity/field names.
 *
 * ⚠️ IMPORTANT — VERIFY THESE NAMES AGAINST YOUR PRIORITY INSTALLATION.
 * The exact entity and field names depend on your Priority version, language,
 * and private customizations. Use the `priority_describe_entity` tool (which
 * calls Priority's GetMetadataFor(entity=...)) to confirm the real names and
 * which fields are mandatory before relying on the create flows in production.
 *
 * Everything that is installation-specific lives here, so adjusting to a real
 * Priority environment means editing this one file — not the logic.
 */

'use strict';

const PRIORITY = {
  // ─── Safety / rollout behavior ────────────────────────────────────
  // While we validate the integration, EVERYTHING created in Priority must
  // stay a DRAFT (טיוטה) — documents and their transactions are recorded as
  // DRAFT (non-final) only. No finalized documents and no FINAL journal
  // entries. The connector therefore only CREATES records and never runs a
  // finalize/post action. Suppliers are only created after explicit human
  // approval (preview-then-confirm). Flip these to true later, once the logic
  // is proven and debugged, to enable automatic finalization / final posting.
  behavior: {
    finalizeDocuments: false, // false = leave documents as Draft (טיוטה)
    finalizeTransactions: false, // false = draft (non-final) transactions only
    autoCreateSuppliers: false, // false = require bookkeeper approval first
  },

  // ─── Supplier master (ספקים) ──────────────────────────────────────
  supplier: {
    entity: 'SUPPLIERS', // A/P vendor master form
    keyField: 'SUPNAME', // supplier number, e.g. "213-12"  ⚠️ verify
    nameField: 'SUPDES', // supplier description / name      ⚠️ verify
    // Field used to determine the "last" supplier (most recently created).
    // CURDATE is the standard Priority creation date on most forms. ⚠️ verify
    dateField: 'CURDATE',
  },

  // ─── A/P (supplier / purchase) invoice (חשבונית ספק) ──────────────
  // NOTE: Sales invoices are AINVOICES; supplier/purchase invoices are
  // typically PINVOICES. ⚠️ Confirm the entity + the field/subform names.
  apInvoice: {
    entity: 'PINVOICES',
    supplierField: 'SUPNAME', // link to the supplier
    invoiceNumberField: 'IVNUM', // the supplier's invoice number
    invoiceDateField: 'IVDATE', // invoice date           ⚠️ verify
    dueDateField: 'PAYDATE', // payment due date           ⚠️ verify
    currencyField: 'CODE', // currency code                ⚠️ verify
    totalField: 'TOTPRICE', // total incl. VAT             ⚠️ verify
    // Line-items subform and its fields. ⚠️ verify all of these.
    lineSubform: 'PINVOICEITEMS_SUBFORM',
    line: {
      preVatField: 'PRICE', // amount before VAT
      vatField: 'VAT', // VAT amount
      descriptionField: 'PARTDES', // free-text line description
    },
  },

  // ─── Expense / G-L accounts (חשבונות הוצאה / כרטיסי חשבון) ─────────
  // Unlike suppliers, expense-account numbers are NOT auto-incremented:
  // the bookkeeper types a number manually, and we only verify it is free
  // before creating (otherwise → "account number taken").
  expenseAccount: {
    entity: 'ACCOUNTS', // chart-of-accounts form           ⚠️ verify
    keyField: 'ACCNAME', // account number                  ⚠️ verify
    nameField: 'ACCDES', // account description             ⚠️ verify
    // Optional OData filter to limit results to EXPENSE accounts only
    // (the chart of accounts also holds assets, income, etc.). Leave empty
    // until the right field/value for expense accounts is confirmed. ⚠️ verify
    expenseFilter: '',
  },

  // Map Pay Day currency codes (ILS/USD/EUR/GBP) to Priority currency codes.
  // ⚠️ Priority currency codes are configured per installation — confirm them.
  currencyMap: {
    ILS: 'ILS',
    USD: 'USD',
    EUR: 'EUR',
    GBP: 'GBP',
  },
};

module.exports = { PRIORITY };
