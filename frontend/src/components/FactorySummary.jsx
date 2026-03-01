function fmtSeconds(s) {
  if (s < 60) return `${Math.round(s)}s`
  const m = Math.floor(s / 60)
  const h = Math.floor(m / 60)
  if (h > 0) return `${h}h ${m % 60}m`
  return `${m}m`
}

export function FactorySummary({ data }) {
  if (!data) return null
  return (
    <section className="mb-10">
      <h2 className="text-lg font-semibold mb-4">Factory overview</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 flex flex-col gap-1">
          <span className="text-xs text-slate-500 font-medium">Total productive time</span>
          <span className="text-xl font-bold">{fmtSeconds(data.total_productive_time_seconds)}</span>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 flex flex-col gap-1">
          <span className="text-xs text-slate-500 font-medium">Total production count</span>
          <span className="text-xl font-bold">{data.total_production_count}</span>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 flex flex-col gap-1">
          <span className="text-xs text-slate-500 font-medium">Avg production rate (/hr)</span>
          <span className="text-xl font-bold">{data.avg_production_rate_per_hour?.toFixed(1) ?? 0}</span>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 flex flex-col gap-1">
          <span className="text-xs text-slate-500 font-medium">Avg utilization</span>
          <span className="text-xl font-bold">{data.avg_utilization_percent?.toFixed(1) ?? 0}%</span>
        </div>
      </div>
    </section>
  )
}
