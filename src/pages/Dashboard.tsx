import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Layers, X, ChevronRight, LocateFixed, Loader2, Star } from 'lucide-react'
import MapView, { OVERLAYS } from '../components/MapView'
import AlertList from '../components/AlertList'
import { FavoriteButton, Freshness, SourceProblem, Skeleton, Stat } from '../components/ui'
import WeatherIcon from '../components/WeatherIcon'
import IslandSnapshot from '../components/IslandSnapshot'
import { useTitle } from '../hooks/useApp'
import { nearestStation } from '../lib/places'
import { seasonFor } from '../lib/season'
import { addDays, colomboToday } from '../lib/time'
import { useNowcast, useRivers, type RiverReading, type StationReading } from '../hooks/useLiveData'
import { buildAlerts } from '../lib/alerts'
import { bandFor, colorFor, compass, fmt, inkOn, METRIC_ORDER, METRICS, RIVER_LEVELS, uvBand, weatherText } from '../lib/metrics'
import { useSettings, yesterday, type Overlay } from '../stores/settings'

export default function Dashboard() {
  const { readings, weather, air, updatedAt } = useNowcast()
  const { rivers, query: riverQ } = useRivers()
  const [params, setParams] = useSearchParams()
  const sel = params.get('s') ?? undefined
  const kind = params.get('k') === 'river' ? 'river' : 'station'
  const alerts = useMemo(() => buildAlerts(readings, rivers), [readings, rivers])
  const [focus, setFocus] = useState<{ lon: number; lat: number; zoom?: number }>()
  const [me, setMe] = useState<{ lon: number; lat: number }>()
  const [locating, setLocating] = useState(false)
  const [locNote, setLocNote] = useState<string>()
  useTitle()

  const select = (id: string, k: 'station' | 'river') => setParams({ s: id, k }, { replace: true })
  const clear = () => setParams({}, { replace: true })

  const locate = () => {
    if (!('geolocation' in navigator)) { setLocNote('This browser can’t share your location.'); return }
    setLocating(true)
    setLocNote(undefined)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        const here = { lat: pos.coords.latitude, lon: pos.coords.longitude }
        const { station, km } = nearestStation(here)
        select(station.id, 'station')
        if (km > 100) {
          setLocNote(`You seem to be outside Sri Lanka. The closest place we cover is ${station.name}, ${Math.round(km)} km away.`)
          setFocus({ lon: station.lon, lat: station.lat, zoom: 8 })
        } else {
          setMe(here)
          setLocNote(`Nearest place: ${station.name}, ${Math.round(km)} km away.`)
          setFocus({ ...here, zoom: 9 })
        }
      },
      (err) => {
        setLocating(false)
        setLocNote(err.code === err.PERMISSION_DENIED ? 'Location permission was declined. You can still tap any town on the map.' : 'Couldn’t get your location just now.')
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 10 * 60_000 },
    )
  }

  const selStation = kind === 'station' ? readings?.find((r) => r.station.id === sel) : undefined
  const selRiver = kind === 'river' ? rivers?.find((r) => r.point.id === sel) : undefined

  return (
    <div className="flex h-full flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
      <div className="relative h-[62vh] shrink-0 lg:h-auto lg:flex-1">
        <MapView readings={readings} rivers={rivers} selected={sel} onSelect={select} focus={focus} userLocation={me} className="absolute inset-0" />
        <MetricBar />
        <LayerMenu>
          <button
            onClick={locate}
            disabled={locating}
            className="flex items-center gap-2 rounded-lg bg-surface/95 px-3 py-2 text-sm font-medium shadow-md backdrop-blur hover:bg-surface disabled:opacity-70"
          >
            {locating ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <LocateFixed className="size-4" aria-hidden />} Near me
          </button>
        </LayerMenu>
        {locNote && (
          <div role="status" className="absolute top-14 left-2 z-10 flex max-w-[min(340px,calc(100%-1rem))] items-start gap-2 rounded-lg bg-surface/95 px-3 py-2 text-xs shadow-md backdrop-blur sm:left-3">
            <span className="flex-1">{locNote}</span>
            <button onClick={() => setLocNote(undefined)} aria-label="Dismiss" className="text-muted hover:text-ink"><X className="size-3.5" /></button>
          </div>
        )}
      </div>

      <aside className="border-line bg-canvas lg:w-[392px] lg:shrink-0 lg:overflow-y-auto lg:border-l" aria-label="Details">
        <div className="space-y-4 p-4">
          {weather.error && <SourceProblem error={weather.error} onRetry={() => weather.refetch()} />}
          {air.error && !weather.error && <SourceProblem error={air.error} onRetry={() => air.refetch()} />}
          {riverQ.error && <SourceProblem error={riverQ.error} onRetry={() => riverQ.refetch()} />}

          {selStation && <StationCard r={selStation} onClose={clear} />}
          {selRiver && <RiverCard r={selRiver} onClose={clear} />}
          {!selStation && !selRiver && <IslandNow readings={readings} rivers={rivers} />}
          {!selStation && !selRiver && <Starred readings={readings} />}

          <section>
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-[15px] font-semibold">Signals</h2>
              <span className="text-xs text-muted">{alerts.length ? `${alerts.length} active` : ''}</span>
            </div>
            {readings ? <AlertList alerts={alerts} limit={6} /> : <Skeleton className="h-16" />}
          </section>

          <SeasonCard />
          <IslandSnapshot />

          <p className="text-xs leading-relaxed text-muted">
            <Freshness at={updatedAt} fetching={weather.isFetching || air.isFetching} />. Values are model estimates for each town’s grid cell, not readings from a gauge.
            Official warnings come from the <a className="underline" href="https://www.meteo.gov.lk">Department of Meteorology</a> and <a className="underline" href="https://www.dmc.gov.lk">DMC</a>.
          </p>
        </div>
      </aside>
    </div>
  )
}

