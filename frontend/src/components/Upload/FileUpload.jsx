import React, { useState, useRef, useCallback } from 'react';
import { uploadFile } from '../../services/api';

const ACCEPTED_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
];

const ACCEPTED_EXTENSIONS = '.pdf,.png,.jpg,.jpeg,.gif,.webp';

export default function FileUpload({ tenantId, onSuccess }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFiles = useCallback(
    async (files) => {
      if (!files || files.length === 0) return;

      const file = files[0];
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError('סוג קובץ לא נתמך. נא להעלות PDF, PNG, JPEG, GIF או WebP.');
        return;
      }

      setError(null);
      setUploading(true);
      setProgress(0);

      try {
        // Simulate progress updates
        const progressInterval = setInterval(() => {
          setProgress((prev) => {
            if (prev >= 90) {
              clearInterval(progressInterval);
              return prev;
            }
            return prev + 10;
          });
        }, 200);

        await uploadFile(tenantId, file);

        clearInterval(progressInterval);
        setProgress(100);

        setTimeout(() => {
          setUploading(false);
          setProgress(0);
          if (onSuccess) onSuccess();
        }, 500);
      } catch (err) {
        setError(`שגיאה בהעלאת הקובץ: ${err.message}`);
        setUploading(false);
        setProgress(0);
      }
    },
    [tenantId, onSuccess]
  );

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleInputChange = (e) => {
    handleFiles(e.target.files);
    e.target.value = '';
  };

  return (
    <div className="file-upload-container">
      <div
        className={`file-upload-dropzone ${dragging ? 'file-upload-dragging' : ''} ${uploading ? 'file-upload-uploading' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          onChange={handleInputChange}
          className="file-upload-input"
        />

        {uploading ? (
          <div className="file-upload-progress">
            <div className="progress-bar">
              <div
                className="progress-bar-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="progress-text">{progress}% מעלה...</span>
          </div>
        ) : (
          <div className="file-upload-label">
            <span className="upload-icon">📁</span>
            <span className="upload-text-main">גרור קובץ לכאן</span>
            <span className="upload-text-secondary">
              או לחץ לבחירת קובץ (PDF, PNG, JPEG, GIF, WebP)
            </span>
          </div>
        )}
      </div>

      {error && <div className="file-upload-error">{error}</div>}
    </div>
  );
}
