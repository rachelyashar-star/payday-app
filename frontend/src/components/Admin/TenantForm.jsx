import React, { useState } from 'react';
import { ALL_CURRENCIES, DEPARTMENTS } from '../../utils/constants';

const EMPTY_RULE = { vendor: '', maxAmount: '', currency: 'ILS' };

export default function TenantForm({ initialData, onSubmit }) {
  const [form, setForm] = useState({
    companyName: initialData?.companyName || '',
    driveFolderId: initialData?.driveFolderId || '',
    currencies: initialData?.currencies || ['ILS'],
    departments: initialData?.departments || [...DEPARTMENTS],
    autoPayRules: initialData?.autoPayRules || [],
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleCurrency = (currency) => {
    setForm((prev) => {
      const currencies = prev.currencies.includes(currency)
        ? prev.currencies.filter((c) => c !== currency)
        : [...prev.currencies, currency];
      return { ...prev, currencies };
    });
  };

  const addAutoPayRule = () => {
    setForm((prev) => ({
      ...prev,
      autoPayRules: [...prev.autoPayRules, { ...EMPTY_RULE }],
    }));
  };

  const removeAutoPayRule = (index) => {
    setForm((prev) => ({
      ...prev,
      autoPayRules: prev.autoPayRules.filter((_, i) => i !== index),
    }));
  };

  const updateAutoPayRule = (index, field, value) => {
    setForm((prev) => {
      const rules = [...prev.autoPayRules];
      rules[index] = { ...rules[index], [field]: value };
      return { ...prev, autoPayRules: rules };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.companyName) return;
    setLoading(true);
    try {
      await onSubmit(form);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="tenant-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label>שם חברה</label>
        <input
          type="text"
          value={form.companyName}
          onChange={(e) => handleChange('companyName', e.target.value)}
          placeholder="שם החברה"
          required
          disabled={loading}
        />
      </div>

      <div className="form-group">
        <label>מזהה תיקיית Google Drive</label>
        <input
          type="text"
          value={form.driveFolderId}
          onChange={(e) => handleChange('driveFolderId', e.target.value)}
          placeholder="הכנס מזהה תיקייה"
          disabled={loading}
        />
      </div>

      <div className="form-group">
        <label>מטבעות</label>
        <div className="checkbox-group">
          {ALL_CURRENCIES.map((c) => (
            <label key={c} className="checkbox-label">
              <input
                type="checkbox"
                checked={form.currencies.includes(c)}
                onChange={() => toggleCurrency(c)}
                disabled={loading}
              />
              <span>{c}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label>מחלקות</label>
        <textarea
          value={form.departments.join('\n')}
          onChange={(e) =>
            handleChange(
              'departments',
              e.target.value.split('\n').filter((d) => d.trim())
            )
          }
          placeholder="מחלקה אחת בכל שורה"
          rows={4}
          disabled={loading}
        />
      </div>

      <div className="form-group">
        <label>כללי תשלום אוטומטי</label>
        <div className="auto-pay-rules">
          {form.autoPayRules.map((rule, i) => (
            <div key={i} className="auto-pay-rule-row">
              <input
                type="text"
                value={rule.vendor}
                onChange={(e) => updateAutoPayRule(i, 'vendor', e.target.value)}
                placeholder="שם ספק"
                disabled={loading}
              />
              <input
                type="number"
                value={rule.maxAmount}
                onChange={(e) => updateAutoPayRule(i, 'maxAmount', e.target.value)}
                placeholder="סכום מקסימלי"
                disabled={loading}
              />
              <select
                value={rule.currency}
                onChange={(e) => updateAutoPayRule(i, 'currency', e.target.value)}
                disabled={loading}
              >
                {ALL_CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={() => removeAutoPayRule(i)}
                disabled={loading}
              >
                הסר
              </button>
            </div>
          ))}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={addAutoPayRule}
            disabled={loading}
          >
            + הוסף כלל
          </button>
        </div>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'שומר...' : initialData ? 'עדכן' : 'צור לקוח'}
        </button>
      </div>
    </form>
  );
}