function MetricBar() {
  const { metric, setMetric } = useSettings()
  const m = METRICS[metric]
  return (
    <div className="pointer-events-none absolute inset-x-2 bottom-2 flex flex-col items-start gap-1.5 sm:inset-x-3 sm:bottom-3">
      <div className="pointer-events-auto hidden rounded-lg bg-surface/95 px-2.5 py-2 shadow-md backdrop-blur sm:block">
        <div className="mb-1.5 flex items-baseline gap-2">
          <span className="text-sm font-semibold">{m.label}</span>
          <span className="text-xs text-muted">{m.unit === '°' ? '°C' : m.unit === 'µg' ? 'µg/m³' : m.unit}</span>
        </div>
        <div className="flex flex-wrap gap-0.5" aria-label={`${m.label} legend`}>
          {m.steps.map(([, c, label]) => (
            <span key={label} className="rounded-[3px] px-1.5 py-0.5 text-[11px] font-semibold" style={{ background: c, color: inkOn(c) }}>{label}</span>
          ))}
        </div>
      </div>
      <div role="radiogroup" aria-label="Map variable" className="pointer-events-auto flex max-w-full gap-1 overflow-x-auto rounded-lg bg-surface/95 p-1 shadow-md backdrop-blur [scrollbar-width:none]">
        {METRIC_ORDER.map((id) => (
          <button
            key={id}
            role="radio"
            aria-checked={metric === id}
            onClick={() => setMetric(id)}
            title={METRICS[id].help}
            className={`shrink-0 rounded-md px-2.5 py-1.5 text-[13px] font-medium ${metric === id ? 'bg-ink text-canvas' : 'text-muted hover:bg-sunken hover:text-ink'}`}
          >
            {METRICS[id].short}
          </button>
        ))}
      </div>
    </div>
  )
}

