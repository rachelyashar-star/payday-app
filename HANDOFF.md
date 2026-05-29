# מדריך המשך — אינטגרציית Pay Day ↔ Priority ERP

מסמך מאוחד אחד שמרכז את **כל** מה שסוכם בשיחה + **כל הקוד**, כדי שאפשר יהיה
להמשיך את הפיתוח במקום הנכון (הריפו האמיתי של אפליקציית Pay Day).

> נכתב לאחר שהתברר שהקוד שעבדנו עליו יושב בריפו `rachelyashar-star/payday-app`,
> שהוא גרסה מצומצמת ושונה מהאפליקציה החיה. את הקוד והלוגיקה כאן צריך להעביר
> לקודבייס האמיתי.

---

## חלק 1 — רקע ומטרה
לבנות **קונקטור (גשר)** בין Pay Day ל‑**Priority ERP**, שמאפשר לקלוט חשבוניות ספק
מ‑Pay Day ל‑Priority. הקונקטור בנוי כ‑**MCP server** (Node.js) שעוטף את ה‑OData
REST API של Priority. הוא מומש ב‑JavaScript/CommonJS, ונבדק (בדיקות יחידה עוברות).

**מצב נוכחי:** הלוגיקה והכלים מומשו ונבדקו לוגית; שמות הישויות/שדות ב‑Priority
ופרטי החיבור צריכים אימות מול ההתקנה האמיתית (אי אפשר היה להתחבר כי הרשת בסביבת
הפיתוח הייתה חסומה).

---

## חלק 2 — ההחלטות שסוכמו (מרוכז)
1. **קליטה ≠ תשלום.** קליטת החשבוniot ל‑Priority נפרדת לחלוטין מאישורי התשלום.
   הטריגר הוא פעולת **"קליטה מהירה"**.
2. **הכל נכנס כטיוטה.** כל מסמך/תנועה נוצר כ**טיוטה** (לא סופי, בלי תנועות יומן
   סופיות). מעבר לאוטומציה מלאה רק אחרי שהלוגיקה תוכח ותדובג (יש דגלים בקוד).
3. **ספק חדש = ידני עם תצוגה מקדימה.** לא נפתח אוטומטית. מנהלת החשבונות לוחצת
   "הקמת ספק חדש", מוצגת **תצוגה מקדימה לאישור**, ורק אז נוצר.
4. **מספר ספק = עוקב לאחרון.** ממשיכים מהספק האחרון במערכת: שומרים את הקידומת
   ומוסיפים 1 למספר שאחרי המקף. דוגמה: `213-12` → `213-13`.
5. **חשבון הוצאה.** דרופדאון עם חיפוש בחשבונות קיימים + כפתור "פתיחת חשבון הוצאה
   חדש". מספר החשבון מוקלד **ידנית** ע"י מנהלת החשבונות; בודקים אם פנוי — אם תפוס
   חוסמים עם הודעה **"מספר החשבון תפוס"**.
6. **דדופ בתוך Pay Day קודם.** כל חשבונית נבדקת מול Pay Day לפני קריאות ל‑Priority
   (חיסכון בקריאות). כפילות → מסומנת, והפרטים נלקחים מהקיים.
7. **כל לקוח = חברה נפרדת בפריוריטי.** ה‑ID של הלקוח (מסך ניהול הלקוחות) הוא שם
   החברה, והוא הסגמנט האחרון בכתובת ה‑OData. החיבור פר‑לקוח.
8. **מספר תנועה + קישור.** תנועת טיוטה מקבלת מספר שמתחיל ב‑`T` (פריוריטי מייצר
   אותו). המספר חוזר ל‑Pay Day כ**קישור** שפותח את הרשומה ב‑Priority Web. כשהתנועה
   הופכת לסופית המספר משתנה למספר עם קידומת שנת המס (`26...`/`25...`).
9. **תאריך מאזן.** קובע את שנת המס: חשבונית מהחודש הנוכחי/הקודם → תאריך המאזן =
   תאריך החשבונית; חשבונית ישנה יותר → מנהלת החשבונות מזינה ידנית.
10. **עובדים דרך הדפדפן** (Priority Web), לא דסקטופ.

---

## חלק 3 — הלוגיקה המלאה (זרימת הקליטה)
1. **דדופ ב‑Pay Day** — כפילות (ספק + מספר חשבונית)? → סמן ככפולה, השתמש בקיים, סוף.
2. **בדיקת ספק ב‑Priority** — קיים? אם כן, בדוק אם החשבונית כבר קלוטה ב‑Priority;
   אם כן — למד מהרישום הקודם (חשבון הוצאה + שדות) לחשבוניות הבאות מאותו ספק.
3. **רישום עם למידה** — לספק מוכר, בחר חשבון הוצאה ושדות לפי חשבוניות קודמות.
   ביטחון נמוך → השאר לאישור אנושי (הטיוטה ממילא נבדקת).
4. **ספק לא קיים** — תצוגה מקדימה של ספק חדש (מספר עוקב) → אישור → יצירה. בחר/פתח
   חשבון הוצאה. "למד" את הספק להמשך.
5. **יצירת טיוטה** — צור את חשבונית הספק כטיוטה (header + שורה). שמור מספר תנועה +
   קישור. תאריך מאזן לפי הכלל.
6. **סנכרון חוזר** — תהליך מתוזמן + כפתור רענון ידני, שמעדכן ב‑Pay Day את הסטטוס
   והמספר הסופי כשהטיוטה הופכת לסופית (איתור לפי מפתח יציב, לא לפי המספר שמשתנה).

**טרם הוגדר:** חשבונית ששולמה באשראי (סעיף 6 בשיחה), ואיפה בדיוק נשמרת ה"למידה"
(מומלץ: פרופיל ספק ב‑Firestore שמוזרע מ‑Priority ומתעדכן).

---

## חלק 4 — מיפוי שדות Pay Day ↔ Priority (לאימות!)
| Pay Day | Priority (ניחוש — חובה לאמת) |
|---|---|
| שם ספק | `SUPPLIERS.SUPDES` ; מספר ספק `SUPNAME` |
| מספר חשבונית | `IVNUM` |
| תאריך חשבונית | `IVDATE` |
| תאריך לתשלום | `PAYDATE` |
| מטבע | `CODE` |
| סכום לפני מע"מ / מע"מ / סה"כ | שורה: `PRICE` / `VAT` ; כותרת: `TOTPRICE` |
| חשבון הוצאה | `ACCOUNTS.ACCNAME` / `ACCDES` |

