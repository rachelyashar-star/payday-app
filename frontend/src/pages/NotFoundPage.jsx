import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="not-found-page">
      <div className="not-found-content">
        <h1 className="not-found-code">404</h1>
        <h2 className="not-found-title">הדף לא נמצא</h2>
        <p className="not-found-message">
          הדף שחיפשת לא קיים או שהוסר.
        </p>
        <Link to="/" className="btn btn-primary">
          חזור לדף הבית
        </Link>
      </div>
    </div>
  );
}
