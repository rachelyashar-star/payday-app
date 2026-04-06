import React, { useState, useMemo } from 'react';
import { useInvoices } from '../hooks/useInvoices';
import { useTenant } from '../hooks/useTenant';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { formatMoney, formatDate, HEBREW_MONTHS } from '../utils/formatters';
import { getVendorLogo } from '../utils/constants';

export default function HistoryPage() {
  const { tenantId } = useTenant();
  const { invoices, loading } = useInvoices(tenantId);
  const [expandedMonths, setExpandedMonths] = useState({});

  // Filter paid invoices and group by month
  const monthGroups = useMemo(() => {
    const paid = invoices.filter((inv) => inv.paid);

    const groups = {};
    paid.forEach((inv) => {
      const date = inv.paidDate?.toDate?.() || new Date(inv.paidDate || inv.invoiceDate || 0);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = `${HEBREW_MONTHS[date.getMonth()]} ${date.getFullYear()}`;

      if (!groups[key]) {
        groups[key] = { key, label: monthLabel, invoices: [], total: {} };
      }
      groups[key].invoices.push(inv);

      const currency = inv.currency || 'ILS';
      const amount = Number(inv.totalAmount || inv.amount || 0);
      groups[key].total[currency] = (groups[key].total[currency] || 0) + amount;
    });

    // Sort groups by key (newest first)
    return Object.values(groups).sort((a, b) => b.key.localeCompare(a.key));
  }, [invoices]);

  const toggleMonth = (key) => {
    setExpandedMonths((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) return <LoadingSpinner fullPage />;

  return (
    <div className="history-page">
      <h1 className="page-title">היסטוריית תשלומים</h1>

      {monthGroups.length === 0 && (
        <div className="empty-state">
          <p>אין היסטוריית תשלומים עדיין.</p>
        </div>
      )}

      <div className="history-timeline">
        {monthGroups.map((group) => (
          <div key={group.key} className="history-month-group">
            <button
              className={`history-month-header ${expandedMonths[group.key] ? 'expanded' : ''}`}
              onClick={() => toggleMonth(group.key)}
            >
              <div className="month-header-right">
                <span className="month-expand-icon">
                  {expandedMonths[group.key] ? '▼' : '◀'}
                </span>
                <span className="month-label">{group.label}</span>
                <span className="month-invoice-count">
                  ({group.invoices.length} חשבוניות)
                </span>
              </div>
              <div className="month-totals">
                {Object.entries(group.total).map(([currency, total]) => (
                  <span key={currency} className="month-total-badge">
                    {formatMoney(total, currency)}
                  </span>
                ))}
              </div>
            </button>

            {expandedMonths[group.key] && (
              <div className="history-month-invoices">
                {group.invoices.map((inv) => (
                  <div key={inv.id} className="history-invoice-row">
                    <img
                      src={getVendorLogo(inv.vendorName)}
                      alt=""
                      className="vendor-logo-small"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                    <div className="history-invoice-info">
                      <span className="history-vendor-name">
                        {inv.vendorName || 'ספק לא ידוע'}
                      </span>
                      <span className="history-invoice-date">
                        {formatDate(inv.invoiceDate)}
                      </span>
                    </div>
                    <div className="history-invoice-amount">
                      {formatMoney(inv.totalAmount || inv.amount, inv.currency)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
