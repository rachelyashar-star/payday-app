import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

export function useInvoices(tenantId, filters = {}) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const filterKey = useMemo(() => JSON.stringify(filters), [filters]);

  useEffect(() => {
    if (!tenantId) {
      setInvoices([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const invoicesRef = collection(db, 'tenants', tenantId, 'invoices');
    const q = query(invoicesRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        let docs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Apply client-side filters
        const parsedFilters = JSON.parse(filterKey);

        if (parsedFilters.pending !== undefined) {
          docs = docs.filter((d) => d.pending === parsedFilters.pending);
        }
        if (parsedFilters.clientApproved !== undefined) {
          docs = docs.filter(
            (d) => d.clientApproved === parsedFilters.clientApproved
          );
        }
        if (parsedFilters.paid !== undefined) {
          docs = docs.filter((d) => d.paid === parsedFilters.paid);
        }
        if (parsedFilters.currency) {
          docs = docs.filter((d) => d.currency === parsedFilters.currency);
        }

        setInvoices(docs);
        setLoading(false);
      },
      (err) => {
        console.error('Invoices listener error:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [tenantId, filterKey]);

  return { invoices, loading, error };
}
