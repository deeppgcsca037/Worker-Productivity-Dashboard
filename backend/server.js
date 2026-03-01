import express from 'express';
import cors from 'cors';
import moment from 'moment';
import { db, initDb } from './db.js';
import { WORKERS, WORKSTATIONS, generateSampleEvents } from './seed.js';

const app = express();
app.use(cors());
app.use(express.json());

initDb();


db.get('SELECT COUNT(*) as c FROM events', (err, row) => {
  if (!err && row.c === 0) {
    runSeed();
  }
});

function runSeed() {
  db.serialize(() => {
    db.run('DELETE FROM events');
    db.run('DELETE FROM workers');
    db.run('DELETE FROM workstations');
    WORKERS.forEach((w) => db.run('INSERT INTO workers (worker_id, name) VALUES (?, ?)', [w.worker_id, w.name]));
    WORKSTATIONS.forEach((s) => db.run('INSERT INTO workstations (station_id, name) VALUES (?, ?)', [s.station_id, s.name]));
    const events = generateSampleEvents(7);
    const stmt = db.prepare('INSERT INTO events (timestamp, worker_id, workstation_id, event_type, confidence, count, event_source_id) VALUES (?, ?, ?, ?, ?, ?, ?)');
    events.forEach((e) => stmt.run(e.timestamp, e.worker_id, e.workstation_id, e.event_type, e.confidence, e.count || 0, e.event_source_id));
    stmt.finalize(() => console.log('Seed complete.'));
  });
}

// --- Routes ---

