import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return {
    user: context.user,
    role: context.role,
    tenantId: context.tenantId,
    loading: context.loading,
    login: context.login,
    logout: context.logout,
    isAdmin: context.role === 'admin',
    isClient: context.role === 'client',
  };
}
