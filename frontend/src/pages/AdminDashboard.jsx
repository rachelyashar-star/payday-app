import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useTenant } from '../hooks/useTenant';
import TenantSelector from '../components/Admin/TenantSelector';
import ScanPanel from '../components/Admin/ScanPanel';
import Toast from '../components/common/Toast';
import { scanInvoices, createMonthReport, createEmailDraft } from '../services/api';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { tenantId } = useTenant();
  const [stats, setStats] = useState({ pending: 0, approved: 0, total: 0 });
  const [scanResults, setScanResults] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [toast, setToast] = useState(null);

  // Real-time stats
  useEffect(() => {
    if (!tenantId) return;

    const invoicesRef = collection(db, 'tenants', tenantId, 'invoices');
    const unsubscribe = onSnapshot(invoicesRef, (snap) => {
      let pending = 0;
      let approved = 0;
      let total = snap.size;

      snap.forEach((doc) => {
        const data = doc.data();
        if (data.pending && !data.clientApproved) pending++;
        if (data.clientApproved && !data.paid) approved++;
      });

      setStats({ pending, approved, total });
    });

    return () => unsubscribe();
  }, [tenantId]);

  const handleAction = async (action) => {
    if (!tenantId) {
      setToast({ type: 'error', message: 'נא לבחור לקוח' });
      return;
    }

    setActionLoading(action);
    try {
      switch (action) {
        case 'scan': {
          const result = await scanInvoices(tenantId);
          setScanResults(result);
          setToast({ type: 'success', message: 'הסריקה הושלמה בהצלחה' });
          break;
        }
        case 'monthReport': {
          await createMonthReport(tenantId);
          setToast({ type: 'success', message: 'גיליון חודשי נוצר בהצלחה' });
          break;
        }
        case 'emailDraft': {
          await createEmailDraft(tenantId, 'approval');
          setToast({ type: 'success', message: 'טיוטת מייל אישור נוצרה' });
          break;
        }
        case 'passwordEmail': {
          await createEmailDraft(tenantId, 'password');
          setToast({ type: 'success', message: 'טיוטת מייל סיסמה נוצרה' });
          break;
        }
        default:
          break;
      }
    } catch (err) {
      console.error('Action error:', err);
      setToast({ type: 'error', message: `שגיאה: ${err.message}` });
    } finally {
      setActionLoading(null);
    }
  };

  const actionCards = [
    {
      key: 'scan',
      icon: '🔍',
      title: 'סרוק חשבוניות',
      description: 'סריקת קבצים חדשים מ-Google Drive',
      action: () => handleAction('scan'),
    },
    {
      key: 'monthReport',
      icon: '📊',
      title: 'צור גיליון חודש',
      description: 'יצירת דוח חודשי מסכם',
      action: () => handleAction('monthReport'),
    },
    {
      key: 'emailDraft',
      icon: '✉️',
      title: 'טיוטת מייל אישור',
      description: 'יצירת טיוטת מייל עם חשבוניות לאישור',
      action: () => handleAction('emailDraft'),
    },
    {
      key: 'passwordEmail',
      icon: '🔑',
      title: 'טיוטת מייל סיסמה',
      description: 'שליחת פרטי גישה ללקוח',
      action: () => handleAction('passwordEmail'),
    },
    {
      key: 'settings',
      icon: '⚙️',
      title: 'הגדרות',
      description: 'ניהול הגדרות לקוח',
      action: () => navigate('/admin/tenants'),
    },
    {
      key: 'tenants',
      icon: '👥',
      title: 'ניהול לקוחות',
      description: 'הוספה ועריכת לקוחות',
      action: () => navigate('/admin/tenants'),
    },
  ];

  return (
    <div className="admin-dashboard">
      <div className="admin-top-bar">
        <h1 className="page-title">לוח בקרה</h1>
        <TenantSelector />
      </div>

      {/* Quick Stats */}
      <div className="stats-row">
        <div className="stat-card stat-pending">
          <span className="stat-number">{stats.pending}</span>
          <span className="stat-label">ממתינות לאישור</span>
        </div>
        <div className="stat-card stat-approved">
          <span className="stat-number">{stats.approved}</span>
          <span className="stat-label">אושרו</span>
        </div>
        <div className="stat-card stat-total">
          <span className="stat-number">{stats.total}</span>
          <span className="stat-label">סה"כ חשבוניות</span>
        </div>
      </div>

      {/* Action Cards */}
      <div className="action-cards-grid">
        {actionCards.map((card) => (
          <button
            key={card.key}
            className="action-card"
            onClick={card.action}
            disabled={actionLoading === card.key}
          >
            <span className="action-card-icon">{card.icon}</span>
            <span className="action-card-title">{card.title}</span>
            <span className="action-card-desc">{card.description}</span>
            {actionLoading === card.key && (
              <div className="action-card-loading">
                <div className="spinner spinner-small" />
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Scan Results */}
      {scanResults && <ScanPanel results={scanResults} />}

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
