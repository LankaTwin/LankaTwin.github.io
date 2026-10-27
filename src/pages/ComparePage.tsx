import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download } from 'lucide-react'
import ChartCard from '../components/ChartCard'
import { Freshness, Segmented, SourceProblem } from '../components/ui'
import { fetchMultiSeries, series } from '../lib/api'
import { timeOption } from '../lib/chartOptions'
import { downloadCSV } from '../lib/export'
import { fmt } from '../lib/metrics'
import { STATIONS, stationById } from '../lib/places'
import { colomboNow, colomboToday } from '../lib/time'
import { useSettings } from '../stores/settings'
import { useTitle } from '../hooks/useApp'
import { placeName } from '../lib/places'
import type { Key } from '../i18n/core'
import { useT } from '../i18n/useT'

// Labels come from compare.var.<id> in the translation files.
const VARS = [
  { id: 'temperature_2m', unit: '°C', d: 1 },
  { id: 'apparent_temperature', unit: '°C', d: 1 },
  { id: 'precipitation', unit: 'mm', d: 0, cumulative: true },
  { id: 'relative_humidity_2m', unit: '%', d: 0 },
  { id: 'wind_gusts_10m', unit: 'km/h', d: 0 },
  { id: 'soil_moisture_0_to_1cm', unit: 'm³/m³', d: 2 },
] as const

const COLORS = ['#0E8A96', '#D08A0C', '#C8453A', '#5B8F33', '#7461C2']
const MAX = 5

export default function ComparePage() {
  const { compare, setCompare, theme } = useSettings()
  const [v, setV] = useState<(typeof VARS)[number]['id']>('temperature_2m')
  const [past, setPast] = useState<'7' | '30'>('7')
  const { t, lang } = useT()
  const vlabel = (id: string) => t(`compare.var.${id}` as Key)
  useTitle(t('compare.title'))
  const variable = VARS.find((x) => x.id === v)!
  const picked = compare.map(stationById).filter((s): s is NonNullable<typeof s> => !!s)

  const q = useQuery({
    queryKey: ['compare', compare.join(','), v, past],
    queryFn: ({ signal }) => fetchMultiSeries(picked, v, Number(past), 7, signal),
    enabled: picked.length > 0,
  })

  const now = colomboNow()
  const data = useMemo(() => {
    if (!q.data) return undefined
    return q.data.map((r, i) => {
      const time = (r.hourly?.time ?? []) as string[]
      let vals = series(r.hourly, v)
      if ('cumulative' in variable && variable.cumulative) {
        let acc = 0
        vals = vals.map((x) => (acc += x ?? 0))
      }
      return { station: picked[i], time, vals }
    })
  }, [q.data, v]) // eslint-disable-line react-hooks/exhaustive-deps

  const option = useMemo(() => data && timeOption(
    data.map((d, i) => ({ name: placeName(d.station, lang), data: d.time.map((t, k) => [t, d.vals[k]] as [string, number | null]), color: COLORS[i % COLORS.length], width: 1.75 })),
    { unit: variable.unit, now, decimals: variable.d, yMin0: v === 'precipitation' },
  ), [data, theme, lang]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (id: string) => {
    if (compare.includes(id)) setCompare(compare.filter((x) => x !== id))
    else if (compare.length < MAX) setCompare([...compare, id])
  }

  const summary = data?.map((d) => {
    const pastVals = d.vals.filter((_, k) => d.time[k] <= now).filter((x): x is number => x != null)
    const latest = pastVals.at(-1) ?? null
    const mean = pastVals.length ? pastVals.reduce((a, b) => a + b, 0) / pastVals.length : null
    return { s: d.station, latest, mean, max: pastVals.length ? Math.max(...pastVals) : null }
  })

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="text-3xl font-extrabold tracking-tight">{t('compare.title')}</h1>
      <p className="mb-5 mt-1 text-muted">{t('compare.intro', { n: MAX })}</p>

      <div className="mb-4 flex flex-wrap gap-1.5" role="group" aria-label={t('compare.places')}>
        {STATIONS.map((s) => {
          const i = compare.indexOf(s.id)
          const on = i >= 0
          return (
            <button
              key={s.id}
              aria-pressed={on}
              onClick={() => toggle(s.id)}
              disabled={!on && compare.length >= MAX}
              className={`rounded-full border px-3 py-1 text-sm font-medium disabled:opacity-40 ${on ? 'border-transparent text-white' : 'border-line bg-surface text-muted hover:text-ink'}`}
              style={on ? { background: COLORS[i % COLORS.length] } : undefined}
            >
              {placeName(s, lang)}
            </button>
          )
        })}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Segmented label={t('compare.variable')} value={v} onChange={setV} options={VARS.map((x) => ({ value: x.id, label: vlabel(x.id) }))} size="sm" />
        <Segmented label={t('compare.history')} value={past} onChange={setPast} options={[{ value: '7', label: t('compare.past7') }, { value: '30', label: t('compare.past30') }]} size="sm" />
      </div>

      {q.error && <div className="mb-3"><SourceProblem error={q.error} onRetry={() => q.refetch()} /></div>}
      {picked.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line p-10 text-center text-muted">{t('compare.empty')}</div>
      ) : (
        <ChartCard title={`${vlabel(variable.id)}, ${variable.unit}`} sub={t('compare.chartSub')} option={option} loading={q.isLoading} height={360} file={`compare-${v}`}>
          {summary && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-muted"><th className="py-1.5 font-medium">{t('places.place')}</th><th className="py-1.5 text-right font-medium">{t('compare.latest')}</th><th className="py-1.5 text-right font-medium">{t('compare.mean')}</th><th className="py-1.5 text-right font-medium">{t('compare.max')}</th></tr></thead>
                <tbody>
                  {summary.map((r, i) => (
                    <tr key={r.s.id} className="border-t border-line">
                      <td className="py-1.5"><span className="mr-2 inline-block size-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />{placeName(r.s, lang)}</td>
                      <td className="py-1.5 text-right font-semibold">{fmt(r.latest, variable.d)}</td>
                      <td className="py-1.5 text-right">{'cumulative' in variable ? '—' : fmt(r.mean, variable.d)}</td>
                      <td className="py-1.5 text-right">{fmt(r.max, variable.d)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-3 flex items-center justify-between text-xs text-muted">
                <Freshness at={q.dataUpdatedAt} fetching={q.isFetching} />
                <button
                  onClick={() => data && downloadCSV(`lankatwin-compare-${v}-${colomboToday()}.csv`, ['time_asia_colombo', ...data.map((d) => d.station.name)], data[0].time.map((t, k) => [t, ...data.map((d) => d.vals[k])]))}
                  className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink hover:bg-sunken"
                >
                  <Download className="size-4" aria-hidden /> CSV
                </button>
              </div>
            </div>
          )}
        </ChartCard>
      )}
    </div>
  )
}
