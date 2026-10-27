import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Maximize, Minimize, MonitorSmartphone, RefreshCw, Volume2, VolumeX } from 'lucide-react'
import { ALERT_ICON } from '../components/AlertList'
import WeatherIcon from '../components/WeatherIcon'
import { SourceProblem, Skeleton } from '../components/ui'
import { chime, useTitle } from '../hooks/useApp'
import { useNowcast, useRivers, type StationReading } from '../hooks/useLiveData'
import { useGauges } from '../hooks/useGauges'
import { GAUGE_LEVELS, gaugeSummary } from '../lib/gauges'
import { GaugeTrend } from '../components/GaugeLevelTile'
import { FLOOD_LEVELS } from '../lib/flood'
import { colorFor, fmt, inkOn, METRICS, RIVER_LEVELS, riverLevelText } from '../lib/metrics'
import { placeName, riverNames } from '../lib/places'
import type { Key } from '../i18n/core'
import { useT } from '../i18n/useT'
import { sortLog, useAlertLog, type LoggedAlert } from '../stores/alertLog'
import { useSettings } from '../stores/settings'

const clock = (ms: number, locale: string) =>
  new Date(ms).toLocaleTimeString(locale === 'en-LK' ? 'en-GB' : locale, { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Colombo' })

function useTick(ms = 1000) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(i) }, [ms])
  return now
}

