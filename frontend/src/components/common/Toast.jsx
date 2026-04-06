import React, { useEffect } from 'react';

export default function Toast({ type = 'info', message, onClose, duration = 3000 }) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        if (onClose) onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const iconMap = {
    success: '\u2714',
    error: '\u2716',
    info: '\u2139',
    warning: '\u26A0',
  };

  return (
    <div className={`toast toast-${type}`} role="alert">
      <span className="toast-icon">{iconMap[type] || iconMap.info}</span>
      <span className="toast-message">{message}</span>
      <button className="toast-close" onClick={onClose} aria-label="סגור">
        &times;
      </button>
    </div>
  );
}
