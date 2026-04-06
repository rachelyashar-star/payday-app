/**
 * index.js
 * Main entry point for Pay Day Firebase Cloud Functions.
 *
 * - Initializes Firebase Admin SDK
 * - Creates Express app with all API routers
 * - Exports as `api` Cloud Function (onRequest)
 * - Exports Firestore triggers
 */

const admin = require('firebase-admin');
const { onRequest } = require('firebase-functions/v2/https');
const express = require('express');
const cors = require('cors');

// Initialize Firebase Admin (uses default credentials in Cloud Functions)
admin.initializeApp();

// Create Express app
const app = express();

// Enable CORS for all origins (tighten in production if needed)
app.use(cors({ origin: true }));

// Parse JSON bodies
app.use(express.json());

// ─── Mount API Routers ──────────────────────────────────────────────
const tenantsRouter = require('./api/tenants');
const invoicesRouter = require('./api/invoices');
const paymentsRouter = require('./api/payments');
const scanRouter = require('./api/scan');
const uploadRouter = require('./api/upload');
const monthReportRouter = require('./api/monthReport');
const emailRouter = require('./api/email');
const settingsRouter = require('./api/settings');

app.use('/api/tenants', tenantsRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/scan', scanRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/month-reports', monthReportRouter);
app.use('/api/email', emailRouter);
app.use('/api/settings', settingsRouter);

// ─── Health Check ───────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Pay Day API',
    timestamp: new Date().toISOString(),
  });
});

// ─── 404 Handler ────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

// ─── Global Error Handler ───────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ─── Export Cloud Function ──────────────────────────────────────────
exports.api = onRequest(
  {
    region: 'us-central1',
    timeoutSeconds: 540,
    memory: '1GiB',
  },
  app
);

// ─── Export Firestore Triggers ──────────────────────────────────────
const { onInvoiceUpdate } = require('./triggers/onInvoiceChange');
exports.onInvoiceUpdate = onInvoiceUpdate;
