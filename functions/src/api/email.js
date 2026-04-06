/**
 * api/email.js
 * Email draft creation routes (admin only, tenant-scoped).
 */

const express = require('express');
const admin = require('firebase-admin');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { resolveTenant } = require('../middleware/tenant');
const gmailService = require('../services/gmail');

const router = express.Router();

router.use(requireAuth, requireAdmin, resolveTenant);

/**
 * POST /approval-draft — Create an approval email draft via Gmail.
 * Body: { to, senderEmail? }
 * Uses tenant settings for clientName, companyName, webAppUrl.
 * Counts pending invoices automatically.
 */
router.post('/approval-draft', async (req, res) => {
  try {
    const { tenantId } = req;
    const { to, senderEmail } = req.body;

    if (!to) {
      return res.status(400).json({ error: 'Recipient email (to) is required' });
    }

    // Get tenant settings
    const settingsDoc = await admin.firestore()
      .collection('tenants').doc(tenantId)
      .collection('settings').doc('app')
      .get();
    const settings = settingsDoc.exists ? settingsDoc.data() : {};

    const clientName = settings.clientName || '\u05DC\u05E7\u05D5\u05D7 \u05D9\u05E7\u05E8';
    const companyName = settings.companyName || '\u05D7\u05D1\u05E8\u05D4';
    const webAppUrl = settings.webAppUrl || '';

    if (!webAppUrl) {
      return res.status(400).json({ error: 'Web App URL not configured in tenant settings' });
    }

    // Count pending invoices
    const pendingSnap = await admin.firestore()
      .collection('tenants').doc(tenantId)
      .collection('invoices')
      .where('pending', '==', true)
      .where('clientApproved', '==', false)
      .where('paid', '==', false)
      .get();
    const pendingCount = pendingSnap.size;

    const sender = senderEmail || req.user.email;
    const result = await gmailService.createApprovalDraft(
      sender, to, clientName, companyName, webAppUrl, pendingCount
    );

    return res.json({
      success: true,
      draftId: result.draftId,
      subject: result.subject,
      pendingCount,
    });
  } catch (err) {
    console.error('Create approval draft error:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /password-draft — Create a password email draft via Gmail.
 * Body: { to, password, senderEmail? }
 */
router.post('/password-draft', async (req, res) => {
  try {
    const { tenantId } = req;
    const { to, password, senderEmail } = req.body;

    if (!to || !password) {
      return res.status(400).json({ error: 'to and password are required' });
    }

    // Get tenant settings
    const settingsDoc = await admin.firestore()
      .collection('tenants').doc(tenantId)
      .collection('settings').doc('app')
      .get();
    const settings = settingsDoc.exists ? settingsDoc.data() : {};

    const clientName = settings.clientName || '\u05DC\u05E7\u05D5\u05D7 \u05D9\u05E7\u05E8';
    const companyName = settings.companyName || '\u05D7\u05D1\u05E8\u05D4';

    const sender = senderEmail || req.user.email;
    const result = await gmailService.createPasswordDraft(
      sender, to, clientName, companyName, password
    );

    return res.json({
      success: true,
      draftId: result.draftId,
      subject: result.subject,
    });
  } catch (err) {
    console.error('Create password draft error:', err);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
