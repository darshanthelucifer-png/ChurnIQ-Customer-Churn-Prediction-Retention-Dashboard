import { useState } from 'react';
import { predictChurn } from '../api/endpoints.js';

/**
 * Manages prediction state for the Predict & Simulate page.
 * @returns {{ result, loading, error, predict }}
 */
export function usePrediction() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const predict = async (payload) => {
    setLoading(true);
    setError(null);
    try {
      const data = await predictChurn(payload);
      setResult(data);
      return data;
    } catch (e) {
      const msg = e?.response?.data?.detail || 'Prediction failed.';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { result, loading, error, predict };
}