# Worker Productivity Dashboard

Factory setup with 6 workers and 6 workstations.

**New to deployment?** See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for a step-by-step guide to deploy backend on Render and frontend on Vercel. Cameras send AI-generated events (working, idle, absent, product count) to a backend that stores them and computes metrics. The dashboard shows worker stats, workstation stats, and factory-level summaries.

Built with Node/Express + SQLite on the backend, React + Vite + Tailwind on the frontend.

---

## How it works

Cameras (or whatever sends events) hit the API with JSON. The backend writes to SQLite and computes metrics on the fly. The React app fetches those metrics and displays them.

```
Cameras → Express API → SQLite
              ↓
        React Dashboard
```

Nothing fancy. Events come in, we store them, we crunch the numbers.

---

## Quick start

Install everything:

```bash
npm run setup
```

Then run both backend and frontend:

```bash
npm run dev
```

Backend runs on port 8000, dashboard on 3000. First time you start, it'll seed some dummy data so you actually see something. If you need to reset that data, hit the "Reset & seed dummy data" button on the dashboard or:

```bash
curl -X POST http://localhost:8000/api/seed/reset
```

Want to run them separately? `npm run server` for the backend, `npm run client` for the frontend.

---

## Docker

```bash
docker compose up --build
```

Same ports. The frontend container proxies `/api` to the backend so you don't have to worry about CORS.

---

## Database

Three tables: workers, workstations, events. Workers and workstations are straightforward (id, name). Events store timestamp, worker_id, workstation_id, event_type (working, idle, absent, product_count), confidence, and count. For product_count, count is how many units were produced in that event.

There's an optional event_source_id field for deduplication—if the same event gets sent twice, we ignore the duplicate.

---

## Metrics

**Workers:** Active time (sum of "working" intervals), idle time, utilization %, total units produced, units per hour. Utilization is ActiveTime / TotalShiftTime × 100. We assume an 8-hour shift per day, and TotalShiftTime = 8 hours × number of days in the event range.

**Workstations:** Same idea—occupancy time, utilization, units produced, throughput per hour.

**Factory:** Aggregates across everyone—total productive time, total production, average rate, average utilization.

State transitions (working → idle, etc.) hold until the next event. So if someone goes "working" at 8am and the next event is "idle" at 10am, we count 2 hours of active time. We always sort by timestamp before computing, so out-of-order events are fine.

---

## API

- `POST /api/events/ingest` — single event
- `POST /api/events/ingest/batch` — multiple events
- `GET /api/metrics` — all metrics. Optional query params: `worker_id`, `station_id` to filter
- `POST /api/seed/reset` — wipe and reseed
- `POST /api/seed/events-only` — add more sample events without wiping

Example ingest:

```bash
curl -X POST http://localhost:8000/api/events/ingest \
  -H "Content-Type: application/json" \
  -d '{"timestamp":"2026-01-15T10:15:00Z","worker_id":"W1","workstation_id":"S3","event_type":"working","confidence":0.93,"count":0}'
```

---

## Assumptions

- 8-hour shift per day
- Utilization = ActiveTime / TotalShiftTime (not ActiveTime / (ActiveTime + IdleTime))
- If there's no new event, the previous state continues
- product_count events are summed; they don't affect time intervals
- Events are sorted by timestamp before any calculation—insertion order doesn't matter
- Duplicates: use event_source_id. If it's already in the DB, we return success and skip the insert

---

## Edge cases & scaling

**Connectivity:** Cameras should buffer events locally and retry when the connection comes back. Backend processes by timestamp, not arrival time, so late events are fine.

**Duplicates:** event_source_id or a hash of (timestamp + worker_id + workstation_id + event_type). Unique constraint in the DB.

**Out-of-order:** We sort. Always.

**Model versioning:** Add a model_version field to events. Store it. Segment metrics by version when you need to compare.

**Drift:** Track confidence over time, compare to manual counts, watch for sudden changes in utilization. If things look off, that's your signal.

**Retraining:** When drift hits or you add new work types, collect data, retrain, deploy new version, update the model_version field.

**Scaling:** 5 cameras? One server + SQLite is fine. 100+? Add a message queue (Kafka, SQS), move to Postgres, maybe cache. Multi-site? One backend per site, central analytics, add site_id to everything.
