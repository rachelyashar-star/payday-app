/**
 * services/gmail.js
 * Gmail draft creation using googleapis SDK.
 * HTML templates ported from Apps Script 13_Email_Draft.gs.
 */

const { google } = require('googleapis');
const { LOGO_URL } = require('../utils/constants');

/**
 * Get an authenticated Gmail client.
 * Uses the service account with domain-wide delegation,
 * impersonating the specified sender email.
 */
function getGmailClient(senderEmail) {
  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/gmail.compose'],
    clientOptions: {
      subject: senderEmail,
    },
  });
  return google.gmail({ version: 'v1', auth });
}

/**
 * Build the approval email HTML body.
 */
function buildApprovalEmailHtml(webAppUrl, pendingCount, clientName) {
  return `
  <div style="font-family: 'Century Gothic', Arial, sans-serif; direction: rtl; background-color: #ffffff; padding: 40px; color: #333333;">
    <div style="max-width: 600px; margin: 0 auto; text-align: center;">

      <div style="margin-bottom: 30px;">
        <img src="${LOGO_URL}" alt="Pay Day Logo" style="max-width: 200px; height: auto;">
      </div>

      <div style="background-color: #ffffff; padding: 20px;">

        <h1 style="font-size: 24px; font-weight: bold; color: #333333; margin-bottom: 20px;">\u05E9\u05DC\u05D5\u05DD ${clientName},</h1>

        <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
          \u05D9\u05E9 \u05DC\u05DA <b style="color: #2563eb;">${pendingCount} \u05D7\u05E9\u05D1\u05D5\u05E0\u05D9\u05D5\u05EA</b> \u05D4\u05DE\u05DE\u05EA\u05D9\u05E0\u05D5\u05EA \u05DC\u05D0\u05D9\u05E9\u05D5\u05E8 \u05D1\u05DE\u05E2\u05E8\u05DB\u05EA Pay Day.
        </p>

        <p style="font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
          \u05DC\u05D7\u05E5 \u05E2\u05DC \u05D4\u05DB\u05E4\u05EA\u05D5\u05E8 \u05DC\u05DE\u05D8\u05D4 \u05DB\u05D3\u05D9 \u05DC\u05D4\u05D9\u05DB\u05E0\u05E1 \u05DC\u05DE\u05E2\u05E8\u05DB\u05EA \u05D5\u05DC\u05D0\u05E9\u05E8 \u05D0\u05EA \u05D4\u05D7\u05E9\u05D1\u05D5\u05E0\u05D9\u05D5\u05EA.
        </p>

        <div style="margin-bottom: 30px;">
          <a href="${webAppUrl}" style="display: inline-block; background-color: #0056b3; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: bold; font-size: 16px;">
            \u05D4\u05D9\u05DB\u05E0\u05E1 \u05DC\u05DE\u05E2\u05E8\u05DB\u05EA
          </a>
        </div>

        <p style="font-size: 14px; color: #666666; margin-bottom: 10px;">
          \u05D0\u05DD \u05D4\u05DB\u05E4\u05EA\u05D5\u05E8 \u05DC\u05D0 \u05E2\u05D5\u05D1\u05D3, \u05D4\u05E2\u05EA\u05E7 \u05D5\u05D4\u05D3\u05D1\u05E7 \u05D0\u05EA \u05D4\u05E7\u05D9\u05E9\u05D5\u05E8 \u05D4\u05D1\u05D0 \u05D1\u05D3\u05E4\u05D3\u05E4\u05DF:
        </p>
        <p style="font-size: 12px; color: #0056b3; word-break: break-all;">
          <a href="${webAppUrl}" style="color: #0056b3;">${webAppUrl}</a>
        </p>

      </div>

      <div style="margin-top: 40px; border-top: 1px solid #eeeeee; padding-top: 20px;">
        <p style="font-size: 14px; color: #000000; font-weight: bold;">
          Realize Finance
        </p>
        <p style="font-size: 12px; color: #000000;">
          \u05DE\u05E2\u05E8\u05DB\u05EA \u05E0\u05D9\u05D4\u05D5\u05DC \u05D7\u05E9\u05D1\u05D5\u05E0\u05D9\u05D5\u05EA \u05D0\u05D5\u05D8\u05D5\u05DE\u05D8\u05D9\u05EA
        </p>
        <p style="font-size: 12px; color: #000000; margin-top: 10px;">
          \u00A9 \u05DB\u05DC \u05D4\u05D6\u05DB\u05D5\u05D9\u05D5\u05EA \u05E9\u05DE\u05D5\u05E8\u05D5\u05EA \u05DC-Realize Finance
        </p>
      </div>

    </div>
  </div>`;
}

/**
 * Build the password email HTML body.
 */
