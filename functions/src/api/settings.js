/**
 * api/settings.js
 * Tenant settings routes.
 * Read: any authenticated user in the tenant.
 * Write: admin only.
 */

const express = require('express');
const admin = require('firebase-admin');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { resolveTenant } = require('../middleware/tenant');

const router = express.Router();

router.use(requireAuth, resolveTenant);

/**
 * GET / — Get tenant settings.
 */
router.get('/', async (req, res) => {
  try {
    const { tenantId } = req;

    const doc = await admin.firestore()
      .collection('tenants').doc(tenantId)
      .collection('settings').doc('app')
      .get();

    if (!doc.exists) {
      return res.json({
        currencies: ['ILS', 'USD', 'EUR', 'GBP'],
        autoPayRules: [],
        departments: [],
        clientName: '',
        companyName: '',
        webAppUrl: '',
      });
    }

    return res.json(doc.data());
  } catch (err) {
    console.error('Get settings error:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * PUT / — Update tenant settings (admin only).
 * Body: partial settings fields.
 * Allowed fields: currencies, autoPayRules, departments, clientName, companyName, webAppUrl
 */
router.put('/', requireAdmin, async (req, res) => {
  try {
    const { tenantId } = req;
    const updates = req.body;

    // Whitelist allowed setting fields
    const allowedFields = [
      'currencies',
      'autoPayRules',
      'departments',
      'clientName',
      'companyName',
      'webAppUrl',
    ];

    const sanitized = {};
    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        sanitized[key] = updates[key];
      }
    }

    if (Object.keys(sanitized).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    sanitized.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    await admin.firestore()
      .collection('tenants').doc(tenantId)
      .collection('settings').doc('app')
      .set(sanitized, { merge: true });

    return res.json({ success: true, updated: Object.keys(sanitized) });
  } catch (err) {
    console.error('Update settings error:', err);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