> ⚠️ השמות תלויים בגרסה/שפה/התאמות של פריוריטי שלכם, ובמסך "כל החשבוניות" ייתכן
> ששם הישות שונה מ‑`PINVOICES`. כל השמות מרוכזים בקובץ `priorityConfig.js` — לאמת
> עם הכלי `priority_describe_entity` (שקורא ל‑`GetMetadataFor`) ולעדכן שם בלבד.

---

## חלק 5 — עובדות מפתח על Priority REST/OData
- כתובת בסיס: `https://{server}/odata/Priority/{tabula.ini}/{company}`.
- כל טופס = ישות; כל שדה = Property; כל תת‑טופס = NavigationProperty (subform).
- יצירה = `POST` לישות (אפשר header+שורות במערך מקונן). עדכון = `PATCH`. מחיקה = `DELETE`.
- הזדהות: **Basic Auth** עם "שם משתמש API" ייעודי, או **PAT** (username=token,
  password=`PAT`). OAuth2 רק ל‑SaaS עם מודול External ID.
- כל יצירה/עדכון = **טרנזקציה** (חבילות 10K/חודש). מגבלת קצב: **100 קריאות/דקה**,
  15 במקביל, timeout 3 דקות (אחרת 429). לכן בודקים ב‑Pay Day קודם.
- תאריכים בפורמט DateTimeOffset (`YYYY-MM-DDTHH:MM:SS+HH:MM`); עשרוני = נקודה.
- קישור לפתיחת רשומה (דסקטופ): `priority:priform@FORMNAME:DOCUMENTNUM:COMPANY:TABINIFILE:LANG`.
  ב‑**Web** אין פורמט מתועד — להעתיק URL אמיתי של חשבונית פתוחה כדי לזהות את התבנית.

---

## חלק 6 — פריטים פתוחים (לפני הפעלה אמיתית)
1. **חיבור + אימות שמות** — credentials + הרצת `priority_describe_entity` על
   `SUPPLIERS`, ישות החשבוניות, ו‑`ACCOUNTS`; עדכון `priorityConfig.js`.
2. **קישור ל‑Priority Web** — דוגמת URL אמיתית של חשבונית ספק פתוחה.
3. **ריפקטר חיבור פר‑חברה** — לבנות את כתובת הבסיס לכל לקוח לפי ה‑company.
4. **מנגנון הלמידה** — מימוש פרופיל ספק (Firestore) + סנכרון חוזר מתוזמן.
5. **סעיף 6** — חשבונית באשראי.

---

## חלק 7 — הקוד המלא
כל הקבצים תחת `connectors/priority/`. העתיקו אותם כמו שהם.

### `connectors/priority/package.json`
```json
{
  "name": "payday-priority-connector",
  "version": "1.0.0",
  "private": true,
  "description": "MCP connector for Priority ERP (OData REST API)",
  "main": "src/index.js",
  "type": "commonjs",
  "engines": {
    "node": ">=20"
  },
  "bin": {
    "payday-priority-connector": "src/index.js"
  },
  "scripts": {
    "start": "node src/index.js",
    "test": "node --test"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.12.0",
    "zod": "^3.23.8"
  }
}

```

### `connectors/priority/.env.example`
```bash
# Priority ERP OData API credentials for the MCP connector.
# Copy to ".env" and fill in real values, or pass these as environment
# variables in your MCP client config (see README.md). Never commit .env.

# Full OData base URL, including the environment .ini file and company.
# Format: https://<server>/odata/Priority/<tabula.ini>/<company>/
# Example (Priority demo cloud):
PRIORITY_BASE_URL=https://www.eshbelsaas.com/ui/odata/Priority/tabmob.ini/demo/

# Dedicated Priority API user (Basic Auth).
PRIORITY_USERNAME=your_api_user
PRIORITY_PASSWORD=your_api_password

```

### `connectors/priority/src/index.js`
```js
#!/usr/bin/env node
/**
 * index.js
 * Entry point for the Priority ERP MCP connector.
 *
 * Starts an MCP server over stdio so it can be plugged into Claude Code,
 * Claude Desktop, or any MCP-compatible client. See README.md for setup.
 *
 * To expose this as a *remote* connector (claude.ai) instead, swap the
 * StdioServerTransport below for the Streamable HTTP transport — the tool
 * definitions in tools.js stay exactly the same.
 */

'use strict';

const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { registerTools } = require('./tools');

async function main() {
  const server = new McpServer({
    name: 'payday-priority-connector',
    version: '1.0.0',
  });

  registerTools(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log to stderr only — stdout is reserved for the MCP protocol stream.
  console.error('[priority-connector] MCP server running on stdio');
}

main().catch((err) => {
  console.error('[priority-connector] Fatal error:', err);
  process.exit(1);
});

```

