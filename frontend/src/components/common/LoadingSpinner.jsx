import React from 'react';

export default function LoadingSpinner({ fullPage = false, inline = false }) {
  if (inline) {
    return <span className="spinner spinner-inline" />;
  }

  if (fullPage) {
    return (
      <div className="spinner-fullpage">
        <div className="spinner" />
        <span className="spinner-text">טוען...</span>
      </div>
    );
  }

  return (
    <div className="spinner-container">
      <div className="spinner" />
    </div>
  );
}
