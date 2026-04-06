import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import TenantForm from '../components/Admin/TenantForm';
import SettingsPanel from '../components/Admin/SettingsPanel';
import Toast from '../components/common/Toast';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { createTenant, inviteClient } from '../services/api';

export default function TenantManagement() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [inviteForm, setInviteForm] = useState({ tenantId: null, email: '', displayName: '' });
  const [inviteLoading, setInviteLoading] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'tenants'),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setTenants(list);
        setLoading(false);
      },
      (err) => {
        console.error('Error loading tenants:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleCreateTenant = async (data) => {
    try {
      await createTenant(data);
      setShowCreateForm(false);
      setToast({ type: 'success', message: 'לקוח חדש נוצר בהצלחה' });
    } catch (err) {
      setToast({ type: 'error', message: `שגיאה ביצירת לקוח: ${err.message}` });
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteForm.email || !inviteForm.displayName) {
      setToast({ type: 'error', message: 'נא למלא את כל השדות' });
      return;
    }

    setInviteLoading(true);
    try {
      await inviteClient(inviteForm.tenantId, inviteForm.email, inviteForm.displayName);
      setInviteForm({ tenantId: null, email: '', displayName: '' });
      setToast({ type: 'success', message: 'הזמנה נשלחה בהצלחה' });
    } catch (err) {
      setToast({ type: 'error', message: `שגיאה בשליחת הזמנה: ${err.message}` });
    } finally {
      setInviteLoading(false);
    }
  };

  if (loading) return <LoadingSpinner fullPage />;

  return (
    <div className="tenant-management">
      <div className="page-header">
        <h1 className="page-title">ניהול לקוחות</h1>
        <button
          className="btn btn-primary"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? 'ביטול' : '+ לקוח חדש'}
        </button>
      </div>

      {showCreateForm && (
        <div className="card">
          <h2 className="card-title">יצירת לקוח חדש</h2>
          <TenantForm onSubmit={handleCreateTenant} />
        </div>
      )}

      {editingTenant && (
        <div className="card">
          <div className="card-header-row">
            <h2 className="card-title">
              עריכת הגדרות - {editingTenant.companyName}
            </h2>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setEditingTenant(null)}
            >
              סגור
            </button>
          </div>
          <SettingsPanel tenantId={editingTenant.id} />
        </div>
      )}

      <div className="tenant-cards-grid">
        {tenants.map((tenant) => (
          <div key={tenant.id} className="card tenant-card">
            <div className="tenant-card-header">
              <h3 className="tenant-card-name">{tenant.companyName || tenant.id}</h3>
              <span
                className={`status-badge ${tenant.active !== false ? 'status-success' : 'status-danger'}`}
              >
                {tenant.active !== false ? 'פעיל' : 'מושבת'}
              </span>
            </div>

            <div className="tenant-card-details">
              <div className="tenant-detail-row">
                <span className="detail-label">מזהה:</span>
                <span className="detail-value">{tenant.id}</span>
              </div>
              {tenant.currencies && (
                <div className="tenant-detail-row">
                  <span className="detail-label">מטבעות:</span>
                  <span className="detail-value">{tenant.currencies.join(', ')}</span>
                </div>
              )}
              {tenant.driveFolderId && (
                <div className="tenant-detail-row">
                  <span className="detail-label">תיקיית Drive:</span>
                  <span className="detail-value detail-value-truncated">
                    {tenant.driveFolderId}
                  </span>
                </div>
              )}
            </div>

            <div className="tenant-card-actions">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setEditingTenant(tenant)}
              >
                הגדרות
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() =>
                  setInviteForm({ ...inviteForm, tenantId: tenant.id })
                }
              >
                הזמן משתמש
              </button>
            </div>

            {inviteForm.tenantId === tenant.id && (
              <form className="invite-form" onSubmit={handleInvite}>
                <h4>הזמנת משתמש חדש</h4>
                <div className="form-group">
                  <input
                    type="email"
                    placeholder="אימייל"
                    value={inviteForm.email}
                    onChange={(e) =>
                      setInviteForm({ ...inviteForm, email: e.target.value })
                    }
                    disabled={inviteLoading}
                  />
                </div>
                <div className="form-group">
                  <input
                    type="text"
                    placeholder="שם תצוגה"
                    value={inviteForm.displayName}
                    onChange={(e) =>
                      setInviteForm({ ...inviteForm, displayName: e.target.value })
                    }
                    disabled={inviteLoading}
                  />
                </div>
                <div className="form-actions">
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    disabled={inviteLoading}
                  >
                    {inviteLoading ? 'שולח...' : 'שלח הזמנה'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() =>
                      setInviteForm({ tenantId: null, email: '', displayName: '' })
                    }
                  >
                    ביטול
                  </button>
                </div>
              </form>
            )}
          </div>
        ))}
      </div>

      {tenants.length === 0 && (
        <div className="empty-state">
          <p>אין לקוחות עדיין. צור לקוח חדש כדי להתחיל.</p>
        </div>
      )}

      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