app.get('/', (req, res) => {
  res.json({ service: 'worker-productivity-api', docs: '/api/docs' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// single event
app.post('/api/events/ingest', (req, res) => {
  const { timestamp, worker_id, workstation_id, event_type, confidence = 1, count = 0, event_source_id } = req.body;
  if (!timestamp || !worker_id || !workstation_id || !event_type) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  db.run(
    'INSERT INTO events (timestamp, worker_id, workstation_id, event_type, confidence, count, event_source_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [timestamp, worker_id, workstation_id, event_type, confidence, count, event_source_id || null],
    function (err) {
      if (err) {
        if (err.message.includes('UNIQUE') && event_source_id) {
          return res.status(201).json({ status: 'duplicate', event_source_id });
        }
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ id: this.lastID, status: 'created' });
    }
  );
});

// Ingest batch
app.post('/api/events/ingest/batch', (req, res) => {
  const { events } = req.body || {};
  if (!Array.isArray(events)) return res.status(400).json({ error: 'events array required' });
  let created = 0, skipped = 0;
  const stmt = db.prepare('INSERT INTO events (timestamp, worker_id, workstation_id, event_type, confidence, count, event_source_id) VALUES (?, ?, ?, ?, ?, ?, ?)');
  let pending = events.length;
  if (pending === 0) return res.status(201).json({ created: 0, skipped: 0 });
  events.forEach((e) => {
    stmt.run(e.timestamp, e.worker_id, e.workstation_id, e.event_type, e.confidence ?? 1, e.count ?? 0, e.event_source_id ?? null, (err) => {
      if (err && err.message.includes('UNIQUE')) skipped++;
      else created++;
      if (--pending === 0) {
        stmt.finalize();
        res.status(201).json({ created, skipped });
      }
    });
  });
});

// Seed reset
app.post('/api/seed/reset', (req, res) => {
  runSeed();
  res.json({ status: 'ok', message: 'Workers, workstations, and sample events seeded.' });
});

app.post('/api/seed/events-only', (req, res) => {
  const events = generateSampleEvents(1, 10);
  const stmt = db.prepare('INSERT OR IGNORE INTO events (timestamp, worker_id, workstation_id, event_type, confidence, count, event_source_id) VALUES (?, ?, ?, ?, ?, ?, ?)');
  events.forEach((e) => stmt.run(e.timestamp, e.worker_id, e.workstation_id, e.event_type, e.confidence, e.count || 0, e.event_source_id));
  stmt.finalize(() => res.json({ status: 'ok', message: 'Additional sample events added.' }));
});

// Metrics
app.get('/api/metrics', (req, res) => {
  const { worker_id, station_id } = req.query;
  db.all('SELECT * FROM events ORDER BY timestamp', [], (err, events) => {
    if (err) return res.status(500).json({ error: err.message });
    db.all('SELECT * FROM workers', [], (errW, workers) => {
      if (errW) return res.status(500).json({ error: errW.message });
      db.all('SELECT * FROM workstations', [], (errS, workstations) => {
        if (errS) return res.status(500).json({ error: errS.message });
        const metrics = computeMetrics(events, workers, workstations);
        if (worker_id) metrics.workers = metrics.workers.filter((w) => w.worker_id === worker_id);
        if (station_id) metrics.workstations = metrics.workstations.filter((s) => s.station_id === station_id);
        res.json(metrics);
      });
    });
  });
});

const SHIFT_HOURS = 8;
const SHIFT_SECONDS = SHIFT_HOURS * 3600;

function computeMetrics(events, workers, workstations) {
  const tMin = events.length ? moment(events[0].timestamp) : moment();
  const tMax = events.length ? moment(events[events.length - 1].timestamp).add(30, 'minutes') : moment();
  const windowSec = tMax.diff(tMin, 'seconds') || 1;
  // Total shift time: assume 8-hour shift per day count distinct calendar days in event range
  const numDays = events.length ? moment(tMax).startOf('day').diff(moment(tMin).startOf('day'), 'days') + 1 : 1;
  const totalShiftSeconds = Math.max(1, numDays * SHIFT_SECONDS);

  const workerMetrics = workers.map((w) => {
    const workerEvents = events.filter((e) => e.worker_id === w.worker_id && ['working', 'idle', 'absent'].includes(e.event_type)).sort((a, b) => moment(a.timestamp).valueOf() - moment(b.timestamp).valueOf());
    let totalWorking = 0, totalIdle = 0;
    for (let i = 0; i < workerEvents.length; i++) {
      const start = moment(workerEvents[i].timestamp);
      const end = i + 1 < workerEvents.length ? moment(workerEvents[i + 1].timestamp) : tMax;
      const dur = Math.max(0, end.diff(start, 'seconds'));
      if (workerEvents[i].event_type === 'working') totalWorking += dur;
      else if (workerEvents[i].event_type === 'idle') totalIdle += dur;
    }
    const totalUnits = events.filter((e) => e.worker_id === w.worker_id && e.event_type === 'product_count').reduce((s, e) => s + (e.count || 0), 0);
    const activeHours = totalWorking / 3600;
    // Utilization = (ActiveTime / TotalShiftTime) × 100 (per spec: 8-hour shift assumption)
    const util = Math.min(100, (100 * totalWorking) / totalShiftSeconds);
    const uph = activeHours ? totalUnits / activeHours : 0;
    return {
      worker_id: w.worker_id,
      name: w.name,
      total_active_time_seconds: Math.round(totalWorking * 100) / 100,
      total_idle_time_seconds: Math.round(totalIdle * 100) / 100,
      utilization_percent: Math.round(util * 100) / 100,
      total_units_produced: totalUnits,
      units_per_hour: Math.round(uph * 100) / 100,
    };
  });

  const stationMetrics = workstations.map((s) => {
    const stationEvents = events.filter((e) => e.workstation_id === s.station_id && ['working', 'idle'].includes(e.event_type)).sort((a, b) => moment(a.timestamp).valueOf() - moment(b.timestamp).valueOf());
    let occupancy = 0;
    for (let i = 0; i < stationEvents.length; i++) {
      const start = moment(stationEvents[i].timestamp);
      const end = i + 1 < stationEvents.length ? moment(stationEvents[i + 1].timestamp) : tMax;
      occupancy += Math.max(0, end.diff(start, 'seconds'));
    }
    const totalUnits = events.filter((e) => e.workstation_id === s.station_id && e.event_type === 'product_count').reduce((s, e) => s + (e.count || 0), 0);
    const occHours = occupancy / 3600;
    // Workstation utilization = Occupancy / TotalShiftTime (8-hour shift per day)
    const util = Math.min(100, (100 * occupancy) / totalShiftSeconds);
    const throughput = occHours ? totalUnits / occHours : 0;
    return {
      station_id: s.station_id,
      name: s.name,
      occupancy_time_seconds: Math.round(occupancy * 100) / 100,
      utilization_percent: Math.round(util * 100) / 100,
      total_units_produced: totalUnits,
      throughput_per_hour: Math.round(throughput * 100) / 100,
    };
  });

  const totalProductive = workerMetrics.reduce((s, w) => s + w.total_active_time_seconds, 0);
  const totalProduction = workerMetrics.reduce((s, w) => s + w.total_units_produced, 0);
  const totalHours = totalProductive / 3600;
  const avgRate = totalHours ? totalProduction / totalHours : 0;
  const avgUtil = workerMetrics.length ? workerMetrics.reduce((s, w) => s + w.utilization_percent, 0) / workerMetrics.length : 0;

  return {
    factory: {
      total_productive_time_seconds: Math.round(totalProductive * 100) / 100,
      total_production_count: totalProduction,
      avg_production_rate_per_hour: Math.round(avgRate * 100) / 100,
      avg_utilization_percent: Math.round(avgUtil * 100) / 100,
    },
    workers: workerMetrics,
    workstations: stationMetrics,
  };
}

const PORT = process.env.PORT || 8000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
