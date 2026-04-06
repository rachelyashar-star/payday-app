/**
 * api/payments.js
 * Payments view route (tenant-scoped).
 * Returns invoices grouped by currency and status for the payments dashboard.
 */

const express = require('express');
const admin = require('firebase-admin');
const { requireAuth } = require('../middleware/auth');
const { resolveTenant } = require('../middleware/tenant');
const { getLogoUrl, getPreviewUrl, formatDate, safeNumber, normalizeCurrency } = require('../utils/formatters');
const { ALL_CURRENCIES } = require('../utils/constants');

const router = express.Router();

router.use(requireAuth, resolveTenant);

/**
 * GET / — Get invoices grouped by currency and status.
 *
 * Response shape:
 * {
 *   pending: { ILS: [...], USD: [...], ... },
 *   approved: { ILS: [...], USD: [...], ... },
 *   summary: { totalPending: N, totalApproved: N }
 * }
 */
router.get('/', async (req, res) => {
  try {
    const { tenantId } = req;

    // Get tenant settings for enabled currencies
    const settingsDoc = await admin.firestore()
      .collection('tenants').doc(tenantId)
      .collection('settings').doc('app')
      .get();

    const settings = settingsDoc.exists ? settingsDoc.data() : {};
    const enabledCurrencies = settings.currencies || ALL_CURRENCIES;

    // Get all unpaid invoices that are pending (pending=true)
    const invoicesRef = admin.firestore()
      .collection('tenants').doc(tenantId)
      .collection('invoices');

    const snapshot = await invoicesRef
      .where('pending', '==', true)
      .where('paid', '==', false)
      .get();

    const pending = {};
    const approved = {};
    enabledCurrencies.forEach((c) => {
      pending[c] = [];
      approved[c] = [];
    });

    let totalPending = 0;
    let totalApproved = 0;

    snapshot.forEach((doc) => {
      const data = doc.data();
      const currency = normalizeCurrency(data.currency);

      if (!enabledCurrencies.includes(currency)) return;

      const item = {
        id: doc.id,
        vendor: data.vendor_name || '',
        invoiceNumber: data.invoice_number || '',
        amount: safeNumber(data.total_amount),
        currency,
        link: data.link || '',
        previewUrl: getPreviewUrl(data.link),
        logo: getLogoUrl(data.vendor_name),
        notes: data.notes || '',
        clientNotes: data.clientNotes || '',
        department: data.department || '',
        paymentMethod: data.paymentMethod || '',
        invoiceDate: formatDate(data.invoice_date),
        dueDate: formatDate(data.due_date),
        paymentDetails: data.payment_details || '',
        status: data.clientApproved ? 'APPROVED' : 'PENDING',
        clientApproved: data.clientApproved === true,
        uploadedToBank: data.uploadedToBank === true,
        paid: data.paid === true,
        createdAt: data.createdAt,
      };

      if (data.clientApproved === true) {
        approved[currency].push(item);
        totalApproved++;
      } else {
        pending[currency].push(item);
        totalPending++;
      }
    });

    return res.json({
      pending,
      approved,
      currencies: enabledCurrencies,
      summary: { totalPending, totalApproved },
    });
  } catch (err) {
    console.error('Payments view error:', err);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
