import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ShareButton } from '../components/Share'
import { ArrowDownWideNarrow, Download } from 'lucide-react'
import { Freshness, SourceProblem, Skeleton } from '../components/ui'
import { useTitle } from '../hooks/useApp'
import { useNowcast, type StationReading } from '../hooks/useLiveData'
import { bandFor, bandText, colorFor, fmt, inkOn, METRICS, uvBand } from '../lib/metrics'
import { downloadCSV } from '../lib/export'
import { placeName } from '../lib/places'
import { colomboToday } from '../lib/time'
import type { Key } from '../i18n/core'
import { useT } from '../i18n/useT'

type Col = 'aqi' | 'pm25' | 'pm10' | 'ozone' | 'no2' | 'dust' | 'uv'
const COLS: { id: Col; label: Key | string }[] = [
  { id: 'aqi', label: 'US AQI' }, { id: 'pm25', label: 'PM2.5' }, { id: 'pm10', label: 'PM10' },
  { id: 'ozone', label: 'air.ozone' }, { id: 'no2', label: 'NO₂' }, { id: 'dust', label: 'air.dust' }, { id: 'uv', label: 'UV' },
]
const val = (r: StationReading, c: Col) => (r.air ? r.air[c] : null)

// US EPA AQI bands and the advice that goes with each.
const ADVICE: [string, Key][] = [
  ['Good', 'air.advice.good'], ['Moderate', 'air.advice.moderate'], ['Sensitive', 'air.advice.sensitive'],
  ['Unhealthy', 'air.advice.unhealthy'], ['Very unhealthy', 'air.advice.veryUnhealthy'], ['Hazardous', 'air.advice.hazardous'],
]

export default function AirPage() {
  const { t, lang } = useT()
  useTitle(t('air.title'))
  const { readings, air, updatedAt } = useNowcast()
  const [sort, setSort] = useState<Col>('aqi')
  const rows = useMemo(() => [...(readings ?? [])].sort((a, b) => (val(b, sort) ?? -1) - (val(a, sort) ?? -1)), [readings, sort])
  const worst = rows[0]
  const label = (l: string) => (l.includes('.') ? t(l as Key) : l)

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 2xl:max-w-[1600px] 2xl:px-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="max-w-3xl">
          <h1 className="text-3xl font-extrabold tracking-tight">{t('air.title')}</h1>
          <p className="mt-1 text-muted">{t('air.intro')}</p>
          {worst?.air?.aqi != null && <p className="mt-2 text-sm font-medium">{t('air.worst', { place: placeName(worst.station, lang), n: fmt(worst.air.aqi) })}</p>}
        </div>
        <div className="flex gap-1.5">
        <ShareButton
          title={t('share.airTitle')}
          text={worst?.air?.aqi != null ? t('air.worst', { place: placeName(worst.station, lang), n: fmt(worst.air.aqi) }) : undefined}
          path="/air"
        />
        <button
          disabled={!readings}
          onClick={() => downloadCSV(`lankatwin-air-${colomboToday()}.csv`, ['place', 'time_asia_colombo', ...COLS.map((c) => c.id)], (readings ?? []).map((r) => [r.station.name, r.air?.time, ...COLS.map((c) => val(r, c.id))]))}
          className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium hover:bg-sunken disabled:opacity-50"
        >
          <Download className="size-4" aria-hidden /> CSV
        </button>
        </div>
      </div>

      {air.error && <div className="mb-3"><SourceProblem error={air.error} onRetry={() => air.refetch()} /></div>}
      {!readings ? <Skeleton className="h-96" /> : (
<>
        <ul className="space-y-1.5 sm:hidden">
          {rows.map((r) => {
            const aqi = r.air?.aqi
            const c = colorFor(METRICS.aqi, aqi)
            return (
              <li key={r.station.id}>
                <Link to={`/station/${r.station.id}`} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-2.5">
                  <span className="grid size-11 shrink-0 place-items-center rounded-lg text-base font-extrabold" style={aqi != null ? { background: c, color: inkOn(c) } : undefined}>{fmt(aqi)}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{placeName(r.station, lang)} <span className="text-xs font-medium text-muted">· {bandText(bandFor(METRICS.aqi, aqi), t)}</span></div>
                    <div className="truncate text-xs text-muted">PM2.5 {fmt(r.air?.pm25)} · PM10 {fmt(r.air?.pm10)} · {t('air.ozone')} {fmt(r.air?.ozone)} · UV {fmt(r.air?.uv, 1)}</div>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
        <div className="hidden overflow-x-auto sm:block rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-muted">
                <th className="p-3 font-medium">{t('places.place')}</th>
                {COLS.map((c) => (
                  <th key={c.id} className="p-3 text-right font-medium" aria-sort={sort === c.id ? 'descending' : undefined}>
                    <button onClick={() => setSort(c.id)} className={`inline-flex min-h-7 items-center gap-1 hover:text-ink ${sort === c.id ? 'text-ink' : ''}`}>
                      {sort === c.id && <ArrowDownWideNarrow className="size-3.5" aria-hidden />}{label(c.label)}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const aqi = r.air?.aqi
                const c = colorFor(METRICS.aqi, aqi)
                const pm = colorFor(METRICS.pm25, r.air?.pm25)
                return (
                  <tr key={r.station.id} className="border-b border-line last:border-0 hover:bg-sunken/60">
                    <td className="p-3"><Link to={`/station/${r.station.id}`} className="font-semibold hover:text-lagoon">{placeName(r.station, lang)}</Link></td>
                    <td className="p-2 text-right">
                      <span className="inline-block min-w-24 rounded-md px-1.5 py-0.5 text-center text-xs font-semibold" style={aqi != null ? { background: c, color: inkOn(c) } : undefined}>
                        {fmt(aqi)} · {bandText(bandFor(METRICS.aqi, aqi), t)}
                      </span>
                    </td>
                    <td className="p-2 text-right"><span className="inline-block min-w-10 rounded-md px-1.5 py-0.5 text-center font-semibold" style={r.air?.pm25 != null ? { background: pm, color: inkOn(pm) } : undefined}>{fmt(r.air?.pm25)}</span></td>
                    <td className="p-3 text-right">{fmt(r.air?.pm10)}</td>
                    <td className="p-3 text-right">{fmt(r.air?.ozone)}</td>
                    <td className="p-3 text-right">{fmt(r.air?.no2, 1)}</td>
                    <td className="p-3 text-right">{fmt(r.air?.dust)}</td>
                    <td className="p-3 text-right">{fmt(r.air?.uv, 1)} <span className="text-xs text-muted">{uvBand(r.air?.uv, t)}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        </>
      )}
      <p className="mt-3 text-xs text-muted"><Freshness at={updatedAt} fetching={air.isFetching} /> · {t('air.units')}</p>

      <h2 className="mb-3 mt-8 text-xl font-bold">{t('air.adviceTitle')}</h2>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {ADVICE.map(([band, k], i) => {
          const [hi, color] = METRICS.aqi.steps[i]
          const lo = i === 0 ? 0 : METRICS.aqi.steps[i - 1][0]
          return (
            <li key={band} className="flex gap-3 rounded-xl border border-line bg-surface p-3">
              <span className="h-auto w-1.5 shrink-0 rounded-full" style={{ background: color }} />
              <div>
                <div className="text-sm font-semibold">{bandText(band, t)} <span className="font-normal text-muted">· {lo}–{hi === Infinity ? '500' : hi - 1}</span></div>
                <p className="text-sm text-muted">{t(k)}</p>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