### `connectors/priority/src/priorityClient.js`
```js
/**
 * priorityClient.js
 * Thin client for the Priority ERP OData REST API.
 *
 * Priority exposes every screen/form as an OData entity set, reachable at:
 *   {PRIORITY_BASE_URL}/{ENTITY}?{$odata-query}
 *
 * Authentication is HTTP Basic Auth with a dedicated Priority API user.
 * Configure via environment variables (see .env.example):
 *   - PRIORITY_BASE_URL   e.g. https://www.eshbelsaas.com/ui/odata/Priority/tabmob.ini/demo/
 *   - PRIORITY_USERNAME
 *   - PRIORITY_PASSWORD
 *
 * Node 20+ is required (uses the global `fetch`).
 */

'use strict';

/**
 * Read configuration from the environment, validating required values.
 * @returns {{ baseUrl: string, authHeader: string }}
 */
function getConfig() {
  const baseUrl = process.env.PRIORITY_BASE_URL;
  const username = process.env.PRIORITY_USERNAME;
  const password = process.env.PRIORITY_PASSWORD;

  const missing = [];
  if (!baseUrl) missing.push('PRIORITY_BASE_URL');
  if (!username) missing.push('PRIORITY_USERNAME');
  if (!password) missing.push('PRIORITY_PASSWORD');
  if (missing.length) {
    throw new Error(
      `Missing Priority credentials: ${missing.join(', ')}. ` +
        'Set them as environment variables (see connectors/priority/.env.example).'
    );
  }

  // Ensure exactly one trailing slash so we can safely append the entity name.
  const normalizedBase = baseUrl.replace(/\/+$/, '') + '/';
  const authHeader =
    'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');

  return { baseUrl: normalizedBase, authHeader };
}

/**
 * Build the OData query string from a set of options.
 * Only options with a value are included.
 * @param {object} [opts]
 * @param {string} [opts.filter]   raw OData $filter expression
 * @param {string} [opts.select]   comma-separated field list for $select
 * @param {string} [opts.expand]   comma-separated relations for $expand
 * @param {string} [opts.orderby]  $orderby expression
 * @param {number} [opts.top]      max number of records ($top)
 * @returns {string} query string including a leading "?" or an empty string
 */
function buildQuery(opts = {}) {
  const params = new URLSearchParams();
  if (opts.filter) params.set('$filter', opts.filter);
  if (opts.select) params.set('$select', opts.select);
  if (opts.expand) params.set('$expand', opts.expand);
  if (opts.orderby) params.set('$orderby', opts.orderby);
  if (opts.top != null) params.set('$top', String(opts.top));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/**
 * Perform an authenticated request against the Priority OData API.
 * @param {string} method  HTTP method
 * @param {string} path    entity name plus optional query string
 * @param {object} [body]  JSON body for write requests
 * @returns {Promise<any>} parsed JSON response (or {} for empty bodies)
 */
async function request(method, path, body) {
  const { baseUrl, authHeader } = getConfig();
  const url = baseUrl + path.replace(/^\/+/, '');

  const headers = {
    Authorization: authHeader,
    Accept: 'application/json',
  };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  if (!res.ok) {
    // Priority returns a descriptive JSON error body; surface it verbatim.
    throw new Error(
      `Priority API ${method} ${path} failed (${res.status} ${res.statusText}): ${text}`
    );
  }

  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

/**
 * Escape a value for use inside an OData string literal.
 * Single quotes are doubled per the OData spec.
 * @param {string} value
 * @returns {string}
 */
function escapeODataString(value) {
  return String(value).replace(/'/g, "''");
}

/**
 * Read records from a Priority entity (read-only).
 * @param {string} entity   entity/form name, e.g. "CUSTOMERS", "ORDERS"
 * @param {object} [opts]   OData options (see buildQuery)
 * @returns {Promise<{ count: number, records: any[] }>}
 */
async function readRecords(entity, opts = {}) {
  const data = await request('GET', `${entity}${buildQuery(opts)}`);
  const records = Array.isArray(data.value) ? data.value : [];
  return { count: records.length, records };
}

/**
 * Create a new record in a Priority entity.
 * @param {string} entity  entity/form name
 * @param {object} fields  field/value map matching the Priority column names
 * @returns {Promise<any>} the created record as returned by Priority
 */
async function createRecord(entity, fields) {
  return request('POST', entity, fields);
}

/**
 * Free-text search over one or more fields of an entity.
 * Builds a case-insensitive `contains(...)` filter, combining multiple
 * fields with OR. Any extra OData options (top, select, orderby) are merged in.
 * @param {string} entity        entity/form name
 * @param {string} term          search term
 * @param {string[]} fields      fields to search within
 * @param {object} [opts]        extra OData options
 * @returns {Promise<{ count: number, records: any[] }>}
 */
async function searchRecords(entity, term, fields, opts = {}) {
  if (!fields || !fields.length) {
    throw new Error('searchRecords requires at least one field to search.');
  }
  const safeTerm = escapeODataString(term).toLowerCase();
  const filter = fields
    .map((f) => `contains(tolower(${f}),'${safeTerm}')`)
    .join(' or ');

  // Respect a caller-supplied filter by ANDing it with the search clause.
  const combinedFilter = opts.filter
    ? `(${opts.filter}) and (${filter})`
    : filter;

  return readRecords(entity, { ...opts, filter: combinedFilter });
}

module.exports = {
  getConfig,
  buildQuery,
  request,
  readRecords,
  createRecord,
  searchRecords,
};

```

### `connectors/priority/src/priorityConfig.js`
```js
/**
 * priorityConfig.js
 * Mapping between Pay Day data and Priority ERP entity/field names.
 *
 * ⚠️ IMPORTANT — VERIFY THESE NAMES AGAINST YOUR PRIORITY INSTALLATION.
 * The exact entity and field names depend on your Priority version, language,
 * and private customizations. Use the `priority_describe_entity` tool (which
 * calls Priority's GetMetadataFor(entity=...)) to confirm the real names and
 * which fields are mandatory before relying on the create flows in production.
 *
 * Everything that is installation-specific lives here, so adjusting to a real
 * Priority environment means editing this one file — not the logic.
 */

'use strict';

const PRIORITY = {
  // ─── Safety / rollout behavior ────────────────────────────────────
  // While we validate the integration, EVERYTHING created in Priority must
  // stay a DRAFT (טיוטה) — documents and their transactions are recorded as
  // DRAFT (non-final) only. No finalized documents and no FINAL journal
  // entries. The connector therefore only CREATES records and never runs a
  // finalize/post action. Suppliers are only created after explicit human
  // approval (preview-then-confirm). Flip these to true later, once the logic
  // is proven and debugged, to enable automatic finalization / final posting.
  behavior: {
    finalizeDocuments: false, // false = leave documents as Draft (טיוטה)
    finalizeTransactions: false, // false = draft (non-final) transactions only
    autoCreateSuppliers: false, // false = require bookkeeper approval first
  },

  // ─── Supplier master (ספקים) ──────────────────────────────────────
  supplier: {
    entity: 'SUPPLIERS', // A/P vendor master form
    keyField: 'SUPNAME', // supplier number, e.g. "213-12"  ⚠️ verify
    nameField: 'SUPDES', // supplier description / name      ⚠️ verify
    // Field used to determine the "last" supplier (most recently created).
    // CURDATE is the standard Priority creation date on most forms. ⚠️ verify
    dateField: 'CURDATE',
  },

  // ─── A/P (supplier / purchase) invoice (חשבונית ספק) ──────────────
  // In Priority Web these are viewed from the "כל החשבוניות" (All Invoices)
  // screen. The entity behind that screen may NOT be PINVOICES — confirm via
  // priority_describe_entity or a live Priority Web URL, then update `entity`.
  // ⚠️ Confirm the entity + all field/subform names below.
  apInvoice: {
    entity: 'PINVOICES',
    supplierField: 'SUPNAME', // link to the supplier
    invoiceNumberField: 'IVNUM', // the supplier's invoice number
    invoiceDateField: 'IVDATE', // invoice date           ⚠️ verify
    dueDateField: 'PAYDATE', // payment due date           ⚠️ verify
    currencyField: 'CODE', // currency code                ⚠️ verify
    totalField: 'TOTPRICE', // total incl. VAT             ⚠️ verify
    // Line-items subform and its fields. ⚠️ verify all of these.
    lineSubform: 'PINVOICEITEMS_SUBFORM',
    line: {
      preVatField: 'PRICE', // amount before VAT
      vatField: 'VAT', // VAT amount
      descriptionField: 'PARTDES', // free-text line description
    },
  },

  // ─── Expense / G-L accounts (חשבונות הוצאה / כרטיסי חשבון) ─────────
  // Unlike suppliers, expense-account numbers are NOT auto-incremented:
  // the bookkeeper types a number manually, and we only verify it is free
  // before creating (otherwise → "account number taken").
  expenseAccount: {
    entity: 'ACCOUNTS', // chart-of-accounts form           ⚠️ verify
    keyField: 'ACCNAME', // account number                  ⚠️ verify
    nameField: 'ACCDES', // account description             ⚠️ verify
    // Optional OData filter to limit results to EXPENSE accounts only
    // (the chart of accounts also holds assets, income, etc.). Leave empty
    // until the right field/value for expense accounts is confirmed. ⚠️ verify
    expenseFilter: '',
  },

  // Map Pay Day currency codes (ILS/USD/EUR/GBP) to Priority currency codes.
  // ⚠️ Priority currency codes are configured per installation — confirm them.
  currencyMap: {
    ILS: 'ILS',
    USD: 'USD',
    EUR: 'EUR',
    GBP: 'GBP',
  },
};

module.exports = { PRIORITY };

```

