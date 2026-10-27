import { useMemo } from 'react'
import { ShareButton } from './Share'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight, Mountain, X } from 'lucide-react'
import { fetchSpot } from '../lib/api'
import { colorFor, fmt, inkOn, METRICS, riverLevelText, weatherText } from '../lib/metrics'
import { distanceKm, nearestStation, placeName, riverNames, RIVER_POINTS } from '../lib/places'
import { FLOOD_LEVELS, floodRisk, nearestRiver } from '../lib/flood'
import { num, rainWindows, riverStats, useRivers } from '../hooks/useLiveData'
import type { Key } from '../i18n/core'
import { useT } from '../i18n/useT'
import WeatherIcon from './WeatherIcon'
import { SourceProblem, Skeleton, Stat } from './ui'

/** Elevation, weather, air, river flow and flood risk for any tapped point on the map. */
export default function SpotCard({ lat, lon, onClose }: { lat: number; lon: number; onClose: () => void }) {
  const { t, lang } = useT()
  const { rivers } = useRivers()
  const q = useQuery({
    queryKey: ['spot', lat.toFixed(3), lon.toFixed(3)],
    queryFn: ({ signal }) => fetchSpot(lat, lon, signal),
    staleTime: 10 * 60_000,
  })

  const town = nearestStation({ lat, lon })
  const river = useMemo(() => {
    const p = RIVER_POINTS.map((r) => ({ point: r, km: distanceKm({ lat, lon }, r) })).sort((a, b) => a.km - b.km)[0]
    return { ...p, reading: rivers?.find((r) => r.point.id === p.point.id) }
  }, [lat, lon, rivers])

  const d = q.data
  const view = useMemo(() => {
    if (!d) return undefined
    const c = d.weather?.current ?? {}
    const rain = d.weather ? rainWindows(d.weather) : { past: null, next: null }
    // GloFAS models every 5 km cell, but tiny cells away from real channels carry almost no flow.
    const cell = d.flood ? riverStats(d.flood) : undefined
    const onRiver = cell && cell.median != null && cell.median >= 1
    const ratio = onRiver ? cell!.ratio : nearestRiver({ lat, lon }, rivers)?.reading?.ratio ?? null
    const risk = floodRisk({ rain24: rain.past, rainNext24: rain.next, riverRatio: ratio, elevation: d.elevation })
    return {
      temp: num(c.temperature_2m), code: num(c.weather_code), isDay: c.is_day == null ? true : Number(c.is_day) === 1,
      rain, aqi: num(d.air?.current?.us_aqi), cell: onRiver ? cell : undefined, risk,
    }
  }, [d, lat, lon, rivers])

  const aqiC = colorFor(METRICS.aqi, view?.aqi)
  const fl = view ? FLOOD_LEVELS[view.risk.level] : undefined
  const rn = riverNames(river.point, lang)

  return (
    <section className="rounded-xl border border-line bg-surface p-4" aria-live="polite">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-[22px] font-extrabold leading-tight tracking-tight">{t('spot.title')}</h1>
          <p className="text-sm text-muted">{lat.toFixed(4)}°N {lon.toFixed(4)}°E</p>
        </div>
        <div className="flex shrink-0">
          <ShareButton compact title={t('spot.title')} text={view ? t('share.spotText', { lat: lat.toFixed(4), lon: lon.toFixed(4), m: fmt(d!.elevation), risk: t(`floodLevel.${view.risk.level}` as Key) }) : undefined} path={`/?p=${lat.toFixed(4)},${lon.toFixed(4)}`} />
          <button onClick={onClose} aria-label={t('common.close')} className="rounded p-1.5 text-muted hover:bg-sunken"><X className="size-4" /></button>
        </div>
      </div>

      {q.error && !d ? <div className="mt-3"><SourceProblem error={q.error} onRetry={() => q.refetch()} /></div> : !view ? (
        <div className="mt-3 space-y-2" aria-busy="true"><p className="text-sm text-muted">{t('spot.loading')}</p><Skeleton className="h-28" /></div>
      ) : (
        <>
          <div className="my-3 flex items-center gap-3">
            <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-paddy-soft text-paddy"><Mountain className="size-7" aria-hidden /></span>
            <div>
              <div className="text-xs text-muted">{t('stat.elevation')}</div>
              <div className="text-4xl font-extrabold tracking-tight">{fmt(d!.elevation)}<span className="ml-1 text-base font-medium text-muted">m</span></div>
              <div className="text-xs text-muted">{t('stat.elevationSub')}</div>
            </div>
          </div>

          {fl && (
            <div className="mb-3 rounded-lg px-3 py-2" style={{ background: fl.color, color: inkOn(fl.color) }}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-semibold">{t('stat.flood')}: {t(`floodLevel.${view.risk.level}` as Key)}</span>
                <span className="text-sm font-bold">{t('flood.score', { n: view.risk.score })}</span>
              </div>
              <div className="text-xs opacity-90">{t('flood.parts', view.risk.parts)}</div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="flex items-center gap-1.5">
              <WeatherIcon code={view.code} isDay={view.isDay} className="size-9 shrink-0" title={weatherText(view.code, t)} />
              <Stat label={t('common.now')} value={`${fmt(view.temp)}°`} />
            </div>
            <Stat label={t('spot.rain')} value={`${fmt(view.rain.past, 0)} / ${fmt(view.rain.next, 0)}`} unit="mm" />
            <div>
              <div className="text-xs text-muted">{t('stat.aqi')}</div>
              <span className="inline-block rounded px-1.5 text-xl font-semibold" style={view.aqi != null ? { background: aqiC, color: inkOn(aqiC) } : undefined}>{fmt(view.aqi)}</span>
            </div>
          </div>

          <dl className="mt-3 space-y-1.5 border-t border-line pt-3 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">{t('spot.discharge')}</dt>
              <dd className="text-right">{view.cell ? <><b>{fmt(view.cell.today)} m³/s</b><div className="text-xs text-muted">{view.cell.ratio != null ? t('spot.dischargeSub', { ratio: fmt(view.cell.ratio, 1) }) : riverLevelText(view.cell.level, t)}</div></> : <span className="text-muted">{t('spot.noRiver')}</span>}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">{t('spot.nearestRiver')}</dt>
              <dd className="text-right"><Link to={`/rivers/${river.point.id}`} className="font-semibold hover:text-lagoon">{t('river.at', rn)}</Link><div className="text-xs text-muted">{t('spot.away', { n: Math.round(river.km) })}{river.reading ? ` · ${riverLevelText(river.reading.level, t)}` : ''}</div></dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">{t('spot.nearestTown')}</dt>
              <dd className="text-right"><b>{placeName(town.station, lang)}</b><div className="text-xs text-muted">{t('spot.away', { n: Math.round(town.km) })}</div></dd>
            </div>
          </dl>

          <Link to={`/station/${town.station.id}`} className="mt-4 flex items-center justify-between rounded-lg bg-lagoon px-3 py-2 text-sm font-semibold text-canvas hover:brightness-110">
            {t('spot.open', { place: placeName(town.station, lang) })} <ChevronRight className="size-4" aria-hidden />
          </Link>
          <p className="mt-2 text-xs text-muted">{t('spot.note')}</p>
        </>
      )}
    </section>
  )
}
