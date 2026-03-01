import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

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
