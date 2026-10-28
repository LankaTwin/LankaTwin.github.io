import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ShareButton } from '../components/Share'
import { Download, ExternalLink, Gauge as GaugeIcon, Search } from 'lucide-react'
import type { EChartsCoreOption } from 'echarts/core'
import MapView from '../components/MapView'
import Chart, { baseOption, chartTokens } from '../components/Chart'
import GaugeLevelTile, { GaugeTrend } from '../components/GaugeLevelTile'
import { Freshness, SourceProblem, Skeleton, Stat } from '../components/ui'
import { useTitle } from '../hooks/useApp'
import { useGauges } from '../hooks/useGauges'
import { basinsOf, dailyRain, GAUGE_LEVELS, gaugeSummary, OFFICIAL_DASHBOARD, type GaugeLevel, type GaugeStation } from '../lib/gauges'
import { downloadCSV } from '../lib/export'
import { fmt, inkOn } from '../lib/metrics'
import { colomboToday, dayMonth, readingTime } from '../lib/time'
import type { Key, T } from '../i18n/core'
import { useT } from '../i18n/useT'

type Tab = 'hourly' | 'alert' | 'minor' | 'major'
const H = 3_600_000

export default function GaugesPage() {
  const { t, locale } = useT()
  useTitle(t('gauges.title'))
  const { id } = useParams()
  const nav = useNavigate()
  const { gauges, query, updatedAt } = useGauges()
  const [tab, setTab] = useState<Tab>('hourly')
  const [filter, setFilter] = useState('')
  const sum = useMemo(() => (gauges ? gaugeSummary(gauges) : undefined), [gauges])
  const basins = useMemo(() => basinsOf(gauges ?? []), [gauges])

  // The worst gauge is the default selection, so the page opens on what matters.
  const sel = gauges?.find((g) => g.id === id) ?? gauges?.find((g) => g.latest) ?? gauges?.[0]
  const choose = (gid: string) => nav(`/gauges/${gid}`, { replace: true })
  const inBasin = (gauges ?? []).filter((g) => g.basin === sel?.basin)

  const exportCsv = () => downloadCSV(
    `lankatwin-gauges-${colomboToday()}.csv`,
    ['gauge', 'basin', 'time_utc', 'water_level', 'unit', 'rain_mm', 'alert_level', 'minor_flood_level', 'major_flood_level'],
    (gauges ?? []).flatMap((g) => g.series.map((o) => [g.name, g.basin, new Date(o.time).toISOString(), o.level, g.unit, o.rain, g.thresholds.alert, g.thresholds.minor, g.thresholds.major])),
  )

  return (
    <div className="mx-auto max-w-7xl space-y-5 2xl:max-w-[1720px] 2xl:px-8 px-3 py-4 sm:px-4 sm:py-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 max-w-3xl">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{t('gauges.title')}</h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rambutan px-2 py-0.5 text-[11px] font-bold tracking-wide text-white">
              <span className="size-1.5 animate-pulse rounded-full bg-white" aria-hidden /> {t('live.badge')}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted">{t('gauges.intro')}</p>
          <p className="mt-1 text-xs text-muted"><Freshness at={updatedAt} fetching={query.isFetching} /></p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {sel && (
            <ShareButton
              title={t('share.gaugeTitle', { name: sel.name })}
              text={sel.latest && !sel.rainOnly ? t('share.gaugeText', { name: sel.name, basin: sel.basin, level: fmt(sel.latest.level, 2), unit: sel.unit, status: t(sel.stale ? 'gauge.stale' : (`gaugeLevel.${sel.level}` as Key)), time: readingTime(sel.latest.time, locale) }) : undefined}
              path={`/gauges/${sel.id}`}
            />
          )}
          <a href={OFFICIAL_DASHBOARD} className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium hover:bg-sunken">
            <ExternalLink className="size-4" aria-hidden /> {t('gauges.official')}
          </a>
          <button disabled={!gauges} onClick={exportCsv} className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium hover:bg-sunken disabled:opacity-50">
            <Download className="size-4" aria-hidden /> CSV
          </button>
        </div>
      </header>

      {query.error && <SourceProblem error={query.error} onRetry={() => query.refetch()} />}

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3" aria-label={t('gauges.kpis')}>
        <Kpi label={t('gauges.kpi.stations')} value={sum?.stations} sub={sum ? t('gauges.kpi.reporting', { n: sum.reporting }) : undefined} onClick={() => setTab('hourly')} active={tab === 'hourly'} />
        {(['alert', 'minor', 'major'] as const).map((l) => (
          <Kpi key={l} label={t(`gauges.kpi.${l}`)} value={sum?.[l]} color={sum?.[l] ? GAUGE_LEVELS[l].color : undefined} onClick={() => setTab(l)} active={tab === l} sub={t('gauges.kpi.window')} />
        ))}
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="relative h-[52vh] min-h-[320px] overflow-hidden rounded-xl border border-line lg:h-auto">
          <MapView gauges={gauges} force={{ gauges: true, basins: true, rivers: true }} selected={sel?.id} onSelect={(gid, k) => k === 'gauge' && choose(gid)} className="absolute inset-0" />
          <Legend />
        </div>

        <section className="space-y-3" aria-label={t('gauges.selected')}>
          {!gauges ? <Skeleton className="h-96" /> : !sel ? <p className="text-sm text-muted">{t('gauges.none')}</p> : (
            <>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-muted">
                  {t('gauges.pickBasin')}
                  <select value={sel.basin} onChange={(e) => { const g = gauges.find((x) => x.basin === e.target.value); if (g) choose(g.id) }} className="mt-0.5 w-full rounded-lg border border-line bg-surface px-2 py-1.5 text-sm text-ink">
                    {basins.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </label>
                <label className="text-xs text-muted">
                  {t('gauges.pickStation')}
                  <select value={sel.id} onChange={(e) => choose(e.target.value)} className="mt-0.5 w-full rounded-lg border border-line bg-surface px-2 py-1.5 text-sm text-ink">
                    {inBasin.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </label>
              </div>
              <div>
                <h2 className="text-xl font-extrabold tracking-tight">{t('gauges.stationTitle', { name: sel.name })}</h2>
                <p className="text-sm text-muted">{t('gauge.basin', { basin: sel.basin || '—' })}</p>
              </div>
              <GaugeLevelTile g={sel} />
              <div className="grid grid-cols-3 gap-3 rounded-xl border border-line bg-surface p-3">
                <Stat label={t('gauge.alertAt')} value={fmt(sel.thresholds.alert, 2)} unit={sel.unit} />
                <Stat label={t('gauge.minorAt')} value={fmt(sel.thresholds.minor, 2)} unit={sel.unit} />
                <Stat label={t('gauge.majorAt')} value={fmt(sel.thresholds.major, 2)} unit={sel.unit} />
                <Stat label={t('gauge.rain1h')} value={fmt(sel.rain1h, 1)} unit="mm" />
                <Stat label={t('gauge.rain24h')} value={fmt(sel.rain24h, 1)} unit="mm" />
                <Stat label={t('gauge.peak4d')} value={sel.peak ? fmt(sel.peak.obs.level, 2) : '—'} unit={sel.unit} sub={sel.peak ? `${readingTime(sel.peak.obs.time, locale)} · ${t(`gaugeLevel.${sel.peak.level}` as Key)}` : undefined} />
              </div>
              {!sel.rainOnly && (
                <Card title={t('gauges.levelChart', { name: sel.name, unit: sel.unit })}>
                  <Chart option={levelOption(sel, t)} height={240} label={t('gauges.levelChart', { name: sel.name, unit: sel.unit })} />
                </Card>
              )}
              <Card title={t('gauges.dailyRain', { name: sel.name })}>
                <Chart option={dailyRainOption(sel, t, locale)} height={170} label={t('gauges.dailyRain', { name: sel.name })} />
              </Card>
            </>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section>
          <div role="tablist" aria-label={t('gauges.lists')} className="mb-2 flex gap-1 overflow-x-auto [scrollbar-width:none]">
            {(['hourly', 'alert', 'minor', 'major'] as Tab[]).map((k) => (
              <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium ${tab === k ? 'bg-ink text-canvas' : 'bg-surface text-muted hover:text-ink'}`}>
                {t(`gauges.tab.${k}`)}
              </button>
            ))}
          </div>
          {tab === 'hourly' && (
            <label className="mb-2 flex items-center gap-2 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm">
              <Search className="size-4 text-muted" aria-hidden />
              <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={t('gauges.filter')} className="min-w-0 flex-1 bg-transparent outline-none" />
            </label>
          )}
          {!gauges ? <Skeleton className="h-64" /> : <GaugeList gauges={gauges} tab={tab} filter={filter} selected={sel?.id} onPick={choose} />}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold">{t('gauges.rainTitle')}</h2>
          {!gauges ? <Skeleton className="h-64" /> : (
            <>
              <RankCard gauges={gauges} title={t('gauges.rain1hTop')} pick={(g) => g.rain1h} empty={t('gauges.noRain1h')} />
              <RankCard gauges={gauges} title={t('gauges.rain24hTop')} pick={(g) => g.rain24h} empty={t('gauges.noRain24h')} />
            </>
          )}
        </section>
      </div>

      <section className="rounded-xl bg-sunken p-4 text-sm">
        <h2 className="mb-1 flex items-center gap-2 font-semibold"><GaugeIcon className="size-4" aria-hidden /> {t('gauges.aboutTitle')}</h2>
        <p className="text-muted">{t('gauges.about')}</p>
        <p className="mt-2 text-muted">{t('gauges.aboutLinks')} <Link to="/floods" className="text-lagoon underline">{t('nav.floods')}</Link> · <Link to="/rivers" className="text-lagoon underline">{t('nav.rivers')}</Link> · <a href="https://www.irrigation.gov.lk" className="text-lagoon underline">{t('floods.irr')}</a></p>
      </section>
    </div>
  )
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-3">
      <h3 className="mb-1 text-sm font-semibold">{title}</h3>
      {children}
    </div>
  )
}

function RankCard({ gauges, title, pick, empty }: { gauges: GaugeStation[]; title: string; pick: (g: GaugeStation) => number | null; empty: string }) {
  const n = gauges.filter((g) => (pick(g) ?? 0) > 0).length
  return (
    <Card title={title}>
      {n ? <Chart option={rankOption(gauges, pick)} height={Math.max(120, Math.min(15, n) * 22 + 30)} label={title} /> : <p className="py-3 text-sm text-muted">{empty}</p>}
    </Card>
  )
}

function Legend() {
  const { t } = useT()
  return (
    <div className="pointer-events-none absolute bottom-2 left-2 flex flex-wrap gap-1 rounded-lg bg-surface/95 p-1.5 shadow-md backdrop-blur">
      {(Object.keys(GAUGE_LEVELS) as GaugeLevel[]).map((k) => (
        <span key={k} className="rounded-[3px] px-1.5 py-0.5 text-[11px] font-semibold" style={{ background: GAUGE_LEVELS[k].color, color: inkOn(GAUGE_LEVELS[k].color) }}>{t(`gaugeLevel.${k}` as Key)}</span>
      ))}
      <span className="rounded-[3px] bg-[#8a9399] px-1.5 py-0.5 text-[11px] font-semibold text-white">{t('gauge.stale')}</span>
    </div>
  )
}

function Kpi({ label, value, sub, color, onClick, active }: { label: string; value?: number; sub?: string; color?: string; onClick: () => void; active: boolean }) {
  return (
    <button onClick={onClick} aria-pressed={active} className={`h-full rounded-xl border p-3 text-left hover:brightness-[.98] ${active ? 'border-ink' : 'border-line'} bg-surface`}>
      <div className="text-xs text-muted">{label}</div>
      {value === undefined ? <Skeleton className="mt-1 h-8 w-16" /> : (
        <div className="mt-0.5 flex items-center gap-2">
          <span className="size-3 shrink-0 rounded-full" style={{ background: color ?? 'var(--c-line)' }} aria-hidden />
          <span className="text-2xl font-extrabold leading-tight sm:text-3xl">{value}</span>
        </div>
      )}
      {sub && <div className="truncate text-xs text-muted">{sub}</div>}
    </button>
  )
}

function GaugeList({ gauges, tab, filter, selected, onPick }: { gauges: GaugeStation[]; tab: Tab; filter: string; selected?: string; onPick: (id: string) => void }) {
  const { t, locale } = useT()
  const f = filter.trim().toLowerCase()
  const rows = tab === 'hourly'
    ? gauges.filter((g) => g.latest && (!f || `${g.name} ${g.basin}`.toLowerCase().includes(f))).sort((a, b) => b.latest!.time - a.latest!.time || a.name.localeCompare(b.name))
    // Last 4 days: every gauge whose highest status in the window was this level.
    : gauges.filter((g) => g.peak?.level === tab).sort((a, b) => b.peak!.obs.time - a.peak!.obs.time)
  if (!rows.length) return <p className="rounded-lg bg-paddy-soft px-3 py-2.5 text-sm">{t(tab === 'hourly' ? 'gauges.emptyHourly' : 'gauges.emptyLevel', { level: tab === 'hourly' ? '' : t(`gaugeLevel.${tab}` as Key) })}</p>
  return (
    <ul className="relative max-h-[60vh] space-y-1 overflow-y-auto pr-1">
      {rows.map((g) => {
        const obs = tab === 'hourly' ? g.latest! : g.peak!.obs
        const lv = tab === 'hourly' ? g.level : g.peak!.level
        const c = g.stale && tab === 'hourly' ? '#8a9399' : GAUGE_LEVELS[lv].color
        return (
          <li key={g.id}>
            <button onClick={() => onPick(g.id)} aria-current={selected === g.id} className={`flex w-full items-center gap-2.5 rounded-lg border-l-4 bg-surface px-2.5 py-1.5 text-left text-sm hover:bg-sunken ${selected === g.id ? 'ring-1 ring-ink' : ''}`} style={{ borderLeftColor: c }}>
              <div className="min-w-0 flex-1">
                <div className="truncate"><b className="font-semibold">{g.name}</b> <span className="text-muted">· {g.rainOnly ? `${fmt(obs.rain, 1)} mm` : `${fmt(obs.level, 2)} ${g.unit}`}</span></div>
                <div className="truncate text-xs text-muted">{readingTime(obs.time, locale)} · {t('gauge.basin', { basin: g.basin || '—' })}{obs.rain != null && !g.rainOnly ? ` · ${t('gauges.rainShort', { mm: fmt(obs.rain, 1) })}` : ''}</div>
              </div>
              {!g.rainOnly && (
                <span className="flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold" style={{ background: c, color: inkOn(c) }}>
                  {t(g.stale && tab === 'hourly' ? 'gauge.stale' : (`gaugeLevel.${lv}` as Key))}{tab === 'hourly' && <GaugeTrend g={g} className="size-3" />}
                </span>
              )}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

// ---------- Charts ----------

/** Water level over the window with the department's three thresholds, and hourly rain behind it. */
function levelOption(g: GaugeStation, t: T): EChartsCoreOption {
  const c = chartTokens()
  const base = baseOption() as Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
  const since = Date.now() - 3 * 24 * H
  const pts = g.series.filter((o) => o.time >= since)
  const marks = (['alert', 'minor', 'major'] as const)
    .filter((l) => g.thresholds[l] != null)
    .map((l) => ({ yAxis: g.thresholds[l], lineStyle: { color: GAUGE_LEVELS[l].color, type: 'dashed', width: 1.5 }, label: { formatter: t(`gaugeLevel.${l}` as Key), color: c.muted, fontSize: 10, position: 'insideEndTop' } }))
  const levels = pts.map((o) => o.level).filter((v): v is number => v != null)
  const hi = Math.max(...levels, ...marks.map((m) => m.yAxis as number))
  const lo = Math.min(...levels)
  return {
    ...base,
    grid: { ...base.grid, right: 40, top: 44 },
    legend: { ...base.legend, show: true, right: 'center' },
    tooltip: { ...base.tooltip, valueFormatter: (v: number | null) => (v == null ? '—' : fmt(v, 2)) },
    yAxis: [
      { ...base.yAxis, name: g.unit, scale: true, min: Number.isFinite(lo) ? Math.floor(lo * 10) / 10 : undefined, max: Number.isFinite(hi) ? Math.ceil(hi * 1.05 * 10) / 10 : undefined },
      { ...base.yAxis, name: 'mm', position: 'right', min: 0, splitLine: { show: false } },
    ],
    series: [
      {
        name: t('gauges.series.level'), type: 'line', data: pts.map((o) => [o.time, o.level]), showSymbol: pts.length < 30, symbolSize: 4,
        lineStyle: { color: c.lagoon, width: 2 }, itemStyle: { color: c.lagoon }, areaStyle: { color: c.lagoon, opacity: 0.08 },
        markLine: marks.length ? { silent: true, symbol: 'none', data: marks } : undefined,
      },
      { name: t('gauges.series.rain'), type: 'bar', yAxisIndex: 1, data: pts.map((o) => [o.time, o.rain]), barMaxWidth: 6, itemStyle: { color: c.muted, opacity: 0.45 } },
    ],
  }
}

function dailyRainOption(g: GaugeStation, t: T, locale: string): EChartsCoreOption {
  const c = chartTokens()
  const base = baseOption() as Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
  const days = dailyRain(g.series)
  return {
    ...base,
    xAxis: { ...base.xAxis, type: 'category', data: days.map(([d]) => dayMonth(d, locale)) },
    legend: { show: false },
    yAxis: { ...base.yAxis, name: 'mm', min: 0 },
    tooltip: { ...base.tooltip, valueFormatter: (v: number) => `${fmt(v, 1)} mm` },
    series: [{ name: t('gauges.series.rain'), type: 'bar', data: days.map(([, v]) => v), barMaxWidth: 28, itemStyle: { color: c.lagoon, borderRadius: [3, 3, 0, 0] }, label: { show: true, position: 'top', color: c.muted, fontSize: 10, formatter: ({ value }: { value: number }) => fmt(value, 1) } }],
  }
}

/** Gauges ranked by rain, as horizontal bars (top 15). */
function rankOption(gauges: GaugeStation[], pick: (g: GaugeStation) => number | null): EChartsCoreOption {
  const c = chartTokens()
  const base = baseOption() as Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
  const rows = gauges.map((g) => [g.name, pick(g)] as const).filter(([, v]) => v != null && v > 0).sort((a, b) => b[1]! - a[1]!).slice(0, 15).reverse()
  return {
    ...base,
    grid: { left: 110, right: 36, top: 8, bottom: 20 },
    legend: { show: false },
    tooltip: { ...base.tooltip, trigger: 'item', valueFormatter: (v: number) => `${fmt(v, 1)} mm` },
    xAxis: { type: 'value', min: 0, axisLabel: { color: c.muted }, splitLine: { lineStyle: { color: c.line, opacity: 0.6 } } },
    yAxis: { type: 'category', data: rows.map(([n]) => n), axisLabel: { color: c.ink, fontSize: 11, width: 100, overflow: 'truncate' }, axisLine: { lineStyle: { color: c.line } } },
    series: [{ type: 'bar', data: rows.map(([, v]) => v), barMaxWidth: 12, itemStyle: { color: c.lagoon, borderRadius: [0, 3, 3, 0] }, label: { show: true, position: 'right', color: c.muted, fontSize: 10, formatter: ({ value }: { value: number }) => fmt(value, 1) } }],
  }
}
