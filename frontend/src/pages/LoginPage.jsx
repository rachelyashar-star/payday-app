import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Toast from '../components/common/Toast';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { LOGO_URL } from '../utils/constants';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const { login, user, role } = useAuth();
  const navigate = useNavigate();

  // If already logged in, redirect
  React.useEffect(() => {
    if (user) {
      navigate(role === 'admin' ? '/admin' : '/invoices', { replace: true });
    }
  }, [user, role, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setToast({ type: 'error', message: 'נא למלא את כל השדות' });
      return;
    }

    setLoading(true);
    try {
      const result = await login(email, password);
      navigate(result.role === 'admin' ? '/admin' : '/invoices', {
        replace: true,
      });
    } catch (err) {
      let message = 'שגיאה בהתחברות';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        message = 'אימייל או סיסמה שגויים';
      } else if (err.code === 'auth/invalid-email') {
        message = 'כתובת אימייל לא תקינה';
      } else if (err.code === 'auth/too-many-requests') {
        message = 'יותר מדי ניסיונות. נסו שוב מאוחר יותר';
      } else if (err.code === 'auth/invalid-credential') {
        message = 'אימייל או סיסמה שגויים';
      }
      setToast({ type: 'error', message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <img src={LOGO_URL} alt="Pay Day" className="login-logo" />
          <h1 className="login-title">Pay Day</h1>
          <p className="login-subtitle">ניהול חשבוניות חכם</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">אימייל</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="הכנס כתובת אימייל"
              autoComplete="email"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">סיסמה</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="הכנס סיסמה"
              autoComplete="current-password"
              disabled={loading}
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? <LoadingSpinner inline /> : 'התחבר'}
          </button>
        </form>
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
