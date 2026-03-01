function fmtSeconds(s) {
  if (s < 60) return `${Math.round(s)}s`
  const m = Math.floor(s / 60)
  const h = Math.floor(m / 60)
  if (h > 0) return `${h}h ${m % 60}m`
  return `${m}m`
}

export function WorkerCards({ workers = [] }) {
  if (!workers.length) return (
    <p className="text-slate-500 text-sm">No worker data (apply filters or seed via POST /api/seed/reset).</p>
  )
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {workers.map((w) => (
        <div key={w.worker_id} className="bg-slate-800 border border-slate-700 rounded-lg p-4 hover:border-blue-600/50 transition-colors">
          <div className="flex justify-between items-baseline mb-3 pb-2 border-b border-slate-700">
            <span className="font-semibold">{w.name}</span>
            <span className="text-xs text-slate-500">{w.worker_id}</span>
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>
              <dt className="text-slate-500">Active time</dt>
              <dd className="font-semibold">{fmtSeconds(w.total_active_time_seconds)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Idle time</dt>
              <dd className="font-semibold">{fmtSeconds(w.total_idle_time_seconds)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Utilization</dt>
              <dd className={`font-semibold ${w.utilization_percent >= 70 ? 'text-green-400' : 'text-slate-400'}`}>
                {w.utilization_percent?.toFixed(1) ?? 0}%
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Units produced</dt>
              <dd className="font-semibold">{w.total_units_produced}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Units/hr</dt>
              <dd className="font-semibold">{w.units_per_hour?.toFixed(1) ?? 0}</dd>
            </div>
          </dl>
        </div>
      ))}
    </div>
  )
}
