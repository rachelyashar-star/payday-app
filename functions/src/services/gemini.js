/**
 * services/gemini.js
 * Gemini invoice extraction using @google/generative-ai SDK.
 * Ported from Apps Script 10_VertexAI.gs.
 */

const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
const { parseJsonLenient } = require('../utils/formatters');
const { GCP_PROJECT_ID } = require('../utils/constants');

const GEMINI_MODEL = 'gemini-2.0-flash';

const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

const EXTRACTION_PROMPT = `
Analyze this invoice and return ONLY valid JSON (no markdown).
{
  "vendor_name": "string",
  "invoice_date": "YYYY-MM-DD",
  "invoice_number": "string",
  "due_date": "YYYY-MM-DD",
  "amount_pre_vat": number,
  "vat_amount": number,
  "total_amount": number,
  "currency": "ILS|USD|EUR|GBP",
  "description": "string",
  "is_paid": boolean,
  "is_saas_autopaid": boolean,
  "payment_details": "string (Extract bank details, IBAN, or payment instructions if present)"
}

Notes:
- is_paid: true if the invoice shows it was already paid (receipt, "PAID" stamp, payment confirmation)
- is_saas_autopaid: true if this appears to be a SaaS/subscription invoice that is auto-charged (look for: "subscription", "recurring", "auto-renew", "auto-pay", credit card on file, or known SaaS vendors like Slack, Zoom, Google, Microsoft, AWS, etc.)
`;

let _genAI = null;

/**
 * Get or create the GoogleGenerativeAI instance.
 * Uses GEMINI_API_KEY env var or falls back to default application credentials.
 */
function getGenAI() {
  if (_genAI) return _genAI;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }
  _genAI = new GoogleGenerativeAI(apiKey);
  return _genAI;
}

/**
 * Extract invoice data from a file using Gemini.
 *
 * @param {string} base64Data - Base64-encoded file content
 * @param {string} mimeType  - MIME type of the file (e.g. application/pdf, image/png)
 * @returns {Object} Extracted invoice fields
 */
async function extractInvoiceData(base64Data, mimeType) {
  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    safetySettings: SAFETY_SETTINGS,
    generationConfig: {
      temperature: 0,
      responseMimeType: 'application/json',
    },
  });

  const result = await model.generateContent([
    { text: EXTRACTION_PROMPT },
    {
      inlineData: {
        mimeType,
        data: base64Data,
      },
    },
  ]);

  const response = result.response;
  const rawText = response.text();
  const parsed = parseJsonLenient(rawText);

  return {
    vendor_name: parsed.vendor_name || '',
    invoice_date: parsed.invoice_date || '',
    invoice_number: parsed.invoice_number || '',
    due_date: parsed.due_date || '',
    amount_pre_vat: parsed.amount_pre_vat || 0,
    vat_amount: parsed.vat_amount || 0,
    total_amount: parsed.total_amount || 0,
    currency: parsed.currency || 'ILS',
    description: parsed.description || '',
    is_paid: parsed.is_paid === true,
    is_saas_autopaid: parsed.is_saas_autopaid === true,
    payment_details: parsed.payment_details || '',
  };
}

module.exports = { extractInvoiceData };
