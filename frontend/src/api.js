import axios from 'axios';

// In production, use the backend URL. In development, use the proxy.
const isProduction = import.meta.env.PROD;
const API_BASE = isProduction 
  ? (import.meta.env.VITE_API_URL || 'https://your-render-app.onrender.com') 
  : '';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000, // 10 second timeout
});

// Add response interceptor for better error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export async function fetchMetrics(workerId, stationId) {
  const params = {};
  if (workerId) params.worker_id = workerId;
  if (stationId) params.station_id = stationId;
  const { data } = await api.get('/api/metrics', { params });
  return data;
}

export async function seedReset() {
  const { data } = await api.post('/api/seed/reset');
  return data;
}

export async function ingestEvent(event) {
  const { data } = await api.post('/api/events/ingest', event);
  return data;
}
