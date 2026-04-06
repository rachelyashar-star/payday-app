/**
 * services/drive.js
 * Google Drive operations using googleapis SDK with Firebase service account.
 */

const { google } = require('googleapis');
const admin = require('firebase-admin');
const { SUPPORTED_MIME_TYPES } = require('../utils/constants');
const { normalizeMime } = require('../utils/formatters');

/**
 * Get an authenticated Google Drive client using the Firebase Admin service account.
 */
function getDriveClient() {
  const credential = admin.credential.applicationDefault();
  const auth = new google.auth.GoogleAuth({
    scopes: [
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/drive.file',
    ],
  });
  return google.drive({ version: 'v3', auth });
}

/**
 * List files in a Drive folder, filtered by supported MIME types.
 *
 * @param {string} folderId - Google Drive folder ID
 * @returns {Array<{id, name, mimeType}>}
 */
async function listFiles(folderId) {
  const drive = getDriveClient();
  const mimeFilter = Array.from(SUPPORTED_MIME_TYPES)
    .map((m) => `mimeType='${m}'`)
    .join(' or ');

  const query = `'${folderId}' in parents and trashed=false and (${mimeFilter})`;

  const result = [];
  let pageToken = null;

  do {
    const res = await drive.files.list({
      q: query,
      fields: 'nextPageToken, files(id, name, mimeType)',
      pageSize: 100,
      pageToken: pageToken || undefined,
    });
    if (res.data.files) {
      result.push(...res.data.files);
    }
    pageToken = res.data.nextPageToken;
  } while (pageToken);

  return result;
}

/**
 * Get file content as a base64 encoded string.
 *
 * @param {string} fileId
 * @returns {{ base64: string, mimeType: string }}
 */
async function getFileContent(fileId) {
  const drive = getDriveClient();

  // Get metadata first for MIME type
  const meta = await drive.files.get({
    fileId,
    fields: 'mimeType, name',
  });
  const mimeType = normalizeMime(meta.data.mimeType);

  // Download the file content
  const res = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'arraybuffer' }
  );

  const buffer = Buffer.from(res.data);
  const base64 = buffer.toString('base64');

  return { base64, mimeType, name: meta.data.name };
}

/**
 * Move a file to a target folder (remove from current parent, add to target).
 *
 * @param {string} fileId
 * @param {string} targetFolderId
 */
async function moveFile(fileId, targetFolderId) {
  const drive = getDriveClient();

  // Get current parents
  const file = await drive.files.get({
    fileId,
    fields: 'parents',
  });
  const currentParents = (file.data.parents || []).join(',');

  await drive.files.update({
    fileId,
    addParents: targetFolderId,
    removeParents: currentParents,
    fields: 'id, parents',
  });
}

/**
 * Upload a file to a Drive folder.
 *
 * @param {string} folderId
 * @param {string} fileName
 * @param {string} mimeType
 * @param {Buffer} buffer
 * @returns {{ fileId: string, webViewLink: string }}
 */
async function uploadFile(folderId, fileName, mimeType, buffer) {
  const drive = getDriveClient();
  const { Readable } = require('stream');

  const res = await drive.files.create({
    requestBody: {
      name: fileName,
      mimeType,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: Readable.from(buffer),
    },
    fields: 'id, webViewLink',
  });

  return {
    fileId: res.data.id,
    webViewLink: res.data.webViewLink,
  };
}

/**
 * Set file sharing to anyone with the link can view.
 *
 * @param {string} fileId
 */
async function setPublicViewing(fileId) {
  const drive = getDriveClient();
  await drive.permissions.create({
    fileId,
    requestBody: {
      role: 'reader',
      type: 'anyone',
    },
  });
}

/**
 * Create a subfolder inside a parent folder.
 *
 * @param {string} parentId
 * @param {string} name
 * @returns {string} Created folder ID
 */
async function createFolder(parentId, name) {
  const drive = getDriveClient();
  const res = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id',
  });
  return res.data.id;
}

/**
 * Get or create the "Processed" subfolder inside an inbox folder.
 *
 * @param {string} inboxFolderId
 * @returns {string} Processed folder ID
 */
async function getOrCreateProcessedFolder(inboxFolderId) {
  const drive = getDriveClient();

  // Check if "Processed" folder already exists
  const res = await drive.files.list({
    q: `'${inboxFolderId}' in parents and name='Processed' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)',
    pageSize: 1,
  });

  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id;
  }

  // Create it
  return createFolder(inboxFolderId, 'Processed');
}

module.exports = {
  listFiles,
  getFileContent,
  moveFile,
  uploadFile,
  setPublicViewing,
  createFolder,
  getOrCreateProcessedFolder,
};