function LayerMenu({ children }: { children?: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const s = useSettings()
  const def = OVERLAYS.find((o) => o.id === s.overlay)
  return (
    <div className="absolute left-2 top-2 z-10 sm:left-3 sm:top-3">
      <div className="flex gap-2">
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex items-center gap-2 rounded-lg bg-surface/95 px-3 py-2 text-sm font-medium shadow-md backdrop-blur hover:bg-surface"
        >
          <Layers className="size-4" aria-hidden /> Layers
          {def && <span className="rounded bg-lagoon-soft px-1.5 text-xs text-lagoon">{def.label.split(' (')[0]}</span>}
        </button>
        {children}
      </div>
      {open && (
        <div className="mt-2 w-[min(300px,calc(100vw-1rem))] space-y-3 rounded-xl border border-line bg-surface p-3 shadow-lg">
          <fieldset>
            <legend className="mb-1 text-xs text-muted">Satellite overlay (NASA GIBS)</legend>
            {([{ id: 'none', label: 'None' }, ...OVERLAYS] as { id: Overlay; label: string }[]).map((o) => (
              <label key={o.id} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-sunken">
                <input type="radio" name="overlay" checked={s.overlay === o.id} onChange={() => s.setOverlay(o.id)} className="accent-[var(--c-lagoon)]" />
                {o.label}
              </label>
            ))}
          </fieldset>
          {def && (
            <div className="space-y-2 rounded-lg bg-sunken p-2.5 text-xs text-muted">
              <p>{def.note}</p>
              {def.dated && (
                <label className="flex items-center justify-between gap-2">
                  Date
                  <span className="flex items-center gap-1">
                    <button type="button" onClick={() => s.setOverlayDate(addDays(s.overlayDate, -1))} aria-label="Previous day" className="rounded px-1 text-ink hover:bg-surface">‹</button>
                    <input type="date" value={s.overlayDate} max={yesterday()} min="2015-01-01" onChange={(e) => e.target.value && s.setOverlayDate(e.target.value)} className="rounded border border-line bg-surface px-1.5 py-0.5 text-ink" />
                    <button type="button" onClick={() => s.overlayDate < yesterday() && s.setOverlayDate(addDays(s.overlayDate, 1))} disabled={s.overlayDate >= yesterday()} aria-label="Next day" className="rounded px-1 text-ink hover:bg-surface disabled:opacity-30">›</button>
                  </span>
                </label>
              )}
              <label className="flex items-center justify-between gap-2">
                Opacity
                <input type="range" min={0.2} max={1} step={0.05} value={s.overlayOpacity} onChange={(e) => s.setOverlayOpacity(+e.target.value)} className="w-32 accent-[var(--c-lagoon)]" />
              </label>
            </div>
          )}
          <fieldset className="space-y-1 border-t border-line pt-2">
            <legend className="sr-only">Markers</legend>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.showStations} onChange={s.toggleStations} className="accent-[var(--c-lagoon)]" /> Town readings</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.showRivers} onChange={s.toggleRivers} className="accent-[var(--c-lagoon)]" /> River flow (square chips)</label>
          </fieldset>
        </div>
      )}
    </div>
  )
}

function IslandNow({ readings, rivers }: { readings?: StationReading[]; rivers?: RiverReading[] }) {
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
      <span className="text-right"><b className="font-semibold">{r?.station.name ?? '—'}</b> <span className="text-muted">{fmt(v)}{unit}</span></span>
    </Link>
  )

  return (
    <section>
      <h1 className="text-[26px] font-extrabold leading-tight tracking-tight">The island right now</h1>
      <p className="mb-3 mt-1 text-sm text-muted">
        Rain falling at {raining} of {readings.length} towns{riversUp != null && <>, {riversUp ? `${riversUp} river ${riversUp === 1 ? 'point' : 'points'} running high` : 'rivers near normal'}</>}. Tap any chip on the map for details.
      </p>
      <Row label="Feels hottest" r={hottest} v={hottest?.values.feels} unit="°" />
      <Row label="Coolest" r={coolest} v={coolest?.values.temp} unit="°" />
      <Row label="Wettest, last 24 h" r={wettest} v={wettest?.values.rain24} unit=" mm" />
      <Row label="Wettest, next 24 h" r={wetNext} v={wetNext?.values.rainNext24} unit=" mm" />
      <Row label="Poorest air" r={airWorst} v={airWorst?.values.aqi} unit=" AQI" />
    </section>
  )
}

function StationCard({ r, onClose }: { r: StationReading; onClose: () => void }) {
  const metric = useSettings((s) => s.metric)
  const m = METRICS[metric]
  const v = r.values[metric]
  const c = colorFor(m, v)
  return (
    <section className="rounded-xl border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-[22px] font-extrabold leading-tight tracking-tight">{r.station.name} <span className="text-base font-medium text-muted">{r.station.si}</span></h1>
          <p className="text-sm text-muted">{r.station.district} District · {weatherText(r.weatherCode)}</p>
        </div>
        <div className="flex shrink-0">
          <FavoriteButton id={r.station.id} name={r.station.name} />
          <button onClick={onClose} aria-label="Close details" className="rounded p-1.5 text-muted hover:bg-sunken"><X className="size-4" /></button>
        </div>
      </div>
      <div className="my-3 flex items-center gap-3">
        <WeatherIcon code={r.weatherCode} isDay={r.isDay ?? true} className="size-14 shrink-0" title={weatherText(r.weatherCode)} />
        <span className="text-5xl font-extrabold tracking-tight">{fmt(r.values.temp)}°</span>
        <span className="rounded-md px-2 py-1 text-xs font-semibold" style={{ background: c, color: inkOn(c) }}>{m.short}: {fmt(v, m.decimals)} {m.unit === '°' ? '°C' : m.unit} · {bandFor(m, v)}</span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Feels like" value={fmt(r.values.feels)} unit="°" />
        <Stat label="Humidity" value={fmt(r.values.humidity)} unit="%" />
        <Stat label="Wind" value={fmt(r.windSpeed)} unit="km/h" sub={`${compass(r.windDir)}, gusts ${fmt(r.values.gust)}`} />
        <Stat label="Rain 24 h" value={fmt(r.values.rain24, 1)} unit="mm" />
        <Stat label="Next 24 h" value={fmt(r.values.rainNext24, 1)} unit="mm" sub={r.rainProbNext24 != null ? `up to ${r.rainProbNext24}% chance` : undefined} />
        <Stat label="US AQI" value={fmt(r.values.aqi)} sub={r.values.pm25 != null ? `PM2.5 ${fmt(r.values.pm25)} µg/m³` : undefined} />
        <Stat label="UV today" value={fmt(r.uvMax)} sub={uvBand(r.uvMax)} />
        <Stat label="Today" value={`${fmt(r.tMax)}°`} sub={`low ${fmt(r.tMin)}°`} />
        <Stat label="Pressure" value={fmt(r.pressure)} unit="hPa" />
      </div>
      <Link to={`/station/${r.station.id}`} className="mt-4 flex items-center justify-between rounded-lg bg-lagoon px-3 py-2 text-sm font-semibold text-canvas hover:brightness-110">
        Charts, forecast and climate context <ChevronRight className="size-4" aria-hidden />
      </Link>
    </section>
  )
}

