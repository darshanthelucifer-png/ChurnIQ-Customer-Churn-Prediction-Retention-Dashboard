import { useState, useEffect, useCallback } from 'react';
import { fetchCustomers } from '../api/endpoints.js';

/**
 * Manages customer list with pagination, filters, and sorting.
 * @param {object} initialFilters
 * @returns {{ customers, total, loading, error, filters, setFilters, page, setPage }}
 */
export function useCustomers(initialFilters = {}) {
  const [customers, setCustomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    risk_tier: '',
    search: '',
    sort_by: 'churn_prob',
    order: 'desc',
    limit: 20,
    ...initialFilters,
  });

  const load = useCallback(() => {
    setLoading(true);
    const params = { page, ...filters };
    if (!params.risk_tier) delete params.risk_tier;
    if (!params.search) delete params.search;

    fetchCustomers(params)
      .then((data) => {
        setCustomers(data.customers);
        setTotal(data.total);
        setError(null);
      })
      .catch((e) => setError(e?.response?.data?.detail || 'Failed to load customers.'))
      .finally(() => setLoading(false));
  }, [page, filters]);

  useEffect(() => { load(); }, [load]);

  const updateFilters = (newFilters) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  return { customers, total, loading, error, filters, setFilters: updateFilters, page, setPage, reload: load };
}