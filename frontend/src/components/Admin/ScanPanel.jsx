import React from 'react';

export default function ScanPanel({ results }) {
  if (!results) return null;

  const { processed, autoPaid, duplicates, errors } = results;

  return (
    <div className="scan-panel card">
      <h3 className="card-title">תוצאות סריקה</h3>

      <div className="scan-results-grid">
        <div className="scan-result-item scan-result-processed">
          <span className="scan-result-number">{processed || 0}</span>
          <span className="scan-result-label">עובדו</span>
        </div>
        <div className="scan-result-item scan-result-autopaid">
          <span className="scan-result-number">{autoPaid || 0}</span>
          <span className="scan-result-label">תשלום אוטומטי</span>
        </div>
        <div className="scan-result-item scan-result-duplicates">
          <span className="scan-result-number">{duplicates || 0}</span>
          <span className="scan-result-label">כפולות</span>
        </div>
        <div className="scan-result-item scan-result-errors">
          <span className="scan-result-number">{errors?.length || 0}</span>
          <span className="scan-result-label">שגיאות</span>
        </div>
      </div>

      {errors && errors.length > 0 && (
        <div className="scan-errors">
          <h4>שגיאות:</h4>
          <ul className="scan-error-list">
            {errors.map((err, i) => (
              <li key={i} className="scan-error-item">
                {err.fileName || err.file}: {err.message || err.error}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
