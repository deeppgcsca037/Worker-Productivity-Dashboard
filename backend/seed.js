const WORKERS = [
  { worker_id: 'W1', name: 'Alice Chen' },
  { worker_id: 'W2', name: 'Bob Martinez' },
  { worker_id: 'W3', name: 'Carol Johnson' },
  { worker_id: 'W4', name: 'David Kim' },
  { worker_id: 'W5', name: 'Eva Rodriguez' },
  { worker_id: 'W6', name: 'Frank Williams' },
];

const WORKSTATIONS = [
  { station_id: 'S1', name: 'Assembly A' },
  { station_id: 'S2', name: 'Assembly B' },
  { station_id: 'S3', name: 'Quality Check' },
  { station_id: 'S4', name: 'Packaging' },
  { station_id: 'S5', name: 'Welding' },
  { station_id: 'S6', name: 'Inspection' },
];

function generateSampleEvents(daysBack = 7, eventsPerDay = 20) {
  const events = [];
  const base = new Date();
  base.setDate(base.getDate() - daysBack);
  base.setHours(8, 0, 0, 0);
  let eventId = 0;
  for (let day = 0; day < daysBack; day++) {
    const dayStart = new Date(base);
    dayStart.setDate(dayStart.getDate() + day);
    for (const w of WORKERS) {
      const stations = [...WORKSTATIONS].sort(() => Math.random() - 0.5).slice(0, 2);
      let t = new Date(dayStart);
      while (t < new Date(dayStart.getTime() + 8 * 60 * 60 * 1000)) {
        const sid = stations[Math.floor(Math.random() * stations.length)].station_id;
        eventId++;
        const state = Math.random() > 0.3 ? 'working' : 'idle';
        events.push({
          timestamp: t.toISOString(),
          worker_id: w.worker_id,
          workstation_id: sid,
          event_type: state,
          confidence: 0.85 + Math.random() * 0.14,
          count: 0,
          event_source_id: `seed-${day}-${w.worker_id}-${sid}-${eventId}`,
        });
        t.setMinutes(t.getMinutes() + 5 + Math.floor(Math.random() * 20));
      }
      for (let i = 0; i < 3 + Math.floor(Math.random() * 5); i++) {
        eventId++;
        const t = new Date(dayStart);
        t.setHours(t.getHours() + Math.floor(Math.random() * 8), Math.floor(Math.random() * 60), 0, 0);
        const sid = stations[Math.floor(Math.random() * stations.length)].station_id;
        events.push({
          timestamp: t.toISOString(),
          worker_id: w.worker_id,
          workstation_id: sid,
          event_type: 'product_count',
          confidence: 0.9 + Math.random() * 0.09,
          count: 1 + Math.floor(Math.random() * 4),
          event_source_id: `seed-p-${day}-${w.worker_id}-${eventId}`,
        });
      }
    }
  }
  return events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

export { WORKERS, WORKSTATIONS, generateSampleEvents };