function RiverCard({ r, onClose }: { r: RiverReading; onClose: () => void }) {
  const lv = RIVER_LEVELS[r.level]
  return (
    <section className="rounded-xl border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-[22px] font-extrabold leading-tight tracking-tight">{r.point.river}</h1>
          <p className="text-sm text-muted">near {r.point.near} · {r.point.basin} basin</p>
        </div>
        <button onClick={onClose} aria-label="Close details" className="rounded p-1 text-muted hover:bg-sunken"><X className="size-4" /></button>
      </div>
      <div className="my-3 flex items-center gap-3">
        <span className="text-4xl font-extrabold tracking-tight">{fmt(r.today)}<span className="ml-1 text-base font-medium text-muted">m³/s</span></span>
        <span className="rounded-md px-2 py-1 text-xs font-semibold" style={{ background: lv.color, color: inkOn(lv.color) }}>{lv.label}</span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Stat label="30-day median" value={fmt(r.median)} unit="m³/s" />
        <Stat label="10-day peak" value={fmt(r.peak)} unit="m³/s" sub={r.peakDate ?? undefined} />
        <Stat label="Peak ÷ median" value={r.ratio != null ? `${fmt(r.ratio, 1)}×` : '—'} />
      </div>
      <Link to={`/rivers/${r.point.id}`} className="mt-4 flex items-center justify-between rounded-lg bg-lagoon px-3 py-2 text-sm font-semibold text-canvas hover:brightness-110">
        Discharge history and forecast <ChevronRight className="size-4" aria-hidden />
      </Link>
    </section>
  )
}

function Starred({ readings }: { readings?: StationReading[] }) {
  const favorites = useSettings((s) => s.favorites)
  const list = readings?.filter((r) => favorites.includes(r.station.id)) ?? []
  if (!favorites.length) {
    return (
      <p className="flex items-center gap-2 rounded-lg border border-dashed border-line px-3 py-2 text-xs text-muted">
        <Star className="size-3.5 shrink-0" aria-hidden /> Star places you care about and they’ll be listed here.
      </p>
    )
  }
  if (!readings) return <Skeleton className="h-20" />
  return (
    <section>
      <h2 className="mb-2 flex items-center gap-1.5 text-[15px] font-semibold"><Star className="size-4 text-thambili" fill="currentColor" aria-hidden /> Your places</h2>
      <ul className="grid grid-cols-2 gap-2">
        {list.map((r) => (
          <li key={r.station.id}>
            <Link to={`/station/${r.station.id}`} className="flex items-center gap-2 rounded-lg border border-line bg-surface p-2 hover:border-lagoon">
              <WeatherIcon code={r.weatherCode} isDay={r.isDay ?? true} className="size-9 shrink-0" />
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{r.station.name}</div>
                <div className="text-xs text-muted"><b className="text-ink">{fmt(r.values.temp)}°</b> · {fmt(r.values.rainNext24)} mm next 24 h</div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

function SeasonCard() {
  const s = seasonFor(colomboToday())
  return (
    <section className="rounded-xl border border-line bg-surface p-3">
      <div className="text-xs text-muted">Season now · {s.months}</div>
      <h2 className="text-[15px] font-semibold">{s.name}</h2>
      <p className="mt-1 text-sm text-muted">{s.summary}</p>
      <p className="mt-1 text-xs"><span className="text-muted">Usually wettest:</span> {s.wetter}</p>
    </section>
  )
}
