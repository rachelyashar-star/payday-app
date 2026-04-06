import React from 'react';
import { useTenant } from '../../hooks/useTenant';

export default function TenantSelector() {
  const { tenantId, setTenantId, tenantList } = useTenant();

  if (!tenantList || tenantList.length === 0) {
    return (
      <div className="tenant-selector">
        <span className="tenant-selector-label">אין לקוחות</span>
      </div>
    );
  }

  return (
    <div className="tenant-selector">
      <label htmlFor="tenant-select" className="tenant-selector-label">
        לקוח:
      </label>
      <select
        id="tenant-select"
        className="tenant-selector-dropdown"
        value={tenantId || ''}
        onChange={(e) => setTenantId(e.target.value)}
      >
        {tenantList.map((t) => (
          <option key={t.id} value={t.id}>
            {t.companyName || t.id}
          </option>
        ))}
      </select>
    </div>
  );
}
