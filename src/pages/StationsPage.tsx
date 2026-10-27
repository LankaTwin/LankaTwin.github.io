import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDownWideNarrow } from 'lucide-react'
import { FavoriteButton, Freshness, SourceProblem, Skeleton } from '../components/ui'
import WeatherIcon from '../components/WeatherIcon'
import { useTitle } from '../hooks/useApp'
import { useSettings } from '../stores/settings'
import { useNowcast } from '../hooks/useLiveData'
import { colorFor, fmt, inkOn, METRIC_ORDER, METRICS, metricText, weatherText, type MetricId } from '../lib/metrics'
import { downloadCSV } from '../lib/export'
import { colomboToday } from '../lib/time'
import { placeName } from '../lib/places'
import { tFor, type Key } from '../i18n/core'
import { useT } from '../i18n/useT'

const PROVINCES = ['Western', 'Central', 'Southern', 'Northern', 'Eastern', 'North Western', 'North Central', 'Uva', 'Sabaragamuwa']

export default function StationsPage() {
  const { readings, weather, updatedAt } = useNowcast()
  const [sort, setSort] = useState<MetricId | 'name'>('name')
  const [prov, setProv] = useState('All')
  const favorites = useSettings((s) => s.favorites)
  const { t, lang } = useT()
  useTitle(t('places.title'))
  const rows = useMemo(() => {
    const list = (readings ?? []).filter((r) => prov === 'All' || (prov === 'Starred' ? favorites.includes(r.station.id) : r.station.province === prov))
    const fav = (r: (typeof list)[number]) => (favorites.includes(r.station.id) ? 0 : 1)
    // Starred places stay on top within whichever ranking is chosen.
    return sort === 'name'
      ? [...list].sort((a, b) => fav(a) - fav(b) || placeName(a.station, lang).localeCompare(placeName(b.station, lang)))
      : [...list].sort((a, b) => fav(a) - fav(b) || (b.values[sort] ?? -999) - (a.values[sort] ?? -999))
  }, [readings, sort, prov, favorites, lang])

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">{t('places.title')}</h1>
          <p className="text-muted">{t('places.intro')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm text-muted" htmlFor="prov">{t('places.show')}</label>
          <select id="prov" value={prov} onChange={(e) => setProv(e.target.value)} className="rounded-lg border border-line bg-surface px-2 py-1.5 text-sm">
            <option value="All">{t('places.all')}</option>
            <option value="Starred">{t('places.starred')}</option>
            {PROVINCES.map((p) => <option key={p} value={p}>{t('common.province', { name: t(`prov.${p}` as Key) })}</option>)}
          </select>
          <select aria-label={t('places.place')} value={sort} onChange={(e) => setSort(e.target.value as MetricId | 'name')} className="rounded-lg border border-line bg-surface px-2 py-1.5 text-sm sm:hidden">
            <option value="name">{t('places.place')}</option>
            {METRIC_ORDER.map((m) => <option key={m} value={m}>{metricText(m, t).label}</option>)}
          </select>
          <button
            disabled={!readings}
            onClick={() => downloadCSV(`lankatwin-places-${colomboToday()}.csv`,
              ['place', 'district', 'province', 'time_asia_colombo', ...METRIC_ORDER, 'weather'],
              (readings ?? []).map((r) => [r.station.name, r.station.district, r.station.province, r.time, ...METRIC_ORDER.map((m) => r.values[m]), weatherText(r.weatherCode, tFor('en'))]))}
            className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium hover:bg-sunken disabled:opacity-50"
          >
            CSV
          </button>
        </div>
      </div>
      {weather.error && <div className="mb-3"><SourceProblem error={weather.error} onRetry={() => weather.refetch()} /></div>}
      {!readings ? <Skeleton className="h-96" /> : (
<>
        <ul className="space-y-1.5 sm:hidden">
          {rows.length === 0 && <li className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">{t(prov === 'Starred' ? 'places.noStarred' : 'places.none')}</li>}
          {rows.map((r) => {
            const m = sort === 'name' ? 'temp' : sort
            const v = r.values[m]
            const c = colorFor(METRICS[m], v)
            return (
              <li key={r.station.id} className="flex items-center gap-2 rounded-xl border border-line bg-surface p-2.5">
                <FavoriteButton id={r.station.id} name={placeName(r.station, lang)} />
                <WeatherIcon code={r.weatherCode} isDay={r.isDay ?? true} className="size-9 shrink-0" />
                <Link to={`/station/${r.station.id}`} className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{placeName(r.station, lang)}</div>
                  <div className="truncate text-xs text-muted">{weatherText(r.weatherCode, t)} · {fmt(r.values.rainNext24)} mm · AQI {fmt(r.values.aqi)}</div>
                </Link>
                <div className="shrink-0 text-right">
                  <div className="text-lg font-extrabold leading-tight">{fmt(r.values.temp)}°</div>
                  {m !== 'temp' && <span className="rounded px-1.5 text-xs font-semibold" style={{ background: c, color: inkOn(c) }}>{metricText(m, t).short} {fmt(v, METRICS[m].decimals)}</span>}
                </div>
              </li>
            )
          })}
        </ul>
        <div className="hidden overflow-x-auto sm:block rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-muted">
                <th className="w-8 p-1"><span className="sr-only">{t('places.starred')}</span></th>
                <th className="p-3 font-medium">
                  <button onClick={() => setSort('name')} className={`hover:text-ink ${sort === 'name' ? 'text-ink' : ''}`}>{t('places.place')}</button>
                </th>
                <th className="p-3 font-medium">{t('places.sky')}</th>
                {METRIC_ORDER.map((m) => (
                  <th key={m} className="p-3 text-right font-medium" aria-sort={sort === m ? 'descending' : undefined}>
                    <button onClick={() => setSort(m)} title={metricText(m, t).help} className={`inline-flex items-center gap-1 hover:text-ink ${sort === m ? 'text-ink' : ''}`}>
                      {sort === m && <ArrowDownWideNarrow className="size-3.5" aria-hidden />}{metricText(m, t).short}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={METRIC_ORDER.length + 3} className="p-8 text-center text-muted">
                  {t(prov === 'Starred' ? 'places.noStarred' : 'places.none')}
                </td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.station.id} className="border-b border-line last:border-0 hover:bg-sunken/60">
                  <td className="p-1 pl-2"><FavoriteButton id={r.station.id} name={placeName(r.station, lang)} /></td>
                  <td className="p-3">
                    <Link to={`/station/${r.station.id}`} className="font-semibold hover:text-lagoon">{placeName(r.station, lang)}</Link>
                    <div className="text-xs text-muted">{t(`prov.${r.station.province}` as Key)}</div>
                  </td>
                  <td className="p-3 text-muted"><span className="flex items-center gap-1.5"><WeatherIcon code={r.weatherCode} isDay={r.isDay ?? true} className="size-7 shrink-0" />{weatherText(r.weatherCode, t)}</span></td>
                  {METRIC_ORDER.map((m) => {
                    const v = r.values[m]
                    const c = colorFor(METRICS[m], v)
                    return (
                      <td key={m} className="p-2 text-right">
                        <span className="inline-block min-w-11 rounded-md px-1.5 py-0.5 text-center font-semibold" style={sort === m ? { background: c, color: inkOn(c) } : undefined}>
                          {fmt(v, METRICS[m].decimals)}
                        </span>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
      <p className="mt-3 text-xs text-muted">
        <Freshness at={updatedAt} fetching={weather.isFetching} />. {t('places.units')}
      </p>
    </div>
  )
}
