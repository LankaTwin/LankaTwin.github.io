import { useMemo, useState } from 'react'
import { ShareButton } from '../components/Share'
import { Link, useSearchParams } from 'react-router-dom'
import { Layers, X, ChevronRight, LocateFixed, Loader2, Star } from 'lucide-react'
import MapView, { OVERLAYS } from '../components/MapView'
import AlertList from '../components/AlertList'
import { FavoriteButton, Freshness, SourceProblem, Skeleton, Stat } from '../components/ui'
import WeatherIcon from '../components/WeatherIcon'
import IslandSnapshot from '../components/IslandSnapshot'
import { useTitle } from '../hooks/useApp'
import SeasonCard from '../components/SeasonCard'
import SpotCard from '../components/SpotCard'
import { FLOOD_LEVELS } from '../lib/flood'
import { districtName, nearestStation, placeName, riverNames } from '../lib/places'
import { addDays, readingTime, timeAgo } from '../lib/time'
import { rich, type Key } from '../i18n/core'
import { useT } from '../i18n/useT'
import { useNowcast, useRivers, type RiverReading, type StationReading } from '../hooks/useLiveData'
import { useGauges } from '../hooks/useGauges'
import { buildAlerts } from '../lib/alerts'
import { bandFor, bandText, colorFor, compass, fmt, inkOn, METRIC_ORDER, METRICS, metricText, RIVER_LEVELS, riverLevelText, uvBand, weatherText } from '../lib/metrics'
import { useSettings, yesterday, type Overlay } from '../stores/settings'
import { GAUGE_LEVEL_ORDER, GAUGE_LEVELS, type GaugeStation } from '../lib/gauges'
import GaugeLevelTile from '../components/GaugeLevelTile'
import GaugeStrip from '../components/GaugeStrip'

