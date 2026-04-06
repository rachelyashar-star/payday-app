import React, { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { ALL_CURRENCIES, DEPARTMENTS } from '../../utils/constants';
import { updateSettings } from '../../services/api';
import Toast from '../common/Toast';
import LoadingSpinner from '../common/LoadingSpinner';

const EMPTY_RULE = { vendor: '', maxAmount: '', currency: 'ILS' };

export default function SettingsPanel({ tenantId }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({
    currencies: [],
    departments: [],
    autoPayRules: [],
  });

  useEffect(() => {
    if (!tenantId) return;

    const ref = doc(db, 'tenants', tenantId, 'settings', 'app');
    const unsubscribe = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setSettings(data);
        setForm({
          currencies: data.currencies || ['ILS'],
          departments: data.departments || [...DEPARTMENTS],
          autoPayRules: data.autoPayRules || [],
        });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [tenantId]);

  const toggleCurrency = (currency) => {
    setForm((prev) => {
      const currencies = prev.currencies.includes(currency)
        ? prev.currencies.filter((c) => c !== currency)
        : [...prev.currencies, currency];
      return { ...prev, currencies };
    });
  };

  const addRule = () => {
    setForm((prev) => ({
      ...prev,
      autoPayRules: [...prev.autoPayRules, { ...EMPTY_RULE }],
    }));
  };

  const removeRule = (index) => {
    setForm((prev) => ({
      ...prev,
      autoPayRules: prev.autoPayRules.filter((_, i) => i !== index),
    }));
  };

  const updateRule = (index, field, value) => {
    setForm((prev) => {
      const rules = [...prev.autoPayRules];
      rules[index] = { ...rules[index], [field]: value };
      return { ...prev, autoPayRules: rules };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings(tenantId, form);
      setToast({ type: 'success', message: 'ההגדרות נשמרו בהצלחה' });
    } catch (err) {
      setToast({ type: 'error', message: `שגיאה בשמירה: ${err.message}` });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="settings-panel">
      <div className="form-group">
        <label>מטבעות פעילים</label>
        <div className="checkbox-group">
          {ALL_CURRENCIES.map((c) => (
            <label key={c} className="checkbox-label">
              <input
                type="checkbox"
                checked={form.currencies.includes(c)}
                onChange={() => toggleCurrency(c)}
                disabled={saving}
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
            setForm((prev) => ({
              ...prev,
              departments: e.target.value.split('\n').filter((d) => d.trim()),
            }))
          }
          placeholder="מחלקה אחת בכל שורה"
          rows={4}
          disabled={saving}
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
                onChange={(e) => updateRule(i, 'vendor', e.target.value)}
                placeholder="שם ספק"
                disabled={saving}
              />
              <input
                type="number"
                value={rule.maxAmount}
                onChange={(e) => updateRule(i, 'maxAmount', e.target.value)}
                placeholder="סכום מקסימלי"
                disabled={saving}
              />
              <select
                value={rule.currency}
                onChange={(e) => updateRule(i, 'currency', e.target.value)}
                disabled={saving}
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
                onClick={() => removeRule(i)}
                disabled={saving}
              >
                הסר
              </button>
            </div>
          ))}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={addRule}
            disabled={saving}
          >
            + הוסף כלל
          </button>
        </div>
      </div>

      <div className="form-actions">
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'שומר...' : 'שמור הגדרות'}
        </button>
      </div>

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
