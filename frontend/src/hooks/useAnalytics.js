import { useState, useEffect } from 'react';
import { fetchOverview } from '../api/endpoints.js';

/**
 * Fetches and manages overview analytics state.
 * @returns {{ data: object|null, loading: boolean, error: string|null }}
 */
export function useAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetchOverview()
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((e) => setError(e?.response?.data?.detail || 'Failed to load analytics.'))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
}