export default function Dashboard() {
  const { readings, weather, air, updatedAt } = useNowcast()
  const { rivers, query: riverQ } = useRivers()
  const { gauges, query: gaugeQ } = useGauges()
  const showGauges = useSettings((x) => x.showGauges)
  const [params, setParams] = useSearchParams()
  const sel = params.get('s') ?? undefined
  const k = params.get('k')
  const kind = k === 'river' || k === 'gauge' ? k : 'station'
  const { t, lang } = useT()
  const alerts = useMemo(() => buildAlerts(readings, rivers, lang, gauges), [readings, rivers, lang, gauges])
  const [focus, setFocus] = useState<{ lon: number; lat: number; zoom?: number }>()
  const [me, setMe] = useState<{ lon: number; lat: number }>()
  const [locating, setLocating] = useState(false)
  const [locNote, setLocNote] = useState<string>()
  useTitle()

  // A tapped spot lives in the URL too (?p=lat,lon), so it can be shared.
  const pp = params.get('p')?.split(',').map(Number)
  const spot = pp && pp.length === 2 && pp.every(Number.isFinite) ? { lat: pp[0], lon: pp[1] } : undefined
  const select = (id: string, k: 'station' | 'river' | 'gauge') => setParams({ s: id, k }, { replace: true })
  const pick = (lat: number, lon: number) => setParams({ p: `${lat.toFixed(4)},${lon.toFixed(4)}` }, { replace: true })
  const clear = () => setParams({}, { replace: true })

  const locate = () => {
    if (!('geolocation' in navigator)) { setLocNote(t('dash.locUnsupported')); return }
    setLocating(true)
    setLocNote(undefined)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        const here = { lat: pos.coords.latitude, lon: pos.coords.longitude }
        const { station, km } = nearestStation(here)
        const place = placeName(station, lang)
        if (km > 100) {
          setLocNote(t('dash.locOutside', { place, km: Math.round(km) }))
          select(station.id, 'station')
          setFocus({ lon: station.lon, lat: station.lat, zoom: 8 })
        } else {
          setMe(here)
          // Your exact spot: its elevation and flood risk, with the nearest town one tap away.
          pick(here.lat, here.lon)
          setLocNote(t('dash.locNearest', { place, km: Math.round(km) }))
          setFocus({ ...here, zoom: 9 })
        }
      },
      (err) => {
        setLocating(false)
        setLocNote(t(err.code === err.PERMISSION_DENIED ? 'dash.locDenied' : 'dash.locFailed'))
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 10 * 60_000 },
    )
  }

  const selStation = kind === 'station' ? readings?.find((r) => r.station.id === sel) : undefined
  const selRiver = kind === 'river' ? rivers?.find((r) => r.point.id === sel) : undefined
  const selGauge = kind === 'gauge' ? gauges?.find((g) => g.id === sel) : undefined
  const none = !spot && !selStation && !selRiver && !selGauge

  return (
    <div className="flex h-full flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
      <div className="relative h-[62vh] shrink-0 lg:h-auto lg:flex-1">
        <MapView key={lang} readings={readings} rivers={rivers} gauges={gauges} selected={sel} onSelect={select} onPick={pick} picked={spot} focus={focus} userLocation={me} className="absolute inset-0" />
        <MetricBar />
        <LayerMenu>
          <button
            onClick={locate}
            disabled={locating}
            className="flex items-center gap-2 rounded-lg bg-surface/95 px-3 py-2 text-sm font-medium shadow-md backdrop-blur hover:bg-surface disabled:opacity-70"
          >
            {locating ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <LocateFixed className="size-4" aria-hidden />} {t('dash.nearMe')}
          </button>
        </LayerMenu>
        {locNote && (
          <div role="status" className="absolute top-14 left-2 z-10 flex max-w-[min(340px,calc(100%-1rem))] items-start gap-2 rounded-lg bg-surface/95 px-3 py-2 text-xs shadow-md backdrop-blur sm:left-3">
            <span className="flex-1">{locNote}</span>
            <button onClick={() => setLocNote(undefined)} aria-label={t('common.dismiss')} className="text-muted hover:text-ink"><X className="size-3.5" /></button>
          </div>
        )}
      </div>

      <aside className="border-line bg-canvas lg:w-[392px] xl:w-[420px] 2xl:w-[460px] lg:shrink-0 lg:overflow-y-auto lg:border-l" aria-label={t('dash.details')}>
        <div className="space-y-4 p-4">
          {weather.error && <SourceProblem error={weather.error} onRetry={() => weather.refetch()} />}
          {air.error && !weather.error && <SourceProblem error={air.error} onRetry={() => air.refetch()} />}
          {riverQ.error && <SourceProblem error={riverQ.error} onRetry={() => riverQ.refetch()} />}
          {gaugeQ.error && showGauges && <SourceProblem error={gaugeQ.error} onRetry={() => gaugeQ.refetch()} />}

          {spot && <SpotCard key={`${spot.lat},${spot.lon}`} lat={spot.lat} lon={spot.lon} onClose={clear} />}
          {!spot && selStation && <StationCard r={selStation} onClose={clear} />}
          {!spot && selRiver && <RiverCard r={selRiver} onClose={clear} />}
          {!spot && selGauge && <GaugeCard g={selGauge} onClose={clear} />}
          {none && <IslandNow readings={readings} rivers={rivers} />}
          {none && <GaugeStrip gauges={gauges} />}
          {none && <p className="rounded-lg bg-lagoon-soft px-3 py-2 text-xs text-lagoon">{t('spot.hint')}</p>}
          {none && <Starred readings={readings} />}

          <section>
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-[15px] font-semibold">{t('dash.signals')}</h2>
              <span className="text-xs text-muted">{alerts.length ? t('dash.active', { n: alerts.length }) : ''}</span>
            </div>
            {readings ? <AlertList alerts={alerts} limit={6} /> : <Skeleton className="h-16" />}
          </section>

          <SeasonCard />
          <IslandSnapshot />

          <p className="text-xs leading-relaxed text-muted">
            {rich(t('dash.footnote'), {
              fresh: <Freshness at={updatedAt} fetching={weather.isFetching || air.isFetching} />,
              dom: <a className="underline" href="https://www.meteo.gov.lk">{t('common.dom')}</a>,
              dmc: <a className="underline" href="https://www.dmc.gov.lk">{t('common.dmcShort')}</a>,
            })}
          </p>
        </div>
      </aside>
    </div>
  )
}

