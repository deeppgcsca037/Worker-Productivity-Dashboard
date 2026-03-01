import { useState, useEffect } from 'react'
import { fetchMetrics, seedReset } from './api'
import { FactorySummary } from './components/FactorySummary'
import { WorkerCards } from './components/WorkerCards'
import { WorkstationCards } from './components/WorkstationCards'
import { Filters } from './components/Filters'

function App() {
  const [metrics, setMetrics] = useState(null)
  const [filterOptions, setFilterOptions] = useState({ workers: [], workstations: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [workerFilter, setWorkerFilter] = useState('')
  const [stationFilter, setStationFilter] = useState('')

  const load = () => {
    setLoading(true)
    setError(null)
    fetchMetrics(workerFilter || undefined, stationFilter || undefined)
      .then((data) => {
        setMetrics(data)
        if (!workerFilter && !stationFilter && data?.workers?.length)
          setFilterOptions({ workers: data.workers, workstations: data.workstations || [] })
      })
      .catch((e) => setError(e.message || e.response?.data?.error || 'Failed to load metrics'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 30000)
    return () => clearInterval(id)
  }, [workerFilter, stationFilter])

  const options = filterOptions.workers.length ? filterOptions : { workers: metrics?.workers ?? [], workstations: metrics?.workstations ?? [] }

  if (loading && !metrics) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-2 border-slate-600 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-slate-400">Loading productivity metrics…</p>
      </div>
    )
  }

  if (error && !metrics) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Worker Productivity Dashboard</h1>
        <p className="text-red-400 mb-2">{error}</p>
        <p className="text-slate-500 text-sm mb-4">Ensure the backend is running (npm run server) and try again.</p>
        <button onClick={load} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 pb-12">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Worker Productivity Dashboard</h1>
        <p className="text-slate-500 mt-1">AI-powered CCTV metrics</p>
        <Filters
          workerFilter={workerFilter}
          stationFilter={stationFilter}
          onWorkerChange={setWorkerFilter}
          onStationChange={setStationFilter}
          workers={options.workers}
          workstations={options.workstations}
        />
        <div className="mt-3">
          <button
            type="button"
            onClick={() => seedReset().then(load).catch((e) => setError(e.message))}
            className="text-sm px-3 py-1.5 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800 hover:border-blue-500 transition-colors"
          >
            Reset & seed dummy data
          </button>
        </div>
      </header>

      {metrics && (
        <>
          <FactorySummary data={metrics.factory} />
          <section className="mt-10">
            <h2 className="text-lg font-semibold mb-4">Workers</h2>
            <WorkerCards workers={metrics.workers} />
          </section>
          <section className="mt-10">
            <h2 className="text-lg font-semibold mb-4">Workstations</h2>
            <WorkstationCards workstations={metrics.workstations} />
          </section>
        </>
      )}

      {error && <p className="text-red-400 text-sm mt-4">Refresh error: {error}</p>}
    </div>
  )
}

export default App
