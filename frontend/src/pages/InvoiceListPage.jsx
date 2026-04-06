import React, { useState, useMemo } from 'react';
import { useInvoices } from '../hooks/useInvoices';
import { useTenant } from '../hooks/useTenant';
import InvoiceCard from '../components/Invoice/InvoiceCard';
import InvoiceDetail from '../components/Invoice/InvoiceDetail';
import FileUpload from '../components/Upload/FileUpload';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Toast from '../components/common/Toast';
import { useAuth } from '../hooks/useAuth';

export default function InvoiceListPage() {
  const { tenantId } = useTenant();
  const { isAdmin } = useAuth();
  const { invoices, loading, error } = useInvoices(tenantId);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [toast, setToast] = useState(null);

  // Split invoices into pending and approved columns
  const { pendingByCurrency, approvedByCurrency } = useMemo(() => {
    const pending = {};
    const approved = {};

    invoices.forEach((inv) => {
      const currency = inv.currency || 'ILS';
      if (inv.clientApproved && !inv.paid) {
        if (!approved[currency]) approved[currency] = [];
        approved[currency].push(inv);
      } else if (inv.pending && !inv.clientApproved) {
        if (!pending[currency]) pending[currency] = [];
        pending[currency].push(inv);
      }
    });

    // Sort by date within each group
    const sortByDate = (a, b) => {
      const dateA = a.invoiceDate?.toDate?.() || new Date(a.invoiceDate || 0);
      const dateB = b.invoiceDate?.toDate?.() || new Date(b.invoiceDate || 0);
      return dateB - dateA;
    };

    Object.values(pending).forEach((arr) => arr.sort(sortByDate));
    Object.values(approved).forEach((arr) => arr.sort(sortByDate));

    return { pendingByCurrency: pending, approvedByCurrency: approved };
  }, [invoices]);

  const handleInvoiceSelect = (invoice) => {
    setSelectedInvoice(invoice);
  };

  const handleApproveSuccess = () => {
    setToast({ type: 'success', message: 'חשבונית אושרה בהצלחה' });
    setSelectedInvoice(null);
  };

  const handleUploadSuccess = () => {
    setShowUpload(false);
    setToast({ type: 'success', message: 'הקובץ הועלה בהצלחה' });
  };

  if (loading) return <LoadingSpinner fullPage />;

  if (error) {
    return (
      <div className="error-state">
        <p>שגיאה בטעינת חשבוניות: {error}</p>
      </div>
    );
  }

  const renderCurrencyGroup = (groupByCurrency, emptyMessage) => {
    const currencies = Object.keys(groupByCurrency);
    if (currencies.length === 0) {
      return <div className="empty-column-message">{emptyMessage}</div>;
    }

    return currencies.map((currency) => (
      <div key={currency} className="currency-group">
        <div className="currency-group-header">
          <span className="currency-group-title">{currency}</span>
          <span className="currency-group-count">
            {groupByCurrency[currency].length} חשבוניות
          </span>
        </div>
        {groupByCurrency[currency].map((inv) => (
          <InvoiceCard
            key={inv.id}
            invoice={inv}
            selected={selectedInvoice?.id === inv.id}
            onSelect={() => handleInvoiceSelect(inv)}
            onApproveSuccess={handleApproveSuccess}
            tenantId={tenantId}
          />
        ))}
      </div>
    ));
  };

  return (
    <div className={`invoice-list-page ${selectedInvoice ? 'detail-open' : ''}`}>
      <div className="invoice-list-header">
        <h1 className="page-title">חשבוניות</h1>
        {isAdmin && (
          <button
            className="btn btn-primary"
            onClick={() => setShowUpload(!showUpload)}
          >
            {showUpload ? 'סגור' : 'העלה קובץ'}
          </button>
        )}
      </div>

      {showUpload && (
        <FileUpload tenantId={tenantId} onSuccess={handleUploadSuccess} />
      )}

      <div className="invoice-columns">
        {/* Pending Column */}
        <div className="invoice-column">
          <div className="column-header column-header-pending">
            <h2>ממתינות לאישור</h2>
            <span className="column-count">
              {Object.values(pendingByCurrency).reduce((s, a) => s + a.length, 0)}
            </span>
          </div>
          <div className="column-body">
            {renderCurrencyGroup(pendingByCurrency, 'אין חשבוניות ממתינות')}
          </div>
        </div>

        {/* Approved Column */}
        <div className="invoice-column">
          <div className="column-header column-header-approved">
            <h2>אושרו</h2>
            <span className="column-count">
              {Object.values(approvedByCurrency).reduce((s, a) => s + a.length, 0)}
            </span>
          </div>
          <div className="column-body">
            {renderCurrencyGroup(approvedByCurrency, 'אין חשבוניות מאושרות')}
          </div>
        </div>
      </div>

      {/* Detail Panel */}
      {selectedInvoice && (
        <InvoiceDetail
          invoice={selectedInvoice}
          tenantId={tenantId}
          onClose={() => setSelectedInvoice(null)}
          onApproveSuccess={handleApproveSuccess}
        />
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