function MetricBar() {
  const { metric, setMetric } = useSettings()
  const { t } = useT()
  const m = METRICS[metric]
  const mt = metricText(metric, t)
  return (
    <div className="pointer-events-none absolute inset-x-2 bottom-2 flex flex-col items-start gap-1.5 sm:inset-x-3 sm:bottom-3">
      <div className="pointer-events-auto hidden rounded-lg bg-surface/95 px-2.5 py-2 shadow-md backdrop-blur sm:block">
        <div className="mb-1.5 flex items-baseline gap-2">
          <span className="text-sm font-semibold">{mt.label}</span>
          <span className="text-xs text-muted">{m.unit === '°' ? '°C' : m.unit === 'µg' ? 'µg/m³' : m.unit}</span>
        </div>
        <div className="flex flex-wrap gap-0.5" aria-label={t('dash.legend', { label: mt.label })}>
          {m.steps.map(([, c, label]) => (
            <span key={label} className="rounded-[3px] px-1.5 py-0.5 text-[11px] font-semibold" style={{ background: c, color: inkOn(c) }}>{bandText(label, t)}</span>
          ))}
        </div>
      </div>
      <div role="radiogroup" aria-label={t('dash.mapVariable')} className="pointer-events-auto flex max-w-full gap-1 overflow-x-auto rounded-lg bg-surface/95 p-1 shadow-md backdrop-blur [scrollbar-width:none]">
        {METRIC_ORDER.map((id) => (
          <button
            key={id}
            role="radio"
            aria-checked={metric === id}
            onClick={() => setMetric(id)}
            title={metricText(id, t).help}
            className={`shrink-0 rounded-md px-2.5 py-1.5 text-[13px] font-medium ${metric === id ? 'bg-ink text-canvas' : 'text-muted hover:bg-sunken hover:text-ink'}`}
          >
            {metricText(id, t).short}
          </button>
        ))}
      </div>
    </div>
  )
}

