/**
 * api/invoices.js
 * Invoice CRUD routes (tenant-scoped).
 * Ported from Apps Script 14_WebApp_API.gs.
 */

const express = require('express');
const admin = require('firebase-admin');
const { requireAuth } = require('../middleware/auth');
const { resolveTenant } = require('../middleware/tenant');
const { getLogoUrl, getPreviewUrl, formatDate, safeNumber, normalizeCurrency } = require('../utils/formatters');

const router = express.Router();

router.use(requireAuth, resolveTenant);

/**
 * GET / — List invoices with optional filters.
 * Query params: status, clientApproved, currency, pending, paid
 */
router.get('/', async (req, res) => {
  try {
    const { tenantId } = req;
    const { status, clientApproved, currency, pending, paid, limit: limitStr } = req.query;

    let query = admin.firestore()
      .collection('tenants').doc(tenantId)
      .collection('invoices')
      .orderBy('createdAt', 'desc');

    if (status) {
      query = query.where('status', '==', status);
    }
    if (clientApproved !== undefined) {
      query = query.where('clientApproved', '==', clientApproved === 'true');
    }
    if (currency) {
      query = query.where('currency', '==', normalizeCurrency(currency));
    }
    if (pending !== undefined) {
      query = query.where('pending', '==', pending === 'true');
    }
    if (paid !== undefined) {
      query = query.where('paid', '==', paid === 'true');
    }

    const pageLimit = Math.min(parseInt(limitStr) || 500, 1000);
    query = query.limit(pageLimit);

    const snapshot = await query.get();
    const invoices = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      invoices.push({
        id: doc.id,
        ...data,
        logo: getLogoUrl(data.vendor_name),
        previewUrl: getPreviewUrl(data.link),
        invoiceDate: formatDate(data.invoice_date),
        dueDate: formatDate(data.due_date),
        createdAt: data.createdAt,
      });
    });

    return res.json({ invoices, count: invoices.length });
  } catch (err) {
    console.error('List invoices error:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /:invoiceId — Get single invoice
 */
router.get('/:invoiceId', async (req, res) => {
  try {
    const { tenantId } = req;
    const { invoiceId } = req.params;

    const doc = await admin.firestore()
      .collection('tenants').doc(tenantId)
      .collection('invoices').doc(invoiceId)
      .get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const data = doc.data();
    return res.json({
      id: doc.id,
      ...data,
      logo: getLogoUrl(data.vendor_name),
      previewUrl: getPreviewUrl(data.link),
      invoiceDate: formatDate(data.invoice_date),
      dueDate: formatDate(data.due_date),
    });
  } catch (err) {
    console.error('Get invoice error:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /:invoiceId/approve — Client approves invoice
 * Body: { department?, paymentMethod?, notes? }
 */
router.post('/:invoiceId/approve', async (req, res) => {
  try {
    const { tenantId } = req;
    const { invoiceId } = req.params;
    const { department, paymentMethod, notes } = req.body;

    const invoiceRef = admin.firestore()
      .collection('tenants').doc(tenantId)
      .collection('invoices').doc(invoiceId);

    const doc = await invoiceRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const updateData = {
      clientApproved: true,
      approvedAt: admin.firestore.FieldValue.serverTimestamp(),
      approvedBy: req.user.uid,
    };

    if (department) updateData.department = department;
    if (paymentMethod) updateData.paymentMethod = paymentMethod;
    if (notes) {
      const existing = doc.data().clientNotes || '';
      updateData.clientNotes = existing ? `${existing} | ${notes}` : notes;
    }

    await invoiceRef.update(updateData);

    return res.json({
      success: true,
      message: '\u05D4\u05D7\u05E9\u05D1\u05D5\u05E0\u05D9\u05EA \u05D0\u05D5\u05E9\u05E8\u05D4 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4',
      invoiceId,
    });
  } catch (err) {
    console.error('Approve invoice error:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /:invoiceId — Update invoice fields
 * Body: partial invoice fields
 */
router.put('/:invoiceId', async (req, res) => {
  try {
    const { tenantId } = req;
    const { invoiceId } = req.params;
    const updates = req.body;

    // Protect system fields
    delete updates.id;
    delete updates.createdAt;
    delete updates.tenantId;

    const invoiceRef = admin.firestore()
      .collection('tenants').doc(tenantId)
      .collection('invoices').doc(invoiceId);

    const doc = await invoiceRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    await invoiceRef.update({
      ...updates,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.json({ success: true, invoiceId });
  } catch (err) {
    console.error('Update invoice error:', err);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