### `connectors/priority/src/supplierNumbering.js`
```js
/**
 * supplierNumbering.js
 * Pure logic for computing the next supplier number in Priority.
 *
 * Business rule (decided with the user):
 *   Supplier numbers look like "PREFIX-SEQ", where PREFIX is a group number
 *   (typically 200–300) and SEQ is a running number, e.g. "213-12".
 *   A new supplier continues from the LAST supplier in the system overall:
 *   keep the prefix of the last supplier and increment the sequence by 1.
 *   e.g. last "213-12"  ->  next "213-13".
 *
 * This module is pure (no I/O) so it can be unit-tested in isolation.
 */

'use strict';

/**
 * Parse a Priority supplier number into its parts.
 * @param {string} raw e.g. "213-12"
 * @returns {{ raw: string, hasDash: boolean, prefix: string|null,
 *             seq: number, seqWidth: number }}
 */
function parseSupplierNumber(raw) {
  const value = String(raw == null ? '' : raw).trim();
  const dash = value.lastIndexOf('-');
  if (dash <= 0 || dash === value.length - 1) {
    // No usable "PREFIX-SEQ" shape — treat the whole thing as the sequence.
    const seq = Number(value);
    return {
      raw: value,
      hasDash: false,
      prefix: null,
      seq: Number.isFinite(seq) ? seq : NaN,
      seqWidth: value.length,
    };
  }
  const prefix = value.slice(0, dash);
  const seqStr = value.slice(dash + 1);
  const seq = Number(seqStr);
  return {
    raw: value,
    hasDash: true,
    prefix,
    seq: Number.isFinite(seq) ? seq : NaN,
    seqWidth: seqStr.length,
  };
}

/**
 * Format a supplier number from parts, preserving zero-padding width.
 * @param {string} prefix
 * @param {number} seq
 * @param {number} seqWidth minimum width of the sequence (zero-padded)
 * @returns {string}
 */
function formatSupplierNumber(prefix, seq, seqWidth) {
  const seqStr = String(seq).padStart(seqWidth || 0, '0');
  return `${prefix}-${seqStr}`;
}

/**
 * Compute the next supplier number, given the last/highest existing one.
 * @param {string} lastSupplierNumber e.g. "213-12"
 * @returns {string} e.g. "213-13"
 * @throws if the input cannot be parsed into a number to increment
 */
function computeNextSupplierNumber(lastSupplierNumber) {
  const parsed = parseSupplierNumber(lastSupplierNumber);
  if (Number.isNaN(parsed.seq)) {
    throw new Error(
      `Cannot compute next supplier number from "${lastSupplierNumber}": ` +
        'the part after the dash is not numeric. Confirm the supplier numbering format.'
    );
  }
  if (!parsed.hasDash) {
    // Fallback: pure number, just increment, preserving width.
    return String(parsed.seq + 1).padStart(parsed.seqWidth, '0');
  }
  return formatSupplierNumber(parsed.prefix, parsed.seq + 1, parsed.seqWidth);
}

/**
 * Compare two supplier numbers numerically (prefix first, then sequence),
 * so that "213-12" sorts after "213-9" (unlike a plain string sort).
 * @returns {number} negative if a<b, positive if a>b, 0 if equal
 */
function compareSupplierNumbers(a, b) {
  const pa = parseSupplierNumber(a);
  const pb = parseSupplierNumber(b);
  const prefA = Number(pa.prefix);
  const prefB = Number(pb.prefix);
  if (Number.isFinite(prefA) && Number.isFinite(prefB) && prefA !== prefB) {
    return prefA - prefB;
  }
  if (pa.prefix !== pb.prefix && !(Number.isFinite(prefA) && Number.isFinite(prefB))) {
    return String(pa.prefix).localeCompare(String(pb.prefix));
  }
  return (pa.seq || 0) - (pb.seq || 0);
}

/**
 * Pick the "last" supplier from a list of supplier records.
 * Prefers the most recently created record (by the configured date field);
 * if no usable dates are present, falls back to the highest supplier number.
 *
 * @param {object[]} suppliers records from Priority's SUPPLIERS entity
 * @param {object} fields { keyField, dateField }
 * @returns {object|null} the chosen supplier record, or null if list is empty
 */
function pickLastSupplier(suppliers, { keyField, dateField }) {
  if (!Array.isArray(suppliers) || suppliers.length === 0) return null;

  const withDates = dateField
    ? suppliers.filter((s) => s[dateField])
    : [];

  if (withDates.length === suppliers.length && withDates.length > 0) {
    // All records have a creation date — trust it (most recently created).
    return [...withDates].sort(
      (a, b) => new Date(b[dateField]) - new Date(a[dateField])
    )[0];
  }

  // Fallback: highest supplier number.
  return [...suppliers].sort((a, b) =>
    compareSupplierNumbers(b[keyField], a[keyField])
  )[0];
}

module.exports = {
  parseSupplierNumber,
  formatSupplierNumber,
  computeNextSupplierNumber,
  compareSupplierNumbers,
  pickLastSupplier,
};

```