function LayerMenu({ children }: { children?: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const s = useSettings()
  const { t } = useT()
  const def = OVERLAYS.find((o) => o.id === s.overlay)
  const ov = (id: string, f: 'label' | 'short' | 'note') => t(`overlay.${id}.${f}` as Key)
  return (
    <div className="absolute left-2 top-2 z-10 sm:left-3 sm:top-3">
      <div className="flex gap-2">
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex items-center gap-2 rounded-lg bg-surface/95 px-3 py-2 text-sm font-medium shadow-md backdrop-blur hover:bg-surface"
        >
          <Layers className="size-4" aria-hidden /> {t('dash.layers')}
          {def && <span className="rounded bg-lagoon-soft px-1.5 text-xs text-lagoon">{ov(def.id, 'short')}</span>}
        </button>
        {children}
      </div>
      {open && (
        <div className="mt-2 w-[min(300px,calc(100vw-1rem))] space-y-3 rounded-xl border border-line bg-surface p-3 shadow-lg">
          <fieldset>
            <legend className="mb-1 text-xs text-muted">{t('layers.overlay')}</legend>
            {([{ id: 'none', label: t('layers.none') }, ...OVERLAYS.map((o) => ({ id: o.id, label: ov(o.id, 'label') }))] as { id: Overlay; label: string }[]).map((o) => (
              <label key={o.id} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-sunken">
                <input type="radio" name="overlay" checked={s.overlay === o.id} onChange={() => s.setOverlay(o.id)} className="accent-[var(--c-lagoon)]" />
                {o.label}
              </label>
            ))}
          </fieldset>
          {def && (
            <div className="space-y-2 rounded-lg bg-sunken p-2.5 text-xs text-muted">
              <p>{ov(def.id, 'note')}</p>
              {def.dated && (
                <label className="flex items-center justify-between gap-2">
                  {t('layers.date')}
                  <span className="flex items-center gap-1">
                    <button type="button" onClick={() => s.setOverlayDate(addDays(s.overlayDate, -1))} aria-label={t('common.prevDay')} className="rounded px-1 text-ink hover:bg-surface">‹</button>
                    <input type="date" value={s.overlayDate} max={yesterday()} min="2015-01-01" onChange={(e) => e.target.value && s.setOverlayDate(e.target.value)} className="rounded border border-line bg-surface px-1.5 py-0.5 text-ink" />
                    <button type="button" onClick={() => s.overlayDate < yesterday() && s.setOverlayDate(addDays(s.overlayDate, 1))} disabled={s.overlayDate >= yesterday()} aria-label={t('common.nextDay')} className="rounded px-1 text-ink hover:bg-surface disabled:opacity-30">›</button>
                  </span>
                </label>
              )}
              <label className="flex items-center justify-between gap-2">
                {t('layers.opacity')}
                <input type="range" min={0.2} max={1} step={0.05} value={s.overlayOpacity} onChange={(e) => s.setOverlayOpacity(+e.target.value)} className="w-32 accent-[var(--c-lagoon)]" />
              </label>
            </div>
          )}
          <fieldset className="space-y-1 border-t border-line pt-2">
            <legend className="sr-only">{t('layers.markers')}</legend>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.showStations} onChange={s.toggleStations} className="accent-[var(--c-lagoon)]" /> {t('layers.towns')}</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.showRivers} onChange={s.toggleRivers} className="accent-[var(--c-lagoon)]" /> {t('layers.rivers')}</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.showGauges} onChange={(e) => s.setShowGauges(e.target.checked)} className="accent-[var(--c-lagoon)]" /> {t('layers.gauges')}</label>
            {s.showGauges && (
              <div className="flex flex-wrap gap-1 pl-6" aria-hidden>
                {GAUGE_LEVEL_ORDER.map((k) => (
                  <span key={k} className="rounded-[3px] px-1.5 py-0.5 text-[11px] font-semibold" style={{ background: GAUGE_LEVELS[k].color, color: inkOn(GAUGE_LEVELS[k].color) }}>{t(`gaugeLevel.${k}` as Key)}</span>
                ))}
              </div>
            )}
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.showBasins} onChange={(e) => s.setShowBasins(e.target.checked)} className="accent-[var(--c-lagoon)]" /> {t('layers.basins')}</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.showFloodAreas} onChange={(e) => s.setShowFloodAreas(e.target.checked)} className="accent-[var(--c-lagoon)]" /> {t('layers.floodAreas')}</label>
            {s.showFloodAreas && <p className="pl-6 text-[11px] text-muted">{t('layers.floodAreasNote')}</p>}
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.showFlood} onChange={(e) => s.setShowFlood(e.target.checked)} className="accent-[var(--c-lagoon)]" /> {t('layers.flood')}</label>
            {s.showFlood && (
              <div className="flex flex-wrap gap-1 pl-6" aria-hidden>
                {(Object.keys(FLOOD_LEVELS) as (keyof typeof FLOOD_LEVELS)[]).map((k) => (
                  <span key={k} className="rounded-[3px] px-1.5 py-0.5 text-[11px] font-semibold" style={{ background: FLOOD_LEVELS[k].color, color: inkOn(FLOOD_LEVELS[k].color) }}>{t(`floodLevel.${k}` as Key)}</span>
                ))}
              </div>
            )}
          </fieldset>
        </div>
      )}
    </div>
  )
}

