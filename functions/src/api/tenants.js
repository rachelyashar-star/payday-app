/**
 * api/tenants.js
 * Tenant management routes (admin only).
 * Handles tenant CRUD and user invitations.
 */

const express = require('express');
const admin = require('firebase-admin');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const driveService = require('../services/drive');

const router = express.Router();
const db = admin.firestore;

// All routes require admin
router.use(requireAuth, requireAdmin);

/**
 * POST / — Create a new tenant
 * Body: { name, companyName, email, driveFolderId? }
 */
router.post('/', async (req, res) => {
  try {
    const { name, companyName, email, driveFolderId } = req.body;
    if (!name || !companyName) {
      return res.status(400).json({ error: 'name and companyName are required' });
    }

    const tenantRef = admin.firestore().collection('tenants').doc();
    const tenantId = tenantRef.id;

    // Create Drive folder for the tenant if a parent folder is provided
    let folderData = {};
    if (driveFolderId) {
      // Use provided folder
      folderData.driveFolderId = driveFolderId;
      // Ensure a Processed subfolder exists
      const processedId = await driveService.getOrCreateProcessedFolder(driveFolderId);
      folderData.processedFolderId = processedId;
    }

    const tenantDoc = {
      name,
      companyName,
      email: email || '',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      ...folderData,
    };

    await tenantRef.set(tenantDoc);

    // Create default settings doc
    await admin.firestore()
      .collection('tenants').doc(tenantId)
      .collection('settings').doc('app')
      .set({
        currencies: ['ILS', 'USD', 'EUR', 'GBP'],
        autoPayRules: [],
        departments: [],
        clientName: name,
        companyName,
        webAppUrl: '',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    return res.status(201).json({ tenantId, ...tenantDoc });
  } catch (err) {
    console.error('Create tenant error:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET / — List all tenants
 */
router.get('/', async (req, res) => {
  try {
    const snapshot = await admin.firestore().collection('tenants').orderBy('createdAt', 'desc').get();
    const tenants = [];
    snapshot.forEach((doc) => {
      tenants.push({ id: doc.id, ...doc.data() });
    });
    return res.json({ tenants });
  } catch (err) {
    console.error('List tenants error:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /:tenantId — Get single tenant details
 */
router.get('/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const doc = await admin.firestore().collection('tenants').doc(tenantId).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    return res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    console.error('Get tenant error:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /:tenantId — Update tenant settings
 * Body: partial tenant fields
 */
router.put('/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const updates = req.body;
    delete updates.createdAt; // Protect immutable fields

    await admin.firestore().collection('tenants').doc(tenantId).update({
      ...updates,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.json({ success: true, tenantId });
  } catch (err) {
    console.error('Update tenant error:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /:tenantId/invite — Create a client user
 * Body: { email, displayName, password }
 * Creates Firebase Auth user with custom claims + Firestore user doc.
 */
router.post('/:tenantId/invite', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { email, displayName, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    // Verify tenant exists
    const tenantDoc = await admin.firestore().collection('tenants').doc(tenantId).get();
    if (!tenantDoc.exists) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // Create Firebase Auth user
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: displayName || email,
    });

    // Set custom claims
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      role: 'client',
      tenantId,
    });

    // Create Firestore user doc under the tenant
    await admin.firestore()
      .collection('tenants').doc(tenantId)
      .collection('users').doc(userRecord.uid)
      .set({
        email,
        displayName: displayName || email,
        role: 'client',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    return res.status(201).json({
      uid: userRecord.uid,
      email: userRecord.email,
      tenantId,
      role: 'client',
    });
  } catch (err) {
    console.error('Invite user error:', err);
    if (err.code === 'auth/email-already-exists') {
      return res.status(409).json({ error: 'Email already in use' });
    }
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
