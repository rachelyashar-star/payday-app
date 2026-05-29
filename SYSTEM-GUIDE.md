# מדריך המערכת — Pay Day

מדריך כולל למערכת **Pay Day**: ניהול, קליטה ועיבוד של חשבוניות ספק, ואינטגרציה
ל‑Priority ERP.

> נספחים טכניים לאינטגרציית פריוריטי: ראו
> [`connectors/priority/LOGIC.md`](./connectors/priority/LOGIC.md),
> [`connectors/priority/DESIGN.md`](./connectors/priority/DESIGN.md),
> [`connectors/priority/README.md`](./connectors/priority/README.md).

---

## 1. מה המערכת עושה
Pay Day היא מערכת **רב‑לקוחית (multi-tenant)** לקליטה אוטומטית של חשבוניות ספק:
העלאה/סריקה → חילוץ נתונים ב‑AI → חוקים עסקיים → אישור → מעקב תשלום → דוח חודשי,
ובהמשך **קליטה ל‑Priority** כתנועת טיוטה.

## 2. תפקידים והרשאות
- **מנהל (admin):** גישה לכל הלקוחות, ניהול לקוחות והגדרות.
- **לקוח (client):** גישה ללקוח (tenant) שלו בלבד (נאכף ב‑middleware וב‑Firestore rules).
- ההפרדה נשמרת ב‑custom claims של המשתמש (`role`, `tenantId`).

## 3. המסכים (אפליקציית הווב)
| מסך | נתיב | למי |
|---|---|---|
| התחברות | `/login` | כולם |
| לוח בקרה | `/admin` | מנהל |
| ניהול לקוחות | `/admin/tenants` | מנהל |
| חשבוניות | `/invoices` | כולם |
| היסטוריה | `/history` | כולם |

(הניווט מוגדר ב‑`frontend/src/App.jsx` ו‑`Header.jsx`.)

## 4. מבנה הנתונים (Firestore)
היררכיה מתוחמת ללקוח:
```
tenants/{tenantId}/
  ├─ invoices/{invoiceId}
  ├─ settings/app
  ├─ monthReports/{reportKey}
  └─ users/{uid}
```
**שדות חשבונית עיקריים:** `vendor_name`, `invoice_number`, `invoice_date`,
`due_date`, `amount_pre_vat`, `vat_amount`, `total_amount`, `currency`,
`description`, `payment_details`, `status`, `clientApproved`, `paid`,
`uploadedToBank`, `department`, `paymentMethod`, `monthReport`.

**הגדרות לקוח (`settings/app`):** `currencies`, `autoPayRules`, `departments`,
`companyName`, `webAppUrl`.

## 5. מחזור חיי החשבונית
1. **קליטה** — העלאה/סריקה מ‑Google Drive.
2. **חילוץ AI** — Gemini מחלץ ספק, סכומים, מע"מ, תאריכים, מטבע.
3. **חוקים עסקיים** (`functions/src/services/businessLogic.js`) קובעים סטטוס:
   - `AUTO_PAID_AI` — זוהתה כמשולמת / מנוי SaaS.
   - `AUTO_PAID_CC` — תואמת חוק אישור אוטומטי לספק.
   - `DUPLICATE_FLAG` — חשד לכפילות (ספק + סכום).
   - `PENDING_CLIENT` — ממתינה לאישור לקוח.
4. **אישור לקוח** — מוסיף `clientApproved`, `department`, `paymentMethod`, הערות.
5. **מעקב תשלום** — `paid` / `uploadedToBank` (טריגר מעדכן `paidAt`).
6. **דוח חודשי** — אגרגציה לפי תקופה/מטבע.

## 6. אינטגרציות חיצוניות
| שירות | תפקיד | מודול |
|---|---|---|
| Google Gemini | חילוץ חשבוניות (AI) | `functions/src/services/gemini.js` |
| Google Drive | ניהול קבצים | `functions/src/services/drive.js` |
| Gmail | טיוטות מייל אישור | `functions/src/services/gmail.js` |
| **Priority ERP** | קליטת חשבוניות כטיוטה | `connectors/priority/` |

---

## 7. אינטגרציית Priority (קליטת חשבוניות)
**עיקרון:** הקליטה ל‑Priority **נפרדת מאישורי התשלום**. הטריגר הוא "קליטה מהירה",
והכל נכנס כ**טיוטה** בלבד (לא סופי, בלי תנועות יומן סופיות) עד שהלוגיקה תוכח.

**כל לקוח = חברה נפרדת בפריוריטי.** ה‑ID של הלקוח (מסך ניהול הלקוחות) הוא שם החברה,
והוא הסגמנט האחרון בכתובת ה‑OData.

**הזרימה (מתומצת — הפירוט ב‑`LOGIC.md`):**
1. דדופ בתוך Pay Day קודם (חיסכון בקריאות) — כפילות → סימון ושימוש בקיים.
2. בדיקת ספק בפריוריטי; אם קלוטה כבר — למידה מהרישום הקודם.
3. רישום עם למידה: בחירת חשבון הוצאה ושדות מחשבוניות קודמות של אותו ספק.
4. ספק חדש = הקמה ידנית עם **תצוגה מקדימה ואישור**; מספר עוקב (`213-12`→`213-13`).
   חשבון הוצאה: דרופ‑חיפוש קיים, או פתיחה במספר ידני שנבדק לזמינות.
5. יצירת **טיוטה**; מספר התנועה (T...) חוזר כקישור ל‑Priority Web. שנת המס במספר
   הסופי נקבעת לפי **תאריך המאזן** (חודש נוכחי/קודם = תאריך החשבונית; ישן = ידני).

**מצב:** הלוגיקה והכלים מומשו ונבדקו; שמות הישויות/שדות + פרטי החיבור צריכים אימות
מול ההתקנה האמיתית. פריטים פתוחים מפורטים ב‑`DESIGN.md`.

---

## 8. פריסה (Deployment)
- **Frontend:** Vite (`frontend/`) → Firebase Hosting.
- **Backend:** Firebase Cloud Functions (`functions/`, Node 20).
- פקודות: `npm run build`, `npm run deploy` (ראו `package.json` בשורש).