function IslandNow({ readings, rivers }: { readings?: StationReading[]; rivers?: RiverReading[] }) {
  const { t, lang } = useT()
  if (!readings) return <Skeleton className="h-44" />
  const by = (f: (r: StationReading) => number | null) =>
    readings.filter((r) => f(r) != null).sort((a, b) => (f(b) ?? 0) - (f(a) ?? 0))
  const hottest = by((r) => r.values.feels)[0]
  const coolest = by((r) => r.values.temp).at(-1)
  const wettest = by((r) => r.values.rain24)[0]
  const wetNext = by((r) => r.values.rainNext24)[0]
  const airWorst = by((r) => r.values.aqi)[0]
  const raining = readings.filter((r) => (r.weatherCode ?? 0) >= 51).length
  const riversUp = rivers?.filter((r) => r.level !== 'normal').length

  const Row = ({ label, r, v, unit }: { label: string; r?: StationReading; v?: number | null; unit: string }) => (
    <Link to={r ? `/station/${r.station.id}` : '#'} className="flex items-baseline justify-between gap-3 border-t border-line py-2 text-sm hover:text-lagoon">
      <span className="text-muted">{label}</span>
      <span className="text-right"><b className="font-semibold">{r ? placeName(r.station, lang) : '—'}</b> <span className="text-muted">{fmt(v)}{unit}</span></span>
    </Link>
  )

  return (
    <section>
      <h1 className="text-[26px] font-extrabold leading-tight tracking-tight">{t('island.title')}</h1>
      <p className="mb-3 mt-1 text-sm text-muted">
        {t('island.raining', { n: raining, total: readings.length })}
        {riversUp != null && (riversUp === 1 ? t('island.riversUpOne') : riversUp ? t('island.riversUp', { n: riversUp }) : t('island.riversNormal'))}
        {t('island.tap')}
      </p>
      <Row label={t('island.feelsHottest')} r={hottest} v={hottest?.values.feels} unit="°" />
      <Row label={t('island.coolest')} r={coolest} v={coolest?.values.temp} unit="°" />
      <Row label={t('island.wettestPast')} r={wettest} v={wettest?.values.rain24} unit=" mm" />
      <Row label={t('island.wettestNext')} r={wetNext} v={wetNext?.values.rainNext24} unit=" mm" />
      <Row label={t('island.poorestAir')} r={airWorst} v={airWorst?.values.aqi} unit=" AQI" />
    </section>
  )
}

