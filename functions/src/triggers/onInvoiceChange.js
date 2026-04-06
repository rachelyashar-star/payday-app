/**
 * triggers/onInvoiceChange.js
 * Firestore triggers for invoice document changes.
 */

const { onDocumentUpdated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');

/**
 * onInvoiceUpdate — Triggered when any invoice document is updated.
 *
 * Handles:
 * 1. When paid changes to true, sets paidAt timestamp.
 * 2. Clears relevant caches (future extension point).
 */
const onInvoiceUpdate = onDocumentUpdated(
  'tenants/{tenantId}/invoices/{invoiceId}',
  async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();
    const { tenantId, invoiceId } = event.params;

    const updates = {};
    let needsUpdate = false;

    // If paid changed from false to true, set paidAt
    if (before.paid !== true && after.paid === true) {
      updates.paidAt = admin.firestore.FieldValue.serverTimestamp();
      needsUpdate = true;
      console.log(`Invoice ${invoiceId} in tenant ${tenantId} marked as paid`);
    }

    // If paid changed from true to false, clear paidAt
    if (before.paid === true && after.paid !== true) {
      updates.paidAt = admin.firestore.FieldValue.delete();
      needsUpdate = true;
      console.log(`Invoice ${invoiceId} in tenant ${tenantId} unmarked as paid`);
    }

    // If clientApproved changed to true and approvedAt not set
    if (before.clientApproved !== true && after.clientApproved === true && !after.approvedAt) {
      updates.approvedAt = admin.firestore.FieldValue.serverTimestamp();
      needsUpdate = true;
    }

    if (needsUpdate) {
      await event.data.after.ref.update(updates);
    }

    return null;
  }
);

module.exports = { onInvoiceUpdate };
