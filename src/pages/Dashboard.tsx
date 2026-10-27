import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Layers, X, ChevronRight } from 'lucide-react'
import MapView, { OVERLAYS } from '../components/MapView'
import AlertList from '../components/AlertList'
import { Freshness, SourceProblem, Skeleton, Stat } from '../components/ui'
import { useNowcast, useRivers, type RiverReading, type StationReading } from '../hooks/useLiveData'
import { buildAlerts } from '../lib/alerts'
import { bandFor, colorFor, compass, fmt, inkOn, METRIC_ORDER, METRICS, RIVER_LEVELS, weatherText } from '../lib/metrics'
import { useSettings, yesterday, type Overlay } from '../stores/settings'

export default function Dashboard() {
  const { readings, weather, air, updatedAt } = useNowcast()
  const { rivers, query: riverQ } = useRivers()
  const [params, setParams] = useSearchParams()
  const sel = params.get('s') ?? undefined
  const kind = params.get('k') === 'river' ? 'river' : 'station'
  const alerts = useMemo(() => buildAlerts(readings, rivers), [readings, rivers])

  const select = (id: string, k: 'station' | 'river') => setParams({ s: id, k }, { replace: true })
  const clear = () => setParams({}, { replace: true })

  const selStation = kind === 'station' ? readings?.find((r) => r.station.id === sel) : undefined
  const selRiver = kind === 'river' ? rivers?.find((r) => r.point.id === sel) : undefined

  return (
    <div className="flex h-full flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
      <div className="relative h-[62vh] shrink-0 lg:h-auto lg:flex-1">
        <MapView readings={readings} rivers={rivers} selected={sel} onSelect={select} className="absolute inset-0" />
        <MetricBar />
        <LayerMenu />
      </div>

      <aside className="border-line bg-canvas lg:w-[392px] lg:shrink-0 lg:overflow-y-auto lg:border-l" aria-label="Details">
        <div className="space-y-4 p-4">
          {weather.error && <SourceProblem error={weather.error} onRetry={() => weather.refetch()} />}
          {air.error && !weather.error && <SourceProblem error={air.error} onRetry={() => air.refetch()} />}
          {riverQ.error && <SourceProblem error={riverQ.error} onRetry={() => riverQ.refetch()} />}

          {selStation && <StationCard r={selStation} onClose={clear} />}
          {selRiver && <RiverCard r={selRiver} onClose={clear} />}
          {!selStation && !selRiver && <IslandNow readings={readings} rivers={rivers} />}

          <section>
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-[15px] font-semibold">Signals</h2>
              <span className="text-xs text-muted">{alerts.length ? `${alerts.length} active` : ''}</span>
            </div>
            {readings ? <AlertList alerts={alerts} limit={6} /> : <Skeleton className="h-16" />}
          </section>

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

function LayerMenu() {
  const [open, setOpen] = useState(false)
  const s = useSettings()
  const def = OVERLAYS.find((o) => o.id === s.overlay)
  return (
    <div className="absolute left-2 top-2 sm:left-3 sm:top-3">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center gap-2 rounded-lg bg-surface/95 px-3 py-2 text-sm font-medium shadow-md backdrop-blur hover:bg-surface"
      >
        <Layers className="size-4" aria-hidden /> Layers
        {def && <span className="rounded bg-lagoon-soft px-1.5 text-xs text-lagoon">{def.label.split(' (')[0]}</span>}
      </button>
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
                  <input type="date" value={s.overlayDate} max={yesterday()} min="2015-01-01" onChange={(e) => e.target.value && s.setOverlayDate(e.target.value)} className="rounded border border-line bg-surface px-1.5 py-0.5 text-ink" />
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
        <button onClick={onClose} aria-label="Close details" className="rounded p-1 text-muted hover:bg-sunken"><X className="size-4" /></button>
      </div>
      <div className="my-3 flex items-center gap-3">
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