function StationCard({ r, onClose }: { r: StationReading; onClose: () => void }) {
  const metric = useSettings((s) => s.metric)
  const { t, lang } = useT()
  const m = METRICS[metric]
  const v = r.values[metric]
  const c = colorFor(m, v)
  const name = placeName(r.station, lang)
  const sky = weatherText(r.weatherCode, t)
  return (
    <section className="rounded-xl border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-[22px] font-extrabold leading-tight tracking-tight">{name} <span className="text-base font-medium text-muted">{lang === 'en' ? r.station.si : r.station.name}</span></h1>
          <p className="text-sm text-muted">{t('common.district', { name: districtName(r.station.district, lang) })} · {sky}</p>
        </div>
        <div className="flex shrink-0">
          <ShareButton compact title={t('place.shareTitle', { place: name })} text={t('place.shareText', { place: name, temp: fmt(r.values.temp), sky: lang === 'en' ? sky.toLowerCase() : sky })} path={`/station/${r.station.id}`} />
          <FavoriteButton id={r.station.id} name={name} />
          <button onClick={onClose} aria-label={t('common.close')} className="rounded p-1.5 text-muted hover:bg-sunken"><X className="size-4" /></button>
        </div>
      </div>
      <div className="my-3 flex items-center gap-3">
        <WeatherIcon code={r.weatherCode} isDay={r.isDay ?? true} className="size-14 shrink-0" title={sky} />
        <span className="text-5xl font-extrabold tracking-tight">{fmt(r.values.temp)}°</span>
        <span className="rounded-md px-2 py-1 text-xs font-semibold" style={{ background: c, color: inkOn(c) }}>{metricText(metric, t).short}: {fmt(v, m.decimals)} {m.unit === '°' ? '°C' : m.unit} · {bandText(bandFor(m, v), t)}</span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Stat label={t('stat.feels')} value={fmt(r.values.feels)} unit="°" />
        <Stat label={t('stat.humidity')} value={fmt(r.values.humidity)} unit="%" />
        <Stat label={t('stat.wind')} value={fmt(r.windSpeed)} unit="km/h" sub={t('stat.windSub', { dir: compass(r.windDir), g: fmt(r.values.gust) })} />
        <Stat label={t('stat.rain24')} value={fmt(r.values.rain24, 1)} unit="mm" />
        <Stat label={t('stat.next24')} value={fmt(r.values.rainNext24, 1)} unit="mm" sub={r.rainProbNext24 != null ? t('stat.chanceUpTo', { p: r.rainProbNext24 }) : undefined} />
        <Stat label={t('stat.aqi')} value={fmt(r.values.aqi)} sub={r.values.pm25 != null ? `PM2.5 ${fmt(r.values.pm25)} µg/m³` : undefined} />
        <Stat label={t('stat.uvToday')} value={fmt(r.uvMax)} sub={uvBand(r.uvMax, t)} />
        <Stat label={t('stat.today')} value={`${fmt(r.tMax)}°`} sub={t('stat.low', { t: fmt(r.tMin) })} />
        <Stat label={t('stat.pressure')} value={fmt(r.pressure)} unit="hPa" />
        <Stat label={t('stat.elevation')} value={fmt(r.elevation)} unit="m" />
        {r.flood && <Stat label={t('stat.flood')} value={t(`floodLevel.${r.flood.level}` as Key)} sub={t('flood.score', { n: r.flood.score })} />}
      </div>
      <Link to={`/station/${r.station.id}`} className="mt-4 flex items-center justify-between rounded-lg bg-lagoon px-3 py-2 text-sm font-semibold text-canvas hover:brightness-110">
        {t('station.more')} <ChevronRight className="size-4" aria-hidden />
      </Link>
    </section>
  )
}

function RiverCard({ r, onClose }: { r: RiverReading; onClose: () => void }) {
  const lv = RIVER_LEVELS[r.level]
  const { t, lang } = useT()
  const n = riverNames(r.point, lang)
  return (
    <section className="rounded-xl border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-[22px] font-extrabold leading-tight tracking-tight">{n.river}</h1>
          <p className="text-sm text-muted">{t('river.near', { place: n.near, basin: n.basin })}</p>
        </div>
        <div className="flex shrink-0">
          <ShareButton compact title={t('river.at', n)} text={t('share.riverText', { place: t('river.at', n), flow: fmt(r.today), status: riverLevelText(r.level, t) })} path={`/rivers/${r.point.id}`} />
          <button onClick={onClose} aria-label={t('common.close')} className="rounded p-1.5 text-muted hover:bg-sunken"><X className="size-4" /></button>
        </div>
      </div>
      <div className="my-3 flex items-center gap-3">
        <span className="text-4xl font-extrabold tracking-tight">{fmt(r.today)}<span className="ml-1 text-base font-medium text-muted">m³/s</span></span>
        <span className="rounded-md px-2 py-1 text-xs font-semibold" style={{ background: lv.color, color: inkOn(lv.color) }}>{riverLevelText(r.level, t)}</span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Stat label={t('river.median')} value={fmt(r.median)} unit="m³/s" />
        <Stat label={t('river.peak')} value={fmt(r.peak)} unit="m³/s" sub={r.peakDate ?? undefined} />
        <Stat label={t('river.ratio')} value={r.ratio != null ? `${fmt(r.ratio, 1)}×` : '—'} />
      </div>
      <Link to={`/rivers/${r.point.id}`} className="mt-4 flex items-center justify-between rounded-lg bg-lagoon px-3 py-2 text-sm font-semibold text-canvas hover:brightness-110">
        {t('river.more')} <ChevronRight className="size-4" aria-hidden />
      </Link>
    </section>
  )
}