### `connectors/priority/src/payday.js`
```js
/**
 * payday.js
 * High-level Pay Day → Priority operations, wiring together the OData client,
 * the field mapping (priorityConfig) and the supplier-numbering logic.
 *
 * Rollout safety (per the user's decisions):
 *   - Suppliers are NEVER created automatically. The flow is two-step:
 *       1) previewNewSupplier()  → read-only, returns what WOULD be created
 *       2) createSupplier()      → writes, only after the bookkeeper approves
 *   - Every document (invoice) is created as a DRAFT (טיוטה). The connector
 *     never finalizes a document or posts journal entries. See
 *     PRIORITY.behavior in priorityConfig.js.
 */

'use strict';

const { readRecords, createRecord } = require('./priorityClient');
const { PRIORITY } = require('./priorityConfig');
const {
  computeNextSupplierNumber,
  pickLastSupplier,
} = require('./supplierNumbering');

/** Escape a value for use inside an OData string literal. */
function odataString(value) {
  return String(value).replace(/'/g, "''");
}

/** Convert "YYYY-MM-DD" to Priority's DateTimeOffset (UTC midnight). */
function toPriorityDate(dateStr) {
  if (!dateStr) return undefined;
  // Already a full datetime? pass through.
  if (/T/.test(dateStr)) return dateStr;
  return `${dateStr}T00:00:00Z`;
}

/**
 * Find suppliers whose name contains the given text (case-insensitive).
 * @param {string} name
 * @returns {Promise<{ count: number, records: object[] }>}
 */
async function findSupplierByName(name) {
  const { entity, keyField, nameField } = PRIORITY.supplier;
  const filter = `contains(tolower(${nameField}),'${odataString(name).toLowerCase()}')`;
  return readRecords(entity, {
    filter,
    select: `${keyField},${nameField}`,
    top: 20,
  });
}

/**
 * Fetch the "last" supplier in the system (most recently created, or, if no
 * usable creation dates are available, the highest supplier number).
 * @returns {Promise<object|null>}
 */
async function getLastSupplier() {
  const { entity, keyField, dateField } = PRIORITY.supplier;

  // Primary: order by creation date descending and take the newest one.
  if (dateField) {
    try {
      const { records } = await readRecords(entity, {
        orderby: `${dateField} desc`,
        top: 1,
        select: `${keyField},${dateField}`,
      });
      if (records.length) return records[0];
    } catch {
      // dateField may not exist on this installation — fall through.
    }
  }

  // Fallback: pull a batch and compute the highest number numerically.
  const { records } = await readRecords(entity, {
    select: keyField,
    top: 500,
  });
  return pickLastSupplier(records, { keyField, dateField });
}

/**
 * Build a PREVIEW of a new supplier — what would be created — WITHOUT writing
 * anything to Priority. The bookkeeper must approve this before createSupplier.
 * @param {string} supplierName
 * @returns {Promise<object>}
 */
async function previewNewSupplier(supplierName) {
  const { keyField, nameField } = PRIORITY.supplier;

  // Don't propose a duplicate if a matching supplier already exists.
  const existing = await findSupplierByName(supplierName);
  if (existing.count > 0) {
    return {
      action: 'none',
      reason: 'A supplier with a similar name already exists.',
      matches: existing.records,
    };
  }

  const last = await getLastSupplier();
  if (!last) {
    return {
      action: 'preview',
      warning:
        'No existing suppliers found to continue numbering from. Confirm the first supplier number manually.',
      preview: { [keyField]: null, [nameField]: supplierName },
    };
  }

  const lastNumber = last[keyField];
  const nextNumber = computeNextSupplierNumber(lastNumber);

  return {
    action: 'preview',
    requiresApproval: true,
    basedOnLastSupplier: lastNumber,
    preview: {
      [keyField]: nextNumber,
      [nameField]: supplierName,
    },
    note:
      `This is a PREVIEW only — nothing was created. ` +
      `If the bookkeeper approves, call priority_create_supplier with this exact record.`,
  };
}

/**
 * Actually create a supplier in Priority. Call this ONLY after the preview
 * from previewNewSupplier() has been approved by the bookkeeper.
 * @param {object} supplierRecord e.g. { SUPNAME: "213-13", SUPDES: "ACME Ltd" }
 * @returns {Promise<{ created: true, record: object }>}
 */
async function createSupplier(supplierRecord) {
  const { entity, keyField } = PRIORITY.supplier;
  if (!supplierRecord || !supplierRecord[keyField]) {
    throw new Error(
      `createSupplier requires a record with a ${keyField}. ` +
        'Get it from previewNewSupplier() and have it approved first.'
    );
  }
  const record = await createRecord(entity, supplierRecord);
  return { created: true, record };
}

/**
 * Search existing expense / G-L accounts by number or description, for the
 * "expense account" dropdown shown when capturing a new supplier's invoice.
 * @param {string} [term] number or description fragment (empty = list top accounts)
 * @returns {Promise<{ count: number, records: object[] }>}
 */
async function searchExpenseAccounts(term) {
  const { entity, keyField, nameField, expenseFilter } = PRIORITY.expenseAccount;
  const clauses = [];
  if (term) {
    const t = odataString(term).toLowerCase();
    clauses.push(
      `(contains(tolower(${keyField}),'${t}') or contains(tolower(${nameField}),'${t}'))`
    );
  }
  if (expenseFilter) clauses.push(`(${expenseFilter})`);
  return readRecords(entity, {
    filter: clauses.join(' and ') || undefined,
    select: `${keyField},${nameField}`,
    top: 50,
  });
}

/**
 * Check whether an expense-account number is free (not yet in use).
 * @param {string} accountNumber
 * @returns {Promise<{ available: boolean, existing: object|null }>}
 */
async function isExpenseAccountAvailable(accountNumber) {
  const { entity, keyField, nameField } = PRIORITY.expenseAccount;
  const { count, records } = await readRecords(entity, {
    filter: `${keyField} eq '${odataString(accountNumber)}'`,
    select: `${keyField},${nameField}`,
    top: 1,
  });
  return { available: count === 0, existing: count > 0 ? records[0] : null };
}

/**
 * Create a new expense account with a bookkeeper-chosen number, after first
 * verifying the number is free. Throws "account number taken" if it isn't.
 * @param {string} accountNumber the number the bookkeeper typed
 * @param {string} accountName   the account description
 * @returns {Promise<{ created: true, record: object }>}
 */
async function createExpenseAccount(accountNumber, accountName) {
  const { entity, keyField, nameField } = PRIORITY.expenseAccount;
  if (!accountNumber) {
    throw new Error('createExpenseAccount requires an account number.');
  }
  const { available, existing } = await isExpenseAccountAvailable(accountNumber);
  if (!available) {
    throw new Error(
      `מספר החשבון תפוס — account number ${accountNumber} is already taken` +
        (existing && existing[nameField] ? ` ("${existing[nameField]}").` : '.')
    );
  }
  const record = await createRecord(entity, {
    [keyField]: accountNumber,
    [nameField]: accountName,
  });
  return { created: true, record };
}

/**
 * Check whether a supplier invoice already exists (dedup), to avoid 409
 * conflicts and double-posting.
 * @param {string} supplierNumber
 * @param {string} invoiceNumber
 */
async function checkInvoiceExists(supplierNumber, invoiceNumber) {
  const { entity, supplierField, invoiceNumberField } = PRIORITY.apInvoice;
  const filter =
    `${supplierField} eq '${odataString(supplierNumber)}' and ` +
    `${invoiceNumberField} eq '${odataString(invoiceNumber)}'`;
  const { count, records } = await readRecords(entity, { filter, top: 5 });
  return { exists: count > 0, records };
}

/**
 * Create a supplier (A/P) invoice in Priority as a DRAFT.
 * Requires the supplier to already exist (we never auto-create suppliers).
 * Performs a duplicate check first.
 *
 * @param {object} inv
 * @param {string} inv.supplierNumber  existing Priority SUPNAME
 * @param {string} inv.invoiceNumber   supplier's invoice number (IVNUM)
 * @param {string} [inv.invoiceDate]   "YYYY-MM-DD"
 * @param {string} [inv.dueDate]       "YYYY-MM-DD"
 * @param {string} [inv.currency]      Pay Day currency code (ILS/USD/EUR/GBP)
 * @param {number} [inv.amountPreVat]
 * @param {number} [inv.vatAmount]
 * @param {number} [inv.totalAmount]
 * @param {string} [inv.description]
 * @returns {Promise<object>}
 */
async function createSupplierInvoiceDraft(inv) {
  const cfg = PRIORITY.apInvoice;

  // Guard: this connector intentionally only creates DRAFTS.
  if (PRIORITY.behavior.finalizeDocuments || PRIORITY.behavior.finalizeTransactions) {
    throw new Error(
      'Finalization/journal posting is enabled in config, but this connector ' +
        'version only supports creating drafts. Implement the finalize step explicitly.'
    );
  }

  // 1) Dedup.
  const dup = await checkInvoiceExists(inv.supplierNumber, inv.invoiceNumber);
  if (dup.exists) {
    return {
      created: false,
      reason: 'duplicate',
      message: `Invoice ${inv.invoiceNumber} for supplier ${inv.supplierNumber} already exists in Priority.`,
      existing: dup.records,
    };
  }

  // 2) Build the draft document (header + one line in the subform).
  const body = {
    [cfg.supplierField]: inv.supplierNumber,
    [cfg.invoiceNumberField]: inv.invoiceNumber,
  };
  if (inv.invoiceDate) body[cfg.invoiceDateField] = toPriorityDate(inv.invoiceDate);
  if (inv.dueDate) body[cfg.dueDateField] = toPriorityDate(inv.dueDate);
  if (inv.currency) {
    body[cfg.currencyField] = PRIORITY.currencyMap[inv.currency] || inv.currency;
  }
  if (inv.totalAmount != null) body[cfg.totalField] = inv.totalAmount;

  const line = {};
  if (inv.amountPreVat != null) line[cfg.line.preVatField] = inv.amountPreVat;
  if (inv.vatAmount != null) line[cfg.line.vatField] = inv.vatAmount;
  if (inv.description) line[cfg.line.descriptionField] = inv.description;
  if (Object.keys(line).length > 0) body[cfg.lineSubform] = [line];

  // 3) Create. We do NOT call any finalize/post action → stays a Draft.
  const record = await createRecord(cfg.entity, body);
  return {
    created: true,
    draft: true,
    note: 'Created as a DRAFT (טיוטה). Not finalized, no journal entries posted.',
    record,
  };
}

module.exports = {
  findSupplierByName,
  getLastSupplier,
  previewNewSupplier,
  createSupplier,
  searchExpenseAccounts,
  isExpenseAccountAvailable,
  createExpenseAccount,
  checkInvoiceExists,
  createSupplierInvoiceDraft,
  // exported for testing / reuse
  toPriorityDate,
  odataString,
};

```

