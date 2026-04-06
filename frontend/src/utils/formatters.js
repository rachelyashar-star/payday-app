export const HEBREW_MONTHS = [
  'ינואר',
  'פברואר',
  'מרץ',
  'אפריל',
  'מאי',
  'יוני',
  'יולי',
  'אוגוסט',
  'ספטמבר',
  'אוקטובר',
  'נובמבר',
  'דצמבר',
];

const CURRENCY_SYMBOLS = {
  ILS: '\u20AA',
  USD: '$',
  EUR: '\u20AC',
  GBP: '\u00A3',
};

export function formatMoney(amount, currency = 'ILS') {
  if (amount == null || isNaN(amount)) return '-';
  const num = Number(amount);
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  const formatted = num.toLocaleString('he-IL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${symbol}${formatted}`;
}

export function formatDate(date) {
  if (!date) return '-';

  let d;
  if (date?.toDate) {
    d = date.toDate();
  } else if (date?.seconds) {
    d = new Date(date.seconds * 1000);
  } else {
    d = new Date(date);
  }

  if (isNaN(d.getTime())) return '-';

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const STATUS_LABELS = {
  pending: 'ממתין לאישור',
  approved: 'אושר',
  paid: 'שולם',
  autoPaid: 'תשלום אוטומטי',
  duplicate: 'כפולה',
  error: 'שגיאה',
  uploaded: 'הועלה',
};

const STATUS_COLORS = {
  pending: '#f59e0b',
  approved: '#2563eb',
  paid: '#22c55e',
  autoPaid: '#22c55e',
  duplicate: '#64748b',
  error: '#ef4444',
  uploaded: '#2563eb',
};

export function getStatusLabel(status) {
  return STATUS_LABELS[status] || status;
}

export function getStatusColor(status) {
  return STATUS_COLORS[status] || '#64748b';
}
