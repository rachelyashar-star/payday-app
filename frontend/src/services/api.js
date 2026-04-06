import { auth } from '../firebase';

const BASE_URL = '/api';

async function getAuthHeaders() {
  const user = auth.currentUser;
  if (!user) throw new Error('לא מחובר');
  const token = await user.getIdToken();
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function request(method, path, body = null) {
  const headers = await getAuthHeaders();
  const options = { method, headers };

  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${path}`, options);

  if (!response.ok) {
    let errorMessage = 'שגיאת שרת';
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
    } catch {
      // ignore parse error
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

// Invoice operations
export async function scanInvoices(tenantId) {
  return request('POST', '/scan', { tenantId });
}

export async function approveInvoice(tenantId, invoiceId, data) {
  return request('POST', '/approve', {
    tenantId,
    invoiceId,
    ...data,
  });
}

// Month report
export async function createMonthReport(tenantId) {
  return request('POST', '/month-report', { tenantId });
}

// Email drafts
export async function createEmailDraft(tenantId, type) {
  return request('POST', '/email-draft', { tenantId, type });
}

// File upload
export async function uploadFile(tenantId, file) {
  const user = auth.currentUser;
  if (!user) throw new Error('לא מחובר');
  const token = await user.getIdToken();

  const formData = new FormData();
  formData.append('file', file);
  formData.append('tenantId', tenantId);

  const response = await fetch(`${BASE_URL}/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    let errorMessage = 'שגיאה בהעלאת הקובץ';
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
    } catch {
      // ignore
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

// Tenant management
export async function createTenant(data) {
  return request('POST', '/tenants', data);
}

export async function inviteClient(tenantId, email, displayName) {
  return request('POST', '/tenants/invite', { tenantId, email, displayName });
}

// Settings
export async function updateSettings(tenantId, settings) {
  return request('PUT', `/tenants/${tenantId}/settings`, settings);
}
