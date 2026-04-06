/**
 * api/upload.js
 * Upload invoice file to tenant's Drive folder.
 * Accepts multipart form data via busboy.
 */

const express = require('express');
const admin = require('firebase-admin');
const Busboy = require('busboy');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { resolveTenant } = require('../middleware/tenant');
const driveService = require('../services/drive');
const { normalizeMime } = require('../utils/formatters');
const { SUPPORTED_MIME_TYPES } = require('../utils/constants');

const router = express.Router();

router.use(requireAuth, requireAdmin, resolveTenant);

/**
 * POST / — Upload an invoice file to the tenant's Drive folder.
 * Accepts multipart/form-data with a single file field named "file".
 * Optional query param: ?scan=true to trigger scan for that single file after upload.
 *
 * Returns: { fileId, fileUrl, fileName }
 */
router.post('/', (req, res) => {
  const { tenantId } = req;
  const triggerScan = req.query.scan === 'true';

  // Get tenant's Drive folder
  admin.firestore().collection('tenants').doc(tenantId).get()
    .then(async (tenantDoc) => {
      if (!tenantDoc.exists) {
        return res.status(404).json({ error: 'Tenant not found' });
      }

      const tenantData = tenantDoc.data();
      const driveFolderId = tenantData.driveFolderId;
      if (!driveFolderId) {
        return res.status(400).json({ error: 'No Drive folder configured for this tenant' });
      }

      const busboy = Busboy({ headers: req.headers });
      const uploads = [];

      busboy.on('file', (fieldname, file, info) => {
        const { filename, mimeType } = info;
        const normalized = normalizeMime(mimeType);

        if (!SUPPORTED_MIME_TYPES.has(normalized)) {
          file.resume(); // Drain the stream
          uploads.push({
            error: `Unsupported file type: ${mimeType}`,
            fileName: filename,
          });
          return;
        }

        const chunks = [];
        file.on('data', (chunk) => chunks.push(chunk));
        file.on('end', () => {
          uploads.push({
            fileName: filename,
            mimeType: normalized,
            buffer: Buffer.concat(chunks),
          });
        });
      });

      busboy.on('finish', async () => {
        try {
          if (uploads.length === 0) {
            return res.status(400).json({ error: 'No file uploaded' });
          }

          const results = [];
          for (const upload of uploads) {
            if (upload.error) {
              results.push({ error: upload.error, fileName: upload.fileName });
              continue;
            }

            // Upload to Drive
            const { fileId, webViewLink } = await driveService.uploadFile(
              driveFolderId,
              upload.fileName,
              upload.mimeType,
              upload.buffer
            );

            // Set public viewing
            await driveService.setPublicViewing(fileId);

            const fileUrl = `https://drive.google.com/file/d/${fileId}/view`;

            results.push({
              fileId,
              fileUrl,
              webViewLink,
              fileName: upload.fileName,
            });

            // If scan requested, process this single file
            if (triggerScan) {
              try {
                const { extractInvoiceData } = require('../services/gemini');
                const { applyBusinessLogic } = require('../services/businessLogic');
                const { normalizeCurrency, safeNumber } = require('../utils/formatters');
                const { INVOICE_STATUSES } = require('../utils/constants');

                const base64 = upload.buffer.toString('base64');
                const aiData = await extractInvoiceData(base64, upload.mimeType);
                aiData.currency = normalizeCurrency(aiData.currency);

                // Get settings for auto-pay rules
                const settingsDoc = await admin.firestore()
                  .collection('tenants').doc(tenantId)
                  .collection('settings').doc('app')
                  .get();
                const settings = settingsDoc.exists ? settingsDoc.data() : {};

                // Get existing invoices for dup check
                const existingSnap = await admin.firestore()
                  .collection('tenants').doc(tenantId)
                  .collection('invoices')
                  .select('vendor_name', 'total_amount')
                  .get();
                const existingInvoices = [];
                existingSnap.forEach((doc) => existingInvoices.push({ id: doc.id, ...doc.data() }));

                const logicResult = applyBusinessLogic(aiData, settings.autoPayRules || [], existingInvoices);
                const isPending = (logicResult.status === INVOICE_STATUSES.PENDING_CLIENT ||
                                  logicResult.status === INVOICE_STATUSES.DUPLICATE_FLAG);

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
                  sourceFileName: upload.fileName,
                  sourceFileId: fileId,
                  runAt: new Date(),
                  createdAt: admin.firestore.FieldValue.serverTimestamp(),
                };

                const docRef = await admin.firestore()
                  .collection('tenants').doc(tenantId)
                  .collection('invoices')
                  .add(invoiceData);

                // Move to processed
                const processedFolderId = await driveService.getOrCreateProcessedFolder(driveFolderId);
                await driveService.moveFile(fileId, processedFolderId);

                results[results.length - 1].invoiceId = docRef.id;
                results[results.length - 1].status = logicResult.status;
                results[results.length - 1].scanned = true;
              } catch (scanErr) {
                console.error('Scan after upload failed:', scanErr);
                results[results.length - 1].scanError = scanErr.message;
              }
            }
          }

          return res.json({ files: results });
        } catch (err) {
          console.error('Upload processing error:', err);
          return res.status(500).json({ error: err.message });
        }
      });

      // Pipe the request to busboy
      if (req.rawBody) {
        // Firebase Cloud Functions buffers the body
        const { Readable } = require('stream');
        const stream = new Readable();
        stream.push(req.rawBody);
        stream.push(null);
        stream.pipe(busboy);
      } else {
        req.pipe(busboy);
      }
    })
    .catch((err) => {
      console.error('Upload error:', err);
      return res.status(500).json({ error: err.message });
    });
});

module.exports = router;
