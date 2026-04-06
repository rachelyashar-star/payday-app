import { useContext } from 'react';
import { TenantContext } from '../contexts/TenantContext';

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }

  return {
    tenantId: context.tenantId,
    setTenantId: context.setTenantId,
    settings: context.tenantSettings,
    tenantList: context.tenantList,
    loading: context.loading,
  };
}