function Starred({ readings }: { readings?: StationReading[] }) {
  const favorites = useSettings((s) => s.favorites)
  const { t, lang } = useT()
  const list = readings?.filter((r) => favorites.includes(r.station.id)) ?? []
  if (!favorites.length) {
    return (
      <p className="flex items-center gap-2 rounded-lg border border-dashed border-line px-3 py-2 text-xs text-muted">
        <Star className="size-3.5 shrink-0" aria-hidden /> {t('starred.empty')}
      </p>
    )
  }
  if (!readings) return <Skeleton className="h-20" />
  return (
    <section>
      <h2 className="mb-2 flex items-center gap-1.5 text-[15px] font-semibold"><Star className="size-4 text-thambili" fill="currentColor" aria-hidden /> {t('starred.title')}</h2>
      <ul className="grid grid-cols-2 gap-2">
        {list.map((r) => (
          <li key={r.station.id}>
            <Link to={`/station/${r.station.id}`} className="flex items-center gap-2 rounded-lg border border-line bg-surface p-2 hover:border-lagoon">
              <WeatherIcon code={r.weatherCode} isDay={r.isDay ?? true} className="size-9 shrink-0" />
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{placeName(r.station, lang)}</div>
                <div className="text-xs text-muted"><b className="text-ink">{fmt(r.values.temp)}°</b> · {t('starred.next', { mm: fmt(r.values.rainNext24) })}</div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}


function GaugeCard({ g, onClose }: { g: GaugeStation; onClose: () => void }) {
  const { t, locale } = useT()
  return (
    <section className="rounded-xl border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-[22px] font-extrabold leading-tight tracking-tight">{g.name}</h1>
          <p className="text-sm text-muted">{t('gauge.basin', { basin: g.basin || '—' })} · {t('gauge.official')}</p>
        </div>
        <div className="flex shrink-0">
          <ShareButton compact title={t('share.gaugeTitle', { name: g.name })} text={g.latest && !g.rainOnly ? t('share.gaugeText', { name: g.name, basin: g.basin, level: fmt(g.latest.level, 2), unit: g.unit, status: t(g.stale ? 'gauge.stale' : (`gaugeLevel.${g.level}` as Key)), time: readingTime(g.latest.time, locale) }) : undefined} path={`/gauges/${g.id}`} />
          <button onClick={onClose} aria-label={t('common.close')} className="rounded p-1.5 text-muted hover:bg-sunken"><X className="size-4" /></button>
        </div>
      </div>
      <GaugeLevelTile g={g} className="my-3" />
      <div className="grid grid-cols-3 gap-3">
        <Stat label={t('gauge.alertAt')} value={fmt(g.thresholds.alert, 2)} unit={g.unit} />
        <Stat label={t('gauge.minorAt')} value={fmt(g.thresholds.minor, 2)} unit={g.unit} />
        <Stat label={t('gauge.majorAt')} value={fmt(g.thresholds.major, 2)} unit={g.unit} />
        <Stat label={t('gauge.rain1h')} value={fmt(g.rain1h, 1)} unit="mm" />
        <Stat label={t('gauge.rain24h')} value={fmt(g.rain24h, 1)} unit="mm" />
        <Stat label={t('gauge.change')} value={g.change != null ? `${g.change > 0 ? '+' : ''}${fmt(g.change, 2)}` : '—'} unit={g.unit} sub={g.latest ? timeAgo(g.latest.time, locale) : undefined} />
      </div>
      <Link to={`/gauges/${g.id}`} className="mt-4 flex items-center justify-between rounded-lg bg-lagoon px-3 py-2 text-sm font-semibold text-canvas hover:brightness-110">
        {t('gauge.more')} <ChevronRight className="size-4" aria-hidden />
      </Link>
    </section>
  )
}