### `connectors/priority/src/tools.js`
```js
/**
 * tools.js
 * MCP tools for the Pay Day → Priority connector.
 *
 * The tools mirror the agreed business logic:
 *   - Suppliers are created in two steps: preview (read-only) → create (after
 *     bookkeeper approval). They are never created automatically.
 *   - Invoices are pushed once approved in Pay Day, created as DRAFTS only
 *     (no finalization, no final journal entries).
 *   - Duplicates are checked before creating an invoice.
 *
 * Field/entity names live in priorityConfig.js and must be verified against
 * the real Priority installation (use priority_describe_entity).
 */

'use strict';

const { z } = require('zod');
const { readRecords, request } = require('./priorityClient');
const {
  findSupplierByName,
  previewNewSupplier,
  createSupplier,
  searchExpenseAccounts,
  isExpenseAccountAvailable,
  createExpenseAccount,
  checkInvoiceExists,
  createSupplierInvoiceDraft,
} = require('./payday');

/** Wrap a value as a single text content block (pretty JSON). */
function textResult(value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  return { content: [{ type: 'text', text }] };
}

/** Wrap an error as an MCP tool error result so Claude can adjust. */
function errorResult(err) {
  const message = err instanceof Error ? err.message : String(err);
  return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
}

/** Run a handler, converting thrown errors into tool error results. */
function safe(handler) {
  return async (args) => {
    try {
      return textResult(await handler(args));
    } catch (err) {
      return errorResult(err);
    }
  };
}

/**
 * Register all Pay Day → Priority tools on the given MCP server.
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 */
function registerTools(server) {
  // ─── Discovery: confirm real field names ──────────────────────────
  server.registerTool(
    'priority_describe_entity',
    {
      title: 'Describe a Priority entity',
      description:
        'Return the metadata (fields, types, mandatory flags) for a Priority ' +
        'entity via GetMetadataFor. Use this to confirm the real field names ' +
        'before relying on the create flows.',
      inputSchema: {
        entity: z.string().describe('Top-level entity name, e.g. "SUPPLIERS" or "PINVOICES".'),
      },
    },
    safe(async ({ entity }) =>
      request('GET', `GetMetadataFor(entity='${entity.replace(/'/g, "''")}')`)
    )
  );

  // ─── Suppliers ────────────────────────────────────────────────────
  server.registerTool(
    'priority_find_supplier',
    {
      title: 'Find a supplier',
      description:
        'Search the Priority supplier master by name (case-insensitive). ' +
        'Use this first to check whether a vendor already exists before creating one.',
      inputSchema: {
        name: z.string().describe('Supplier name or fragment to search for.'),
      },
    },
    safe(async ({ name }) => findSupplierByName(name))
  );

  server.registerTool(
    'priority_preview_new_supplier',
    {
      title: 'Preview a new supplier (no write)',
      description:
        'PREVIEW ONLY — does NOT create anything. Computes the next supplier ' +
        'number (continuing from the last supplier in the system: same prefix, ' +
        'sequence + 1, e.g. 213-12 → 213-13) and returns the record that WOULD ' +
        'be created. The bookkeeper must approve this preview before you call ' +
        'priority_create_supplier.',
      inputSchema: {
        name: z.string().describe('Name for the new supplier (from the invoice vendor).'),
      },
    },
    safe(async ({ name }) => previewNewSupplier(name))
  );

  server.registerTool(
    'priority_create_supplier',
    {
      title: 'Create a supplier (after approval)',
      description:
        'Creates a supplier in Priority. Call this ONLY after a bookkeeper has ' +
        'approved the preview from priority_preview_new_supplier. Pass the exact ' +
        'record from that preview.',
      inputSchema: {
        supplierRecord: z
          .record(z.any())
          .describe('The approved supplier record, e.g. { "SUPNAME": "213-13", "SUPDES": "ACME Ltd" }.'),
      },
    },
    safe(async ({ supplierRecord }) => createSupplier(supplierRecord))
  );

  // ─── Expense accounts ─────────────────────────────────────────────
  server.registerTool(
    'priority_search_expense_accounts',
    {
      title: 'Search expense accounts',
      description:
        'Search the chart of accounts for expense accounts by number or ' +
        'description (for the dropdown shown when assigning an account to a ' +
        'new supplier/invoice). Empty term lists the top accounts. Read-only.',
      inputSchema: {
        term: z.string().optional().describe('Account number or description fragment.'),
      },
    },
    safe(async ({ term }) => searchExpenseAccounts(term))
  );

  server.registerTool(
    'priority_check_account_available',
    {
      title: 'Check expense-account number availability',
      description:
        'Check whether an expense-account number is free before opening a new ' +
        'account. Returns { available, existing }.',
      inputSchema: {
        accountNumber: z.string().describe('The account number to check.'),
      },
    },
    safe(async ({ accountNumber }) => isExpenseAccountAvailable(accountNumber))
  );

  server.registerTool(
    'priority_create_expense_account',
    {
      title: 'Create a new expense account',
      description:
        'Open a new expense account with a bookkeeper-chosen number. Verifies ' +
        'the number is free first; if it is already taken, fails with ' +
        '"account number taken" (מספר החשבון תפוס).',
      inputSchema: {
        accountNumber: z.string().describe('The account number the bookkeeper typed.'),
        accountName: z.string().describe('The account description/name.'),
      },
    },
    safe(async ({ accountNumber, accountName }) =>
      createExpenseAccount(accountNumber, accountName)
    )
  );

  // ─── Invoices ─────────────────────────────────────────────────────
  server.registerTool(
    'priority_check_invoice_exists',
    {
      title: 'Check if a supplier invoice exists',
      description:
        'Duplicate check: returns whether a supplier invoice with the given ' +
        'supplier number and invoice number already exists in Priority.',
      inputSchema: {
        supplierNumber: z.string().describe('Priority supplier number (SUPNAME).'),
        invoiceNumber: z.string().describe("The supplier's invoice number (IVNUM)."),
      },
    },
    safe(async ({ supplierNumber, invoiceNumber }) =>
      checkInvoiceExists(supplierNumber, invoiceNumber)
    )
  );

  server.registerTool(
    'priority_create_supplier_invoice',
    {
      title: 'Create a supplier invoice (DRAFT)',
      description:
        'Creates a captured Pay Day invoice in Priority as a supplier (A/P) ' +
        'invoice. Capture is independent of payment approval. The supplier ' +
        'must already exist (use priority_find_supplier; if missing, preview + ' +
        'create the supplier first). Runs a duplicate check, then creates the ' +
        'document as a DRAFT (טיוטה) — it is NOT finalized and NO final journal ' +
        'entries are posted.',
      inputSchema: {
        supplierNumber: z.string().describe('Existing Priority supplier number (SUPNAME).'),
        invoiceNumber: z.string().describe("The supplier's invoice number (IVNUM)."),
        invoiceDate: z.string().optional().describe('Invoice date "YYYY-MM-DD".'),
        dueDate: z.string().optional().describe('Payment due date "YYYY-MM-DD".'),
        currency: z
          .enum(['ILS', 'USD', 'EUR', 'GBP'])
          .optional()
          .describe('Pay Day currency code.'),
        amountPreVat: z.number().optional().describe('Amount before VAT.'),
        vatAmount: z.number().optional().describe('VAT amount.'),
        totalAmount: z.number().optional().describe('Total including VAT.'),
        description: z.string().optional().describe('Line description.'),
      },
    },
    safe(async (args) => createSupplierInvoiceDraft(args))
  );

  // ─── Generic read (fallback / ad-hoc queries) ─────────────────────
  server.registerTool(
    'priority_read_records',
    {
      title: 'Read Priority records',
      description:
        'Read records from any Priority entity with OData options ' +
        '($filter, $select, $expand, $orderby, $top). Read-only.',
      inputSchema: {
        entity: z.string().describe('Entity/form name, e.g. "SUPPLIERS".'),
        filter: z.string().optional().describe('OData $filter expression.'),
        select: z.string().optional().describe('Comma-separated fields ($select).'),
        expand: z.string().optional().describe('Comma-separated subforms ($expand).'),
        orderby: z.string().optional().describe('Order expression, e.g. "CURDATE desc".'),
        top: z.number().int().positive().max(500).optional().describe('Max records (≤500).'),
      },
    },
    safe(async ({ entity, filter, select, expand, orderby, top }) =>
      readRecords(entity, { filter, select, expand, orderby, top: top ?? 50 })
    )
  );
}