/** Keeps the display awake while the page is visible (Screen Wake Lock API). */
function useWakeLock(on: boolean) {
  useEffect(() => {
    if (!on || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    const get = async () => { try { lock = await navigator.wakeLock.request('screen') } catch { /* denied or battery saver */ } }
    const onVis = () => { if (document.visibilityState === 'visible') get() }
    get()
    document.addEventListener('visibilitychange', onVis)
    return () => { document.removeEventListener('visibilitychange', onVis); lock?.release().catch(() => {}) }
  }, [on])
}

export default function LivePage() {
  const { t, lang, locale } = useT()
  useTitle(t('live.title'))
  const qc = useQueryClient()
  const { readings, weather, air, updatedAt } = useNowcast()
  const { rivers, query: riverQ } = useRivers()
  const { gauges, query: gaugeQ } = useGauges()
  const gsum = useMemo(() => (gauges ? gaugeSummary(gauges) : undefined), [gauges])
  const { refreshMinutes, setRefresh, alertSound, setAlertSound } = useSettings()
  const entries = useAlertLog((s) => s.entries)
  const openedAt = useAlertLog((s) => s.openedAt)
  const now = useTick()
  const [full, setFull] = useState(() => !!document.fullscreenElement)
  const [wake, setWake] = useState(false)
  useWakeLock(wake)
  useEffect(() => { const h = () => setFull(!!document.fullscreenElement); document.addEventListener('fullscreenchange', h); return () => document.removeEventListener('fullscreenchange', h) }, [])

  const log = useMemo(() => sortLog(Object.values(entries)), [entries])
  const active = log.filter((e) => !e.clearedAt)
  const warnings = active.filter((e) => e.level === 'warning').length
  const fetching = weather.isFetching || air.isFetching || riverQ.isFetching || gaugeQ.isFetching
  const left = Math.max(0, Math.round((updatedAt + refreshMinutes * 60_000 - now) / 1000))
  const refreshNow = () => qc.invalidateQueries({ predicate: (q) => ['nowcast', 'air-now', 'rivers', 'gauges'].includes(String(q.queryKey[0])) })

  // Worst active signal per town, to colour the town board.
  const worst = useMemo(() => {
    const m = new Map<string, LoggedAlert['level']>()
    for (const e of active) {
      const id = e.href.startsWith('/station/') ? e.href.slice(9) : ''
      if (id && (e.level === 'warning' || !m.has(id))) m.set(id, e.level)
    }
    return m
  }, [active])

  const k = useMemo(() => kpis(readings), [readings])
  const name = (r?: StationReading) => (r ? placeName(r.station, lang) : '—')
  const riversUp = rivers?.filter((r) => r.level !== 'normal').length

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-3 py-4 sm:px-4 sm:py-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{t('live.title')}</h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rambutan px-2 py-0.5 text-[11px] font-bold tracking-wide text-white">
              <span className="size-1.5 animate-pulse rounded-full bg-white" aria-hidden /> {t('live.badge')}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-muted">{t('live.intro')}</p>
          <p className="mt-1 text-xs text-muted" aria-live="polite">
            {updatedAt ? clock(updatedAt, locale) : '—'} · {fetching ? t('live.checking') : t('live.nextRefresh', { s: `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Ctl onClick={refreshNow} icon={<RefreshCw className={`size-4 ${fetching ? 'animate-spin' : ''}`} />} label={t('live.refreshNow')} />
          <label className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2 py-1.5 text-sm">
            <span className="text-muted">{t('live.every')}</span>
            <select value={refreshMinutes} onChange={(e) => setRefresh(+e.target.value)} className="bg-transparent font-medium">
              {[5, 10, 15, 30].map((n) => <option key={n} value={n}>{t('about.minutes', { n })}</option>)}
            </select>
          </label>
          <Ctl onClick={() => { const on = !alertSound; setAlertSound(on); if (on) chime() }} pressed={alertSound} icon={alertSound ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />} label={t('live.sound')} />
          {'wakeLock' in navigator && <Ctl onClick={() => setWake((w) => !w)} pressed={wake} icon={<MonitorSmartphone className="size-4" />} label={t('live.wake')} />}
          {document.fullscreenEnabled && (
            <Ctl onClick={() => (full ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => {})} pressed={full} icon={full ? <Minimize className="size-4" /> : <Maximize className="size-4" />} label={t(full ? 'live.exitFullscreen' : 'live.fullscreen')} />
          )}
        </div>
      </header>

      {weather.error && <SourceProblem error={weather.error} onRetry={() => weather.refetch()} />}

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 xl:grid-cols-9" aria-label={t('live.title')}>
        <Kpi label={t('kpi.warnings')} value={readings ? warnings : undefined} tone={warnings ? 'warn' : 'ok'} to="/alerts" />
        <Kpi label={t('kpi.watches')} value={readings ? active.length - warnings : undefined} tone={active.length - warnings ? 'watch' : 'ok'} to="/alerts" />
        <Kpi label={t('kpi.gauges')} value={gsum ? gsum.alert + gsum.minor + gsum.major : gaugeQ.error ? '—' : undefined} sub={gsum ? t('kpi.gaugesSub', { minor: gsum.minor, major: gsum.major }) : undefined} tone={gsum?.major || gsum?.minor ? 'warn' : gsum?.alert ? 'watch' : 'ok'} to="/gauges" className="col-span-2 sm:col-span-1" />
        <Kpi label={t('kpi.raining')} value={k?.raining} sub={readings ? t('kpi.of', { total: readings.length }) : undefined} />
        <Kpi label={t('kpi.rivers')} value={riversUp} sub={rivers ? t('kpi.ofPoints', { total: rivers.length }) : undefined} tone={riversUp ? 'watch' : 'ok'} to="/rivers" />
        <Kpi label={t('kpi.hottest')} value={k?.hot ? `${fmt(k.hot.values.feels)}°` : undefined} sub={name(k?.hot)} to={k?.hot && `/station/${k.hot.station.id}`} />
        <Kpi label={t('kpi.wettest')} value={k?.wet ? `${fmt(k.wet.values.rainNext24)} mm` : undefined} sub={name(k?.wet)} to={k?.wet && `/station/${k.wet.station.id}`} />
        <Kpi label={t('kpi.flood')} value={k?.flood?.flood ? `${k.flood.flood.score}` : undefined} sub={k?.flood?.flood ? `${name(k.flood)} · ${t(`floodLevel.${k.flood.flood.level}` as Key)}` : undefined} color={k?.flood?.flood && FLOOD_LEVELS[k.flood.flood.level].color} to="/floods" />
        <Kpi label={t('kpi.air')} value={k?.air?.values.aqi ?? undefined} sub={name(k?.air)} color={k?.air ? colorFor(METRICS.aqi, k.air.values.aqi) : undefined} to="/air" />
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <section aria-live="polite">
          <h2 className="mb-2 text-lg font-bold">{t('live.feed')} <span className="text-sm font-normal text-muted">· {active.length}</span></h2>
          {!readings ? <Skeleton className="h-64" /> : log.length === 0 ? (
            <p className="rounded-lg bg-paddy-soft px-3 py-2.5 text-sm">{t('live.feedEmpty')}</p>
          ) : (
            <ul className="max-h-[70vh] space-y-1.5 overflow-y-auto pr-1">
              {log.map((e) => <FeedItem key={e.id} e={e} fresh={e.firstSeen > openedAt + 1000} locale={locale} />)}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold">{t('live.towns')}</h2>
          {!readings ? <Skeleton className="h-64" /> : (
            <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 xl:grid-cols-4">
              {[...readings].sort((a, b) => rank(worst.get(b.station.id)) - rank(worst.get(a.station.id)) || (b.flood?.score ?? 0) - (a.flood?.score ?? 0)).map((r) => {
                const lv = worst.get(r.station.id)
                const aqiC = colorFor(METRICS.aqi, r.values.aqi)
                const fl = r.flood ? FLOOD_LEVELS[r.flood.level].color : undefined
                return (
                  <li key={r.station.id}>
                    <Link to={`/station/${r.station.id}`} className={`flex h-full flex-col gap-1 rounded-lg border-l-4 bg-surface p-2 hover:brightness-[.98] ${lv === 'warning' ? 'border-rambutan' : lv === 'watch' ? 'border-thambili' : 'border-line'}`}>
                      <div className="flex items-center justify-between gap-1">
                        <span className="truncate text-sm font-semibold">{placeName(r.station, lang)}</span>
                        <WeatherIcon code={r.weatherCode} isDay={r.isDay ?? true} className="size-7 shrink-0" />
                      </div>
                      <div className="flex items-baseline justify-between gap-1">
                        <span className="text-xl font-extrabold">{fmt(r.values.temp)}°</span>
                        <span className="text-xs text-muted">{fmt(r.values.rainNext24)} mm</span>
                      </div>
                      <div className="flex gap-1 text-[10px] font-semibold">
                        <span className="rounded px-1" style={{ background: aqiC, color: inkOn(aqiC) }}>AQI {fmt(r.values.aqi)}</span>
                        {fl && <span className="rounded px-1" style={{ background: fl, color: inkOn(fl) }}>{t('metric.flood.short')} {r.flood!.score}</span>}
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}

          <h2 className="mb-2 mt-5 text-lg font-bold">{t('live.gaugesBoard')} <Link to="/gauges" className="text-sm font-normal text-lagoon hover:underline">{t('gauges.open')}</Link></h2>
          {gaugeQ.error ? <SourceProblem error={gaugeQ.error} onRetry={() => gaugeQ.refetch()} /> : !gauges ? <Skeleton className="h-32" /> : (
            <ul className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
              {gauges.filter((g) => g.latest && !g.rainOnly).slice(0, 12).map((g) => {
                const c = g.stale ? '#8a9399' : GAUGE_LEVELS[g.level].color
                return (
                  <li key={g.id}>
                    <Link to={`/gauges/${g.id}`} className="flex items-center justify-between gap-2 rounded-lg bg-surface px-2.5 py-1.5 text-sm hover:brightness-[.98]">
                      <span className="min-w-0 truncate">{g.name} <span className="text-xs text-muted">· {g.basin}</span></span>
                      <span className="flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold" style={{ background: c, color: inkOn(c) }}>{fmt(g.latest!.level, 2)} {g.unit}<GaugeTrend g={g} className="size-3" /></span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}

          <h2 className="mb-2 mt-5 text-lg font-bold">{t('live.riversBoard')}</h2>
          {!rivers ? <Skeleton className="h-32" /> : (
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {[...rivers].sort((a, b) => (b.ratio ?? 0) - (a.ratio ?? 0)).map((r) => {
                const c = RIVER_LEVELS[r.level].color
                return (
                  <li key={r.point.id}>
                    <Link to={`/rivers/${r.point.id}`} className="flex items-center justify-between gap-2 rounded-lg bg-surface px-2.5 py-1.5 text-sm hover:brightness-[.98]">
                      <span className="min-w-0 truncate">{t('river.at', riverNames(r.point, lang))}</span>
                      <span className="shrink-0 rounded px-1.5 py-0.5 text-[11px] font-semibold" style={{ background: c, color: inkOn(c) }}>{fmt(r.today)} m³/s · {riverLevelText(r.level, t)}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>

      <p className="text-xs text-muted">{t('live.note', { n: refreshMinutes })}</p>
    </div>
  )
}

const rank = (l?: string) => (l === 'warning' ? 2 : l === 'watch' ? 1 : 0)

function kpis(readings?: StationReading[]) {
  if (!readings) return undefined
  const max = (f: (r: StationReading) => number | null | undefined) =>
    readings.reduce<StationReading | undefined>((best, r) => ((f(r) ?? -Infinity) > (best ? f(best) ?? -Infinity : -Infinity) ? r : best), undefined)
  return {
    raining: readings.filter((r) => (r.weatherCode ?? 0) >= 51).length,
    hot: max((r) => r.values.feels),
    wet: max((r) => r.values.rainNext24),
    flood: max((r) => r.flood?.score),
    air: max((r) => r.values.aqi),
  }
}

function Ctl({ onClick, icon, label, pressed }: { onClick: () => void; icon: ReactNode; label: string; pressed?: boolean }) {
  return (
    <button onClick={onClick} aria-pressed={pressed} title={label} className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm font-medium ${pressed ? 'border-lagoon bg-lagoon-soft text-lagoon' : 'border-line bg-surface hover:bg-sunken'}`}>
      {icon}<span className="hidden sm:inline">{label}</span>
    </button>
  )
}

function Kpi({ label, value, sub, tone, color, to, className = '' }: { label: string; value?: ReactNode; sub?: ReactNode; tone?: 'ok' | 'watch' | 'warn'; color?: string; to?: string; className?: string }) {
  const toneCls = tone === 'warn' ? 'border-rambutan bg-rambutan-soft' : tone === 'watch' ? 'border-thambili bg-thambili-soft' : 'border-line bg-surface'
  const body = (
    <div className={`h-full rounded-xl border p-3 ${toneCls}`}>
      <div className="text-xs text-muted">{label}</div>
      {value === undefined ? <Skeleton className="mt-1 h-8 w-16" /> : (
        <div className="mt-0.5 flex items-center gap-2">
          {color && <span className="size-3 shrink-0 rounded-full" style={{ background: color }} aria-hidden />}
          <span className="text-2xl font-extrabold leading-tight sm:text-3xl">{value}</span>
        </div>
      )}
      {sub && <div className="truncate text-xs text-muted">{sub}</div>}
    </div>
  )
  return to ? <Link to={to} className={`block hover:brightness-[.98] ${className}`}>{body}</Link> : <div className={className}>{body}</div>
}

function FeedItem({ e, fresh, locale }: { e: LoggedAlert; fresh: boolean; locale: string }) {
  const { t } = useT()
  const Icon = ALERT_ICON[e.kind]
  const warn = e.level === 'warning'
  const cleared = !!e.clearedAt
  return (
    <li>
      <Link to={e.href} className={`flex items-start gap-2.5 rounded-lg border-l-[3px] px-3 py-2 ${cleared ? 'border-line bg-surface opacity-60' : warn ? 'border-rambutan bg-rambutan-soft' : 'border-thambili bg-thambili-soft'}`}>
        <Icon className={`mt-0.5 size-4 shrink-0 ${cleared ? 'text-muted' : warn ? 'text-rambutan' : 'text-thambili'}`} aria-hidden />
        <div className="min-w-0 flex-1 text-sm">
          <div className="font-semibold">
            {e.title} <span className="font-normal text-muted">· {e.place}</span>
            {fresh && !cleared && <span className="ml-1.5 rounded bg-lagoon px-1 text-[10px] font-bold uppercase text-canvas">{t('live.new')}</span>}
          </div>
          <div className="text-muted">{e.detail}</div>
          <div className="mt-0.5 text-[11px] text-muted">
            {cleared ? t('live.cleared', { time: clock(e.clearedAt!, locale) }) : e.escalatedAt ? t('live.escalated', { time: clock(e.escalatedAt, locale) }) : t('live.since', { time: clock(e.firstSeen, locale) })}
          </div>
        </div>
        <span className="sr-only">{t(warn ? 'alerts.srWarning' : 'alerts.srWatch')}</span>
      </Link>
    </li>
  )
}
