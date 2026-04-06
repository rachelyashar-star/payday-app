/**
 * utils/constants.js
 * Global constants for the Pay Day backend.
 */

const ALL_CURRENCIES = ['ILS', 'USD', 'EUR', 'GBP'];

const SUPPORTED_MIME_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
]);

const INVOICE_STATUSES = {
  PENDING_CLIENT: 'PENDING_CLIENT',
  AUTO_PAID_AI: 'AUTO_PAID_AI',
  AUTO_PAID_CC: 'AUTO_PAID_CC',
  DUPLICATE_FLAG: 'DUPLICATE_FLAG',
};

const LOGO_URL =
  'https://drive.google.com/thumbnail?id=1SQcNaciDcr8xCByo-lC9w1B12LV5F2uI&sz=w1000';

const VENDOR_LOGO_MAP = {
  Google: 'google.com',
  Microsoft: 'microsoft.com',
  Amazon: 'amazon.com',
  Wix: 'wix.com',
  Adobe: 'adobe.com',
  Salesforce: 'salesforce.com',
  Zoom: 'zoom.us',
  Slack: 'slack.com',
  Figma: 'figma.com',
  Cloudflare: 'cloudflare.com',
  Meta: 'facebook.com',
  Apple: 'apple.com',
  Netflix: 'netflix.com',
  AWS: 'aws.amazon.com',
  Dropbox: 'dropbox.com',
  GitHub: 'github.com',
  Notion: 'notion.so',
  Stripe: 'stripe.com',
  HubSpot: 'hubspot.com',
  Monday: 'monday.com',
  Canva: 'canva.com',
  Atlassian: 'atlassian.com',
  Jira: 'atlassian.com',
  Twilio: 'twilio.com',
  SendGrid: 'sendgrid.com',
  Mailchimp: 'mailchimp.com',
  DigitalOcean: 'digitalocean.com',
  Heroku: 'heroku.com',
  Vercel: 'vercel.com',
  OpenAI: 'openai.com',
  Anthropic: 'anthropic.com',
};

const GCP_PROJECT_ID = 'payday-il';

const HEBREW_MONTHS = {
  '01': '\u05D9\u05E0\u05D5\u05D0\u05E8',
  '02': '\u05E4\u05D1\u05E8\u05D5\u05D0\u05E8',
  '03': '\u05DE\u05E8\u05E5',
  '04': '\u05D0\u05E4\u05E8\u05D9\u05DC',
  '05': '\u05DE\u05D0\u05D9',
  '06': '\u05D9\u05D5\u05E0\u05D9',
  '07': '\u05D9\u05D5\u05DC\u05D9',
  '08': '\u05D0\u05D5\u05D2\u05D5\u05E1\u05D8',
  '09': '\u05E1\u05E4\u05D8\u05DE\u05D1\u05E8',
  '10': '\u05D0\u05D5\u05E7\u05D8\u05D5\u05D1\u05E8',
  '11': '\u05E0\u05D5\u05D1\u05DE\u05D1\u05E8',
  '12': '\u05D3\u05E6\u05DE\u05D1\u05E8',
};

module.exports = {
  ALL_CURRENCIES,
  SUPPORTED_MIME_TYPES,
  INVOICE_STATUSES,
  LOGO_URL,
  VENDOR_LOGO_MAP,
  GCP_PROJECT_ID,
  HEBREW_MONTHS,
};
