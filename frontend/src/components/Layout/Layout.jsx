import React from 'react';
import Header from './Header';

export default function Layout({ children }) {
  return (
    <div className="app-layout">
      <Header />
      <main className="main-content">
        <div className="content-container">{children}</div>
      </main>
    </div>
  );
}
