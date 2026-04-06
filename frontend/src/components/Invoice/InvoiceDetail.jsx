import React, { useState } from 'react';
import { formatMoney, formatDate, getStatusLabel, getStatusColor } from '../../utils/formatters';
import { getVendorLogo } from '../../utils/constants';
import InvoicePreview from './InvoicePreview';
import InvoiceApproveForm from './InvoiceApproveForm';

export default function InvoiceDetail({ invoice, tenantId, onClose, onApproveSuccess }) {
  const [showPreview, setShowPreview] = useState(false);

  const status = invoice.autoPaid
    ? 'autoPaid'
    : invoice.duplicate
      ? 'duplicate'
      : invoice.paid
        ? 'paid'
        : invoice.clientApproved
          ? 'approved'
          : 'pending';

  const isPending = status === 'pending';

  return (
    <>
      <div className="detail-overlay" onClick={onClose} />
      <div className="invoice-detail-panel">
        <div className="detail-panel-header">
          <h2>פרטי חשבונית</h2>
          <button className="btn-icon" onClick={onClose} aria-label="סגור">
            &times;
          </button>
        </div>

        <div className="detail-panel-body">
          {/* Vendor header */}
          <div className="detail-vendor-header">
            <img
              src={getVendorLogo(invoice.vendorName)}
              alt=""
              className="vendor-logo-large"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            <div className="detail-vendor-info">
              <h3>{invoice.vendorName || 'ספק לא ידוע'}</h3>
              <span
                className="status-badge status-badge-large"
                style={{ backgroundColor: getStatusColor(status) }}
              >
                {getStatusLabel(status)}
              </span>
            </div>
          </div>

          {/* Details grid */}
          <div className="detail-grid">
            <div className="detail-row">
              <span className="detail-label">מספר חשבונית:</span>
              <span className="detail-value">{invoice.invoiceNumber || '-'}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">תאריך חשבונית:</span>
              <span className="detail-value">{formatDate(invoice.invoiceDate)}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">תאריך פירעון:</span>
              <span className="detail-value">{formatDate(invoice.dueDate)}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">סכום לפני מע"מ:</span>
              <span className="detail-value">
                {formatMoney(invoice.amountBeforeVat || invoice.amount, invoice.currency)}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">מע"מ:</span>
              <span className="detail-value">
                {formatMoney(invoice.vatAmount || 0, invoice.currency)}
              </span>
            </div>
            <div className="detail-row detail-row-total">
              <span className="detail-label">סה"כ:</span>
              <span className="detail-value">
                {formatMoney(invoice.totalAmount || invoice.amount, invoice.currency)}
              </span>
            </div>
            {invoice.paymentMethod && (
              <div className="detail-row">
                <span className="detail-label">אמצעי תשלום:</span>
                <span className="detail-value">{invoice.paymentMethod}</span>
              </div>
            )}
            {invoice.department && (
              <div className="detail-row">
                <span className="detail-label">מחלקה:</span>
                <span className="detail-value">{invoice.department}</span>
              </div>
            )}
            {invoice.notes && (
              <div className="detail-row">
                <span className="detail-label">הערות:</span>
                <span className="detail-value">{invoice.notes}</span>
              </div>
            )}
          </div>

          {/* Preview button */}
          {(invoice.fileUrl || invoice.driveFileId) && (
            <button
              className="btn btn-secondary btn-block detail-preview-btn"
              onClick={() => setShowPreview(true)}
            >
              צפה בחשבונית
            </button>
          )}

          {/* Approve form for pending invoices */}
          {isPending && (
            <InvoiceApproveForm
              invoice={invoice}
              tenantId={tenantId}
              onSuccess={onApproveSuccess}
            />
          )}
        </div>
      </div>

      {showPreview && (
        <InvoicePreview
          invoice={invoice}
          onClose={() => setShowPreview(false)}
        />
      )}
    </>
  );
}
