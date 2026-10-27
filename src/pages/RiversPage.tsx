import { useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ChartCard from '../components/ChartCard'
import { chartTokens } from '../components/Chart'
import { Freshness, SourceProblem, Skeleton } from '../components/ui'
import { useRivers, type RiverReading } from '../hooks/useLiveData'
import { timeOption } from '../lib/chartOptions'
import { downloadCSV } from '../lib/export'
import { fmt, inkOn, RIVER_LEVELS } from '../lib/metrics'
import { colomboToday } from '../lib/time'
import { useSettings } from '../stores/settings'

export default function RiversPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const { rivers, query } = useRivers()
  const theme = useSettings((s) => s.theme)

  const ranked = useMemo(() => [...(rivers ?? [])].sort((a, b) => (b.ratio ?? 0) - (a.ratio ?? 0)), [rivers])
  const sel = rivers?.find((r) => r.point.id === id) ?? ranked[0]

  const option = useMemo(() => (sel ? riverOption(sel) : undefined), [sel, theme]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="text-3xl font-extrabold tracking-tight">Rivers</h1>
      <p className="mb-5 mt-1 max-w-3xl text-muted">
        Modelled daily discharge from the Copernicus Global Flood Awareness System at {rivers?.length ?? 14} points on Sri Lanka’s main rivers.
        We compare the 10-day forecast peak with the past 30 days to flag unusual rises. Gauge levels from the Irrigation Department remain the reference for flood decisions.
      </p>
      {query.error && <div className="mb-4"><SourceProblem error={query.error} onRetry={() => query.refetch()} /></div>}

      <div className="grid gap-5 lg:grid-cols-[1fr_1.25fr]">
        <div className="overflow-hidden rounded-xl border border-line bg-surface">
          {!rivers ? <Skeleton className="m-4 h-80" /> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-muted">
                  <th className="p-3 font-medium">River point</th>
                  <th className="p-3 text-right font-medium">Today</th>
                  <th className="p-3 text-right font-medium">Peak ÷ median</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((r) => {
                  const lv = RIVER_LEVELS[r.level]
                  const active = sel?.point.id === r.point.id
                  return (
                    <tr
                      key={r.point.id}
                      onClick={() => nav(`/rivers/${r.point.id}`, { replace: true })}
                      className={`cursor-pointer border-b border-line last:border-0 ${active ? 'bg-lagoon-soft' : 'hover:bg-sunken/60'}`}
                    >
                      <td className="p-3">
                        <Link to={`/rivers/${r.point.id}`} replace className="font-semibold" aria-current={active ? 'true' : undefined}>{r.point.river}</Link>
                        <div className="text-xs text-muted">near {r.point.near}</div>
                      </td>
                      <td className="p-3 text-right">{fmt(r.today)} <span className="text-xs text-muted">m³/s</span></td>
                      <td className="p-3 text-right">
                        <span className="inline-block min-w-16 rounded-md px-1.5 py-0.5 text-center text-xs font-semibold" style={{ background: lv.color, color: inkOn(lv.color) }}>
                          {r.ratio != null ? `${fmt(r.ratio, 1)}× ${lv.label}` : lv.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="space-y-4">
          {sel ? (
            <>
              <ChartCard
                title={`${sel.point.river} near ${sel.point.near}`}
                sub="Daily discharge, m³/s. Solid: best estimate. Dashed: highest ensemble member (worst plausible case)."
                option={option}
                height={300}
                file={`river-${sel.point.id}`}
              />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Tile label="Today" v={`${fmt(sel.today)} m³/s`} />
                <Tile label="30-day median" v={`${fmt(sel.median)} m³/s`} />
                <Tile label="10-day peak" v={`${fmt(sel.peak)} m³/s`} sub={sel.peakDate ?? ''} />
                <Tile label="Ensemble max" v={`${fmt(sel.ensembleMaxPeak)} m³/s`} />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                <Freshness at={query.dataUpdatedAt} fetching={query.isFetching} />
                <button
                  onClick={() => downloadCSV(`lankatwin-river-${sel.point.id}-${colomboToday()}.csv`, ['date', 'discharge_m3s', 'ensemble_max_m3s'], sel.time.map((t, i) => [t, sel.discharge[i], sel.ensembleMax[i]]))}
                  className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink hover:bg-sunken"
                >
                  CSV
                </button>
              </div>
            </>
          ) : <Skeleton className="h-80" />}
        </div>
      </div>
    </div>
  )
}

function Tile({ label, v, sub }: { label: string; v: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-3">
      <div className="text-xs text-muted">{label}</div>
      <div className="font-semibold">{v}</div>
      {sub && <div className="text-xs text-muted">{sub}</div>}
    </div>
  )
}

function riverOption(r: RiverReading) {
  const t = chartTokens()
  const today = colomboToday()
  const opt = timeOption([
    { name: 'Discharge', data: r.time.map((d, i) => [`${d}T12:00`, r.discharge[i]]), color: t.lagoon, area: true },
    { name: 'Ensemble max', data: r.time.map((d, i) => [`${d}T12:00`, i >= r.todayIndex ? r.ensembleMax[i] : null]), color: t.rambutan, dashed: true, width: 1.5 },
  ], { unit: 'm³/s', now: `${today}T12:00`, yMin0: true, decimals: 0 }) as Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
  if (r.median != null) {
    opt.series.push({
      name: '30-day median', type: 'line', data: [], silent: true, itemStyle: { color: t.muted }, lineStyle: { color: t.muted, type: 'dotted' },
      markLine: { symbol: 'none', silent: true, data: [{ yAxis: Math.round(r.median) }], lineStyle: { color: t.muted, type: 'dotted' }, label: { formatter: 'median', color: t.muted, fontSize: 10, position: 'insideStartTop' } },
    })
  }
  return opt
}
