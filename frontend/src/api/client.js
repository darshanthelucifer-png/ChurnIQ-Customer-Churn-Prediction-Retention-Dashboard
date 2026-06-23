/**
 * Axios base client configured for the ChurnIQ FastAPI backend.
 */
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30_000,
});

// Response interceptor — log errors globally
client.interceptors.response.use(
  (response) => response,
  (error) => {
    const msg = error?.response?.data?.detail || error.message || 'Unknown error';
    console.error('[API Error]', msg);
    return Promise.reject(error);
  }
);

export default client;