import React, { createContext, useState, useEffect } from 'react';
import { doc, onSnapshot, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth';

export const TenantContext = createContext(null);

export function TenantProvider({ children }) {
  const { role, tenantId: authTenantId } = useAuth();
  const [selectedTenantId, setSelectedTenantId] = useState(null);
  const [tenantSettings, setTenantSettings] = useState(null);
  const [tenantList, setTenantList] = useState([]);
  const [loading, setLoading] = useState(true);

  const activeTenantId = role === 'admin' ? selectedTenantId : authTenantId;

  // Fetch list of tenants for admin
  useEffect(() => {
    if (role !== 'admin') {
      setTenantList([]);
      return;
    }

    async function fetchTenants() {
      try {
        const snap = await getDocs(collection(db, 'tenants'));
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setTenantList(list);
        if (list.length > 0 && !selectedTenantId) {
          setSelectedTenantId(list[0].id);
        }
      } catch (err) {
        console.error('Error fetching tenants:', err);
      }
    }

    fetchTenants();
  }, [role, selectedTenantId]);

  // Listen to tenant settings
  useEffect(() => {
    if (!activeTenantId) {
      setTenantSettings(null);
      setLoading(false);
      return;
    }

    const settingsRef = doc(db, 'tenants', activeTenantId, 'settings', 'app');
    const unsubscribe = onSnapshot(
      settingsRef,
      (snap) => {
        if (snap.exists()) {
          setTenantSettings({ id: snap.id, ...snap.data() });
        } else {
          setTenantSettings(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error listening to tenant settings:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [activeTenantId]);

  const value = {
    tenantId: activeTenantId,
    setTenantId: setSelectedTenantId,
    tenantSettings,
    tenantList,
    loading,
  };

  return (
    <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
  );
}
