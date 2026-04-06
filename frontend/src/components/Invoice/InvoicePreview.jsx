import React from 'react';

export default function InvoicePreview({ invoice, onClose }) {
  const fileId = invoice.driveFileId;
  const fileUrl = invoice.fileUrl;

  let previewSrc = null;
  if (fileId) {
    previewSrc = `https://drive.google.com/file/d/${fileId}/preview`;
  } else if (fileUrl) {
    previewSrc = fileUrl;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-preview" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>תצוגה מקדימה - {invoice.vendorName || 'חשבונית'}</h3>
          <button className="btn-icon" onClick={onClose} aria-label="סגור">
            &times;
          </button>
        </div>
        <div className="modal-body">
          {previewSrc ? (
            <iframe
              src={previewSrc}
              className="preview-iframe"
              title="תצוגה מקדימה"
              allow="autoplay"
            />
          ) : (
            <div className="preview-fallback">
              <p>לא ניתן להציג תצוגה מקדימה לקובץ זה.</p>
              <p>מזהה קובץ לא זמין.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
