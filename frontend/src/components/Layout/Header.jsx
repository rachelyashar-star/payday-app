import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../hooks/useTenant';
import { LOGO_URL } from '../../utils/constants';

export default function Header() {
  const { user, role, logout, isAdmin } = useAuth();
  const { tenantSettings } = useTenant();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const roleLabel = role === 'admin' ? 'מנהל' : 'לקוח';
  const companyName = tenantSettings?.companyName || '';

  return (
    <header className="app-header">
      <div className="header-container">
        <div className="header-right">
          <Link to="/" className="header-brand">
            <img src={LOGO_URL} alt="Pay Day" className="header-logo" />
            <span className="header-title">Pay Day</span>
          </Link>

          {companyName && (
            <span className="header-tenant-badge">{companyName}</span>
          )}
        </div>

        <nav className="header-nav">
          {isAdmin && (
            <>
              <Link to="/admin" className="nav-link">
                לוח בקרה
              </Link>
              <Link to="/admin/tenants" className="nav-link">
                ניהול לקוחות
              </Link>
            </>
          )}
          <Link to="/invoices" className="nav-link">
            חשבוניות
          </Link>
          <Link to="/history" className="nav-link">
            היסטוריה
          </Link>
        </nav>

        <div className="header-left">
          <span className={`role-badge role-${role}`}>{roleLabel}</span>
          <span className="header-user-email">{user?.email}</span>
          <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
            התנתק
          </button>
        </div>
      </div>
    </header>
  );
}
