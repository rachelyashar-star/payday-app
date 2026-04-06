import React, { useState } from 'react';
import { formatMoney, formatDate, getStatusLabel, getStatusColor } from '../../utils/formatters';
import { getVendorLogo } from '../../utils/constants';
import { approveInvoice } from '../../services/api';

export default function InvoiceCard({
  invoice,
  selected,
  onSelect,
  onApproveSuccess,
  tenantId,
}) {
  const [quickApproving, setQuickApproving] = useState(false);

  const status = invoice.autoPaid
    ? 'autoPaid'
    : invoice.duplicate
      ? 'duplicate'
      : invoice.clientApproved
        ? 'approved'
        : 'pending';

  const handleQuickApprove = async (e) => {
    e.stopPropagation();
    if (status !== 'pending') return;

    setQuickApproving(true);
    try {
      await approveInvoice(tenantId, invoice.id, {});
      if (onApproveSuccess) onApproveSuccess();
    } catch (err) {
      console.error('Quick approve error:', err);
    } finally {
      setQuickApproving(false);
    }
  };

  return (
    <div
      className={`invoice-card ${selected ? 'invoice-card-selected' : ''}`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
    >
      <div className="invoice-card-top">
        <img
          src={getVendorLogo(invoice.vendorName)}
          alt=""
          className="vendor-logo-small"
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
        <div className="invoice-card-info">
          <span className="invoice-card-vendor">
            {invoice.vendorName || 'ספק לא ידוע'}
          </span>
          <span className="invoice-card-date">
            {formatDate(invoice.invoiceDate)}
          </span>
        </div>
        <div className="invoice-card-amount">
          {formatMoney(invoice.totalAmount || invoice.amount, invoice.currency)}
        </div>
      </div>

      <div className="invoice-card-bottom">
        <span
          className="status-badge"
          style={{ backgroundColor: getStatusColor(status) }}
        >
          {getStatusLabel(status)}
        </span>

        {invoice.invoiceNumber && (
          <span className="invoice-card-number">#{invoice.invoiceNumber}</span>
        )}

        {status === 'pending' && (
          <button
            className="btn btn-primary btn-xs"
            onClick={handleQuickApprove}
            disabled={quickApproving}
          >
            {quickApproving ? '...' : 'אשר'}
          </button>
        )}
      </div>
    </div>
  );
}
