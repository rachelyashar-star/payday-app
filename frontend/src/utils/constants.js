export const LOGO_URL =
  'https://img.icons8.com/fluency/96/money-bag.png';

export const ALL_CURRENCIES = ['ILS', 'USD', 'EUR', 'GBP'];

export const DEPARTMENTS = [
  'הנהלה',
  'כספים',
  'שיווק',
  'פיתוח',
  'תפעול',
  'משאבי אנוש',
  'מכירות',
  'אחר',
];

export const STATUSES = {
  PENDING: 'pending',
  APPROVED: 'approved',
  PAID: 'paid',
  AUTO_PAID: 'autoPaid',
  DUPLICATE: 'duplicate',
  ERROR: 'error',
  UPLOADED: 'uploaded',
};

export const VENDOR_LOGO_MAP = {
  google: 'google.com',
  microsoft: 'microsoft.com',
  amazon: 'amazon.com',
  aws: 'amazon.com',
  adobe: 'adobe.com',
  slack: 'slack.com',
  zoom: 'zoom.us',
  github: 'github.com',
  atlassian: 'atlassian.com',
  jira: 'atlassian.com',
  dropbox: 'dropbox.com',
  salesforce: 'salesforce.com',
  hubspot: 'hubspot.com',
  stripe: 'stripe.com',
  twilio: 'twilio.com',
  mailchimp: 'mailchimp.com',
  figma: 'figma.com',
  notion: 'notion.so',
  vercel: 'vercel.com',
  netlify: 'netlify.com',
  cloudflare: 'cloudflare.com',
  digitalocean: 'digitalocean.com',
  heroku: 'heroku.com',
  monday: 'monday.com',
  wix: 'wix.com',
  elementor: 'elementor.com',
  bezeq: 'bezeq.co.il',
  partner: 'partner.co.il',
  cellcom: 'cellcom.co.il',
  hot: 'hot.net.il',
  pelephone: 'pelephone.co.il',
  electric: 'iec.co.il',
  water: 'hagihon.co.il',
};

export function getVendorLogo(vendorName) {
  if (!vendorName) return '';

  const lower = vendorName.toLowerCase().trim();

  // Check direct map
  for (const [key, domain] of Object.entries(VENDOR_LOGO_MAP)) {
    if (lower.includes(key)) {
      return `https://logo.clearbit.com/${domain}`;
    }
  }

  // Try to construct domain from vendor name
  const cleaned = lower
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '')
    .trim();

  if (cleaned && /^[a-z]/.test(cleaned)) {
    return `https://logo.clearbit.com/${cleaned}.com`;
  }

  return '';
}