function buildPasswordEmailHtml(password, clientName) {
  return `
  <div style="font-family: 'Century Gothic', Arial, sans-serif; direction: rtl; background-color: #ffffff; padding: 40px; color: #333333;">
    <div style="max-width: 600px; margin: 0 auto; text-align: center;">

      <div style="margin-bottom: 30px;">
        <img src="${LOGO_URL}" alt="Pay Day Logo" style="max-width: 200px; height: auto;">
      </div>

      <div style="background-color: #ffffff; padding: 20px;">

        <h1 style="font-size: 22px; font-weight: bold; color: #333333; margin-bottom: 20px;">\u05E9\u05DC\u05D5\u05DD ${clientName},</h1>

        <p style="font-size: 16px; margin-bottom: 10px;">
          \u05D4\u05E1\u05D9\u05E1\u05DE\u05D4 \u05E9\u05DC\u05DA \u05DC\u05DB\u05E0\u05D9\u05E1\u05D4 \u05DC\u05DE\u05E2\u05E8\u05DB\u05EA:
        </p>

        <div style="font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #0056b3; background-color: #f8f9fa; padding: 15px; border-radius: 8px; display: inline-block; margin: 20px 0;">
          ${password}
        </div>

        <p style="font-size: 14px; color: #666666; margin-top: 20px;">
          \u05E0\u05D0 \u05DC\u05E9\u05DE\u05D5\u05E8 \u05E2\u05DC \u05E1\u05D9\u05E1\u05DE\u05D4 \u05D6\u05D5 \u05D5\u05DC\u05D0 \u05DC\u05D4\u05E2\u05D1\u05D9\u05E8 \u05D0\u05D5\u05EA\u05D4 \u05DC\u05D2\u05D5\u05E8\u05DE\u05D9\u05DD \u05DC\u05D0 \u05DE\u05D5\u05E8\u05E9\u05D9\u05DD.
        </p>

      </div>

      <div style="margin-top: 40px; border-top: 1px solid #eeeeee; padding-top: 20px;">
         <p style="font-size: 12px; color: #000000;">
          \u00A9 \u05DB\u05DC \u05D4\u05D6\u05DB\u05D5\u05D9\u05D5\u05EA \u05E9\u05DE\u05D5\u05E8\u05D5\u05EA \u05DC-Realize Finance
        </p>
      </div>

    </div>
  </div>`;
}

/**
 * Encode an email message into base64url format for the Gmail API.
 */
function encodeEmail(to, subject, htmlBody, from) {
  const messageParts = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    '',
    htmlBody,
  ];
  const message = messageParts.join('\r\n');
  return Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Create an approval email draft via Gmail API.
 *
 * @param {string} senderEmail - The email to impersonate (admin's email)
 * @param {string} to - Recipient email
 * @param {string} clientName
 * @param {string} companyName
 * @param {string} webAppUrl
 * @param {number} pendingCount
 */
async function createApprovalDraft(senderEmail, to, clientName, companyName, webAppUrl, pendingCount) {
  const gmail = getGmailClient(senderEmail);

  const now = new Date();
  const hebrewMonths = [
    '\u05D9\u05E0\u05D5\u05D0\u05E8', '\u05E4\u05D1\u05E8\u05D5\u05D0\u05E8',
    '\u05DE\u05E8\u05E5', '\u05D0\u05E4\u05E8\u05D9\u05DC',
    '\u05DE\u05D0\u05D9', '\u05D9\u05D5\u05E0\u05D9',
    '\u05D9\u05D5\u05DC\u05D9', '\u05D0\u05D5\u05D2\u05D5\u05E1\u05D8',
    '\u05E1\u05E4\u05D8\u05DE\u05D1\u05E8', '\u05D0\u05D5\u05E7\u05D8\u05D5\u05D1\u05E8',
    '\u05E0\u05D5\u05D1\u05DE\u05D1\u05E8', '\u05D3\u05E6\u05DE\u05D1\u05E8',
  ];
  const monthStr = `${hebrewMonths[now.getMonth()]} ${now.getFullYear()}`;
  const subject = `Pay Day <> ${companyName} - ${monthStr}`;

  const htmlBody = buildApprovalEmailHtml(webAppUrl, pendingCount, clientName);
  const raw = encodeEmail(to, subject, htmlBody, senderEmail);

  const res = await gmail.users.drafts.create({
    userId: 'me',
    requestBody: {
      message: { raw },
    },
  });

  return { draftId: res.data.id, subject };
}

/**
 * Create a password email draft via Gmail API.
 *
 * @param {string} senderEmail - The email to impersonate
 * @param {string} to - Recipient email
 * @param {string} clientName
 * @param {string} companyName
 * @param {string} password
 */
async function createPasswordDraft(senderEmail, to, clientName, companyName, password) {
  const gmail = getGmailClient(senderEmail);

  const subject = `\u05E1\u05D9\u05E1\u05DE\u05EA \u05D2\u05D9\u05E9\u05D4 \u05DC\u05DE\u05E2\u05E8\u05DB\u05EA Pay Day - ${companyName}`;
  const htmlBody = buildPasswordEmailHtml(password, clientName);
  const raw = encodeEmail(to, subject, htmlBody, senderEmail);

  const res = await gmail.users.drafts.create({
    userId: 'me',
    requestBody: {
      message: { raw },
    },
  });

  return { draftId: res.data.id, subject };
}

module.exports = { createApprovalDraft, createPasswordDraft };