module.exports = { registerTools };

```

### `connectors/priority/test/supplierNumbering.test.js`
```js
/**
 * Tests for the supplier-numbering logic (node:test, no deps).
 * Run with: node --test
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const {
  parseSupplierNumber,
  computeNextSupplierNumber,
  compareSupplierNumbers,
  pickLastSupplier,
} = require('../src/supplierNumbering');

test('parseSupplierNumber splits prefix and sequence', () => {
  const p = parseSupplierNumber('213-12');
  assert.equal(p.prefix, '213');
  assert.equal(p.seq, 12);
  assert.equal(p.seqWidth, 2);
  assert.equal(p.hasDash, true);
});

test('computeNextSupplierNumber increments the sequence, keeps the prefix', () => {
  assert.equal(computeNextSupplierNumber('213-12'), '213-13');
  assert.equal(computeNextSupplierNumber('250-1'), '250-2');
  assert.equal(computeNextSupplierNumber('299-99'), '299-100');
});

test('computeNextSupplierNumber preserves zero-padding width', () => {
  assert.equal(computeNextSupplierNumber('213-09'), '213-10');
  assert.equal(computeNextSupplierNumber('200-001'), '200-002');
});

test('computeNextSupplierNumber throws on a non-numeric sequence', () => {
  assert.throws(() => computeNextSupplierNumber('213-AB'));
});

test('compareSupplierNumbers sorts numerically, not lexically', () => {
  // "213-9" must be considered LESS than "213-12" (string sort would reverse this)
  assert.ok(compareSupplierNumbers('213-9', '213-12') < 0);
  // higher prefix wins
  assert.ok(compareSupplierNumbers('250-1', '213-99') > 0);
});

test('pickLastSupplier prefers the most recently created when dates are present', () => {
  const suppliers = [
    { SUPNAME: '213-12', CURDATE: '2026-01-01T00:00:00Z' },
    { SUPNAME: '213-05', CURDATE: '2026-05-20T00:00:00Z' }, // newest
    { SUPNAME: '213-11', CURDATE: '2026-03-10T00:00:00Z' },
  ];
  const last = pickLastSupplier(suppliers, { keyField: 'SUPNAME', dateField: 'CURDATE' });
  assert.equal(last.SUPNAME, '213-05');
  // and the next number continues from that one
  assert.equal(computeNextSupplierNumber(last.SUPNAME), '213-06');
});

test('pickLastSupplier falls back to highest number when dates are missing', () => {
  const suppliers = [
    { SUPNAME: '213-9' },
    { SUPNAME: '213-12' }, // highest, despite "9" looking bigger lexically
    { SUPNAME: '213-3' },
  ];
  const last = pickLastSupplier(suppliers, { keyField: 'SUPNAME', dateField: 'CURDATE' });
  assert.equal(last.SUPNAME, '213-12');
});

```

---

## חלק 8 — איך לשלב במקום הנכון
1. **העתיקו את תיקיית הקוד** (כל הקבצים מחלק 7) אל הקודבייס האמיתי של Pay Day,
   למשל תחת `connectors/priority/`.
2. **התקנה והרצת בדיקות:**
   ```bash
   cd connectors/priority
   npm install
   npm test          # בדיקות מספור הספק — אמורות לעבור
   ```
3. **הגדרת חיבור** (קובץ `.env` או env vars):
   ```
   PRIORITY_BASE_URL=https://<server>/odata/Priority/<tabula.ini>/<company>/
   PRIORITY_USERNAME=<API user / PAT>
   PRIORITY_PASSWORD=<password / "PAT">
   ```
4. **אימות שמות** — חברו והריצו `priority_describe_entity` על `SUPPLIERS`,
   ישות החשבוניות (מ"כל החשבוniot"), ו‑`ACCOUNTS`; עדכנו את `priorityConfig.js`.
5. **חיבור ל‑Claude** (לבדיקה ידנית):
   ```bash
   claude mcp add priority \
     -e PRIORITY_BASE_URL="..." -e PRIORITY_USERNAME="..." -e PRIORITY_PASSWORD="..." \
     -- node /absolute/path/connectors/priority/src/index.js
   ```
6. **חיבור לאפליקציה** — חברו את כפתורי "קליטה מהירה" / "הקמת ספק חדש" לקריאות
   לכלים המתאימים. ריבוי לקוחות: בנו את `company` בכתובת הבסיס פר‑לקוח.

## חלק 9 — רשימת הכלים שהקונקטור חושף
| כלי | כותב? | תפקיד |
|---|:--:|---|
| `priority_describe_entity` | לא | שמות שדות אמיתיים (GetMetadataFor) |
| `priority_find_supplier` | לא | חיפוש ספק לפי שם |
| `priority_preview_new_supplier` | לא | תצוגה מקדימה + מספר עוקב (דורש אישור) |
| `priority_create_supplier` | כן | יצירת ספק אחרי אישור |
| `priority_search_expense_accounts` | לא | חיפוש חשבונות הוצאה (דרופדאון) |
| `priority_check_account_available` | לא | האם מספר חשבון פנוי |
| `priority_create_expense_account` | כן | פתיחת חשבון הוצאה (מספר ידני) |
| `priority_check_invoice_exists` | לא | דדופ חשבונית |
| `priority_create_supplier_invoice` | כן | יצירת חשבונית כטיוטה |
| `priority_read_records` | לא | קריאה גנרית (OData) |

## מקורות (תיעוד Priority)
- REST API: https://prioritysoftware.github.io/restapi/
- אימות: https://prioritysoftware.github.io/restapi/authenticate/
- פתיחת רשומה מקישור: https://prioritysoftware.github.io/sdk/Activating-From-External-Applications
