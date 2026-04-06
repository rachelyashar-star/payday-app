import { collection, doc } from 'firebase/firestore';
import { db } from '../firebase';

export function getInvoicesRef(tenantId) {
  return collection(db, 'tenants', tenantId, 'invoices');
}

export function getSettingsRef(tenantId) {
  return doc(db, 'tenants', tenantId, 'settings', 'app');
}

export function getMonthReportsRef(tenantId) {
  return collection(db, 'tenants', tenantId, 'monthReports');
}

export function getTenantRef(tenantId) {
  return doc(db, 'tenants', tenantId);
}

export function getTenantsRef() {
  return collection(db, 'tenants');
}
