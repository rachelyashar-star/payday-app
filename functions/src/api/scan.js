/**
 * api/scan.js
 * Trigger invoice scan for a tenant's Drive folder.
 * Ported from Apps Script 08_Scan_Invoices.gs.
 */

const express = require('express');
const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { resolveTenant } = require('../middleware/tenant');
const driveService = require('../services/drive');
const { extractInvoiceData } = require('../services/gemini');
const { applyBusinessLogic } = require('../services/businessLogic');
const { normalizeCurrency, normalizeMime, safeNumber, extractFileId } = require('../utils/formatters');
const { SUPPORTED_MIME_TYPES, INVOICE_STATUSES } = require('../utils/constants');

const router = express.Router();

router.use(requireAuth, requireAdmin, resolveTenant);

/**
 * POST / — Scan tenant's Drive folder for new invoices.
 * Reads settings to get driveFolderId, lists files, processes each through
 * Gemini extraction and business logic, saves to Firestore, moves to Processed.
 */
router.post('/', async (req, res) => {
  try {
    const { tenantId } = req;

    // Get tenant settings
    const tenantDoc = await admin.firestore().collection('tenants').doc(tenantId).get();
    if (!tenantDoc.exists) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const tenantData = tenantDoc.data();
    const driveFolderId = tenantData.driveFolderId;
    if (!driveFolderId) {
      return res.status(400).json({ error: 'No Drive folder configured for this tenant' });
    }

    // Get auto-pay rules from settings
    const settingsDoc = await admin.firestore()
      .collection('tenants').doc(tenantId)
      .collection('settings').doc('app')
      .get();
    const settings = settingsDoc.exists ? settingsDoc.data() : {};
    const autoPayRules = settings.autoPayRules || [];

    // Get existing invoices for duplicate detection
    const existingSnap = await admin.firestore()
      .collection('tenants').doc(tenantId)
      .collection('invoices')
      .select('vendor_name', 'total_amount')
      .get();
    const existingInvoices = [];
    existingSnap.forEach((doc) => {
      existingInvoices.push({ id: doc.id, ...doc.data() });
    });

    // Get or create Processed folder
    const processedFolderId = await driveService.getOrCreateProcessedFolder(driveFolderId);

    // List files in the inbox folder
    const files = await driveService.listFiles(driveFolderId);

    if (files.length === 0) {
      return res.json({
        message: 'No files to process',
        summary: { processed: 0, autoPaid: 0, duplicates: 0, errors: 0 },
      });
    }

    const runAt = new Date();
    let processedCount = 0;
    let autoPaidCount = 0;
    let duplicatesCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const file of files) {
      try {
        const mimeType = normalizeMime(file.mimeType);
        if (!SUPPORTED_MIME_TYPES.has(mimeType)) continue;

        // Get file content as base64
        const { base64 } = await driveService.getFileContent(file.id);

        // Extract invoice data with Gemini
        const aiData = await extractInvoiceData(base64, mimeType);
        aiData.currency = normalizeCurrency(aiData.currency);

        // Apply business logic
        const logicResult = applyBusinessLogic(aiData, autoPayRules, existingInvoices);

        // Determine pending flag
        const isPending = (logicResult.status === INVOICE_STATUSES.PENDING_CLIENT ||
                          logicResult.status === INVOICE_STATUSES.DUPLICATE_FLAG);

        // Build the file link
        const fileUrl = `https://drive.google.com/file/d/${file.id}/view`;

        // Set public viewing
        try {
          await driveService.setPublicViewing(file.id);
        } catch (shareErr) {
          console.warn(`Failed to set sharing for ${file.id}:`, shareErr.message);
        }

        // Save to Firestore
        const invoiceData = {
          vendor_name: aiData.vendor_name || '',
          invoice_date: aiData.invoice_date || '',
          invoice_number: aiData.invoice_number || '',
          due_date: aiData.due_date || '',
          amount_pre_vat: safeNumber(aiData.amount_pre_vat),
          vat_amount: safeNumber(aiData.vat_amount),
          total_amount: safeNumber(aiData.total_amount),
          currency: aiData.currency,
          description: aiData.description || '',
          payment_details: aiData.payment_details || '',
          pending: isPending,
          link: fileUrl,
          notes: logicResult.notes || '',
          status: logicResult.status,
          clientApproved: false,
          department: '',
          paymentMethod: '',
          clientNotes: '',
          uploadedToBank: false,
          paid: false,
          sourceFileName: file.name,
          sourceFileId: file.id,
          runAt,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        await admin.firestore()
          .collection('tenants').doc(tenantId)
          .collection('invoices')
          .add(invoiceData);

        // Add to existing invoices for subsequent duplicate checks
        existingInvoices.push({
          id: 'new',
          vendor_name: aiData.vendor_name,
          total_amount: aiData.total_amount,
        });

        // Move to Processed folder
        try {
          await driveService.moveFile(file.id, processedFolderId);
        } catch (moveErr) {
          console.warn(`Failed to move file ${file.name}:`, moveErr.message);
        }

        // Count results
        if (logicResult.status === INVOICE_STATUSES.PENDING_CLIENT) processedCount++;
        if (logicResult.status === INVOICE_STATUSES.AUTO_PAID_AI ||
            logicResult.status === INVOICE_STATUSES.AUTO_PAID_CC) autoPaidCount++;
        if (logicResult.status === INVOICE_STATUSES.DUPLICATE_FLAG) duplicatesCount++;

      } catch (fileErr) {
        errorCount++;
        errors.push({ file: file.name, error: fileErr.message });
        console.error(`Error processing file ${file.name}:`, fileErr);

        // Log error to Firestore
        try {
          await admin.firestore()
            .collection('tenants').doc(tenantId)
            .collection('scanErrors')
            .add({
              fileName: file.name,
              fileId: file.id,
              stage: 'scan',
              error: fileErr.message,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        } catch (logErr) {
          console.error('Failed to log scan error:', logErr);
        }
      }
    }

    return res.json({
      message: 'Scan complete',
      summary: {
        processed: processedCount,
        autoPaid: autoPaidCount,
        duplicates: duplicatesCount,
        errors: errorCount,
      },
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error('Scan error:', err);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
