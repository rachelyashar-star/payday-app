/**
 * api/monthReport.js
 * Month report management (tenant-scoped).
 * Ported from Apps Script 12_Month_Sheet.gs.
 */

const express = require('express');
const admin = require('firebase-admin');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { resolveTenant } = require('../middleware/tenant');
const { getLogoUrl, getPreviewUrl, formatDate, safeNumber, normalizeCurrency } = require('../utils/formatters');
const { HEBREW_MONTHS } = require('../utils/constants');

const router = express.Router();

router.use(requireAuth, resolveTenant);

/**
 * POST / — Create a month report.
 * Body: { month?, year? } (defaults to current month/year)
 * Creates a metadata doc; invoices are queried dynamically.
 */
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { tenantId } = req;
    const now = new Date();
    const month = req.body.month || String(now.getMonth() + 1).padStart(2, '0');
    const year = req.body.year || String(now.getFullYear());
    const reportKey = `${month}.${year.slice(-2)}`;

    // Check if report already exists
    const existing = await admin.firestore()
      .collection('tenants').doc(tenantId)
      .collection('monthReports').doc(reportKey)
      .get();

    if (existing.exists) {
      return res.status(409).json({ error: `Month report ${reportKey} already exists` });
    }

    const hebrewMonth = HEBREW_MONTHS[month] || month;
    const displayName = `${hebrewMonth} ${year}`;

    await admin.firestore()
      .collection('tenants').doc(tenantId)
      .collection('monthReports').doc(reportKey)
      .set({
        month,
        year,
        reportKey,
        displayName,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: req.user.uid,
      });

    // Tag matching invoices with this month report
    const startDate = `${year}-${month}-01`;
    const endMonth = parseInt(month) === 12 ? '01' : String(parseInt(month) + 1).padStart(2, '0');
    const endYear = parseInt(month) === 12 ? String(parseInt(year) + 1) : year;
    const endDate = `${endYear}-${endMonth}-01`;

    const invoicesSnap = await admin.firestore()
      .collection('tenants').doc(tenantId)
      .collection('invoices')
      .where('pending', '==', true)
      .where('clientApproved', '==', true)
      .where('paid', '==', false)
      .get();

    const batch = admin.firestore().batch();
    let taggedCount = 0;
    invoicesSnap.forEach((doc) => {
      const data = doc.data();
      if (!data.monthReport) {
        batch.update(doc.ref, { monthReport: reportKey });
        taggedCount++;
      }
    });
    await batch.commit();

    return res.status(201).json({
      reportKey,
      displayName,
      taggedInvoices: taggedCount,
    });
  } catch (err) {
    console.error('Create month report error:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET / — List all month reports.
 */
router.get('/', async (req, res) => {
  try {
    const { tenantId } = req;
    const snapshot = await admin.firestore()
      .collection('tenants').doc(tenantId)
      .collection('monthReports')
      .orderBy('createdAt', 'desc')
      .get();

    const reports = [];
    snapshot.forEach((doc) => {
      reports.push({ id: doc.id, ...doc.data() });
    });

    return res.json({ reports });
  } catch (err) {
    console.error('List month reports error:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /:reportId — Get month report with its invoices.
 */
router.get('/:reportId', async (req, res) => {
  try {
    const { tenantId } = req;
    const { reportId } = req.params;

    const reportDoc = await admin.firestore()
      .collection('tenants').doc(tenantId)
      .collection('monthReports').doc(reportId)
      .get();

    if (!reportDoc.exists) {
      return res.status(404).json({ error: 'Month report not found' });
    }

    // Query invoices tagged with this month report
    const invoicesSnap = await admin.firestore()
      .collection('tenants').doc(tenantId)
      .collection('invoices')
      .where('monthReport', '==', reportId)
      .get();

    const invoices = [];
    let totalByStatus = { pending: 0, approved: 0, paid: 0 };
    let totalByCurrency = {};

    invoicesSnap.forEach((doc) => {
      const data = doc.data();
      const currency = normalizeCurrency(data.currency);

      const inv = {
        id: doc.id,
        vendor: data.vendor_name || '',
        invoiceNumber: data.invoice_number || '',
        amount: safeNumber(data.total_amount),
        currency,
        link: data.link || '',
        previewUrl: getPreviewUrl(data.link),
        logo: getLogoUrl(data.vendor_name),
        notes: data.notes || '',
        department: data.department || '',
        paymentMethod: data.paymentMethod || '',
        dueDate: formatDate(data.due_date),
        paymentDetails: data.payment_details || '',
        clientApproved: data.clientApproved === true,
        uploadedToBank: data.uploadedToBank === true,
        paid: data.paid === true,
      };

      invoices.push(inv);

      // Accumulate totals
      if (!totalByCurrency[currency]) totalByCurrency[currency] = 0;
      totalByCurrency[currency] += inv.amount;

      if (inv.paid) totalByStatus.paid++;
      else if (inv.clientApproved) totalByStatus.approved++;
      else totalByStatus.pending++;
    });

    return res.json({
      report: { id: reportDoc.id, ...reportDoc.data() },
      invoices,
      summary: { totalByStatus, totalByCurrency, count: invoices.length },
    });
  } catch (err) {
    console.error('Get month report error:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /invoices/:invoiceId — Update invoice payment status from month report view.
 * Body: { uploadedToBank?, paid? }
 */
router.put('/invoices/:invoiceId', async (req, res) => {
  try {
    const { tenantId } = req;
    const { invoiceId } = req.params;
    const { uploadedToBank, paid } = req.body;

    const invoiceRef = admin.firestore()
      .collection('tenants').doc(tenantId)
      .collection('invoices').doc(invoiceId);

    const doc = await invoiceRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const updateData = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (uploadedToBank !== undefined) {
      updateData.uploadedToBank = uploadedToBank === true;
    }
    if (paid !== undefined) {
      updateData.paid = paid === true;
      if (paid === true) {
        updateData.paidAt = admin.firestore.FieldValue.serverTimestamp();
      }
    }

    await invoiceRef.update(updateData);

    return res.json({ success: true, invoiceId });
  } catch (err) {
    console.error('Update invoice from month report error:', err);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
