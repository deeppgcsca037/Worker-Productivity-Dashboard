export function Filters({ workerFilter, stationFilter, onWorkerChange, onStationChange, workers = [], workstations = [] }) {
  return (
    <div className="flex flex-wrap gap-4 items-end mt-4">
      <label className="flex flex-col gap-1">
        <span className="text-xs text-slate-500 font-medium">Worker</span>
        <select
          value={workerFilter}
          onChange={(e) => onWorkerChange(e.target.value)}
          className="bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2 rounded-lg min-w-[180px] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">All workers</option>
          {workers.map((w) => (
            <option key={w.worker_id} value={w.worker_id}>
              {w.name} ({w.worker_id})
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-slate-500 font-medium">Workstation</span>
        <select
          value={stationFilter}
          onChange={(e) => onStationChange(e.target.value)}
          className="bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2 rounded-lg min-w-[180px] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">All workstations</option>
          {workstations.map((s) => (
            <option key={s.station_id} value={s.station_id}>
              {s.name} ({s.station_id})
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
