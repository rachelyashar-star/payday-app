import React, { useState } from 'react';
import { approveInvoice } from '../../services/api';
import { DEPARTMENTS } from '../../utils/constants';
import { useSettings } from '../../hooks/useSettings';

export default function InvoiceApproveForm({ invoice, tenantId, onSuccess }) {
  const { settings } = useSettings(tenantId);
  const departments = settings?.departments || DEPARTMENTS;

  const [form, setForm] = useState({
    department: invoice.department || '',
    paymentMethod: invoice.paymentMethod || '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await approveInvoice(tenantId, invoice.id, form);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message || 'שגיאה באישור החשבונית');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="approve-form" onSubmit={handleSubmit}>
      <h4 className="approve-form-title">אישור חשבונית</h4>

      <div className="form-group">
        <label htmlFor="department">מחלקה</label>
        <select
          id="department"
          value={form.department}
          onChange={(e) => setForm((prev) => ({ ...prev, department: e.target.value }))}
          disabled={loading}
        >
          <option value="">בחר מחלקה</option>
          {departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="paymentMethod">אמצעי תשלום</label>
        <input
          id="paymentMethod"
          type="text"
          value={form.paymentMethod}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, paymentMethod: e.target.value }))
          }
          placeholder="העברה בנקאית / צ'ק / אשראי"
          disabled={loading}
        />
      </div>

      <div className="form-group">
        <label htmlFor="notes">הערות</label>
        <textarea
          id="notes"
          value={form.notes}
          onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
          placeholder="הערות נוספות (אופציונלי)"
          rows={3}
          disabled={loading}
        />
      </div>

      {error && <div className="form-error">{error}</div>}

      <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
        {loading ? 'מאשר...' : 'אשר חשבונית'}
      </button>
    </form>
  );
}
