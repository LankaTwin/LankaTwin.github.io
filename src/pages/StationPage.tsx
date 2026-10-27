import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Download, Sunrise, Sunset } from 'lucide-react'
import ChartCard from '../components/ChartCard'
import { chartTokens, baseOption } from '../components/Chart'
import { Freshness, Segmented, SourceProblem, Skeleton, Stat } from '../components/ui'
import { fetchAirSeries, fetchArchiveDaily, fetchSolar, fetchStationSeries, series } from '../lib/api'
import { dailySum, timeOption, zip } from '../lib/chartOptions'
import { downloadCSV } from '../lib/export'
import { compass, fmt, weatherText } from '../lib/metrics'
import { stationById } from '../lib/places'
import { addDays, addHours, colomboNow, colomboToday, compact, dayMonth, dayName } from '../lib/time'
import { useNowcast } from '../hooks/useLiveData'
import { useSettings } from '../stores/settings'

type Range = '24h' | '7d' | '30d'
const RANGE: Record<Range, { past: number; back: number; fwd: number }> = {
  '24h': { past: 1, back: 24, fwd: 48 },
  '7d': { past: 7, back: 24 * 7, fwd: 24 * 7 },
  '30d': { past: 31, back: 24 * 30, fwd: 24 * 7 },
}

export default function StationPage() {
  const { id } = useParams()
  const st = stationById(id)
  const [range, setRange] = useState<Range>('7d')
  const theme = useSettings((s) => s.theme)
  const { readings } = useNowcast()
  const now = readings?.find((r) => r.station.id === id)

  const wx = useQuery({
    queryKey: ['station', id, range],
    queryFn: ({ signal }) => fetchStationSeries(st!, RANGE[range].past, signal),
    enabled: !!st,
    refetchInterval: 15 * 60_000,
  })
  const aq = useQuery({
    queryKey: ['station-air', id, range],
    queryFn: ({ signal }) => fetchAirSeries(st!, RANGE[range].past, signal),
    enabled: !!st,
    refetchInterval: 30 * 60_000,
  })

  if (!st) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <p className="mb-3">There is no place called “{id}” in LankaTwin.</p>
        <Link to="/stations" className="font-semibold text-lagoon underline">Browse all places</Link>
      </div>
    )
  }

  const nowWall = colomboNow()
  const win = { from: addHours(nowWall, -RANGE[range].back), to: addHours(nowWall, RANGE[range].fwd) }

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-6">
      <Link to={`/?s=${st.id}&k=station`} className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Back to map
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight">
            {st.name} <span className="text-2xl font-medium text-muted">{st.si}</span>
          </h1>
          <p className="mt-1 text-muted">
            {st.district} District, {st.province} Province · {st.lat.toFixed(3)}°N {st.lon.toFixed(3)}°E
            {wx.data?.elevation != null && ` · ${Math.round(wx.data.elevation)} m`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented label="Time range" value={range} onChange={setRange} options={[{ value: '24h', label: '24 hours' }, { value: '7d', label: '7 days' }, { value: '30d', label: '30 days' }]} />
          <button
            disabled={!wx.data}
            onClick={() => exportCSV(st.id, wx.data, aq.data)}
            className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium hover:bg-sunken disabled:opacity-50"
          >
            <Download className="size-4" aria-hidden /> CSV
          </button>
        </div>
      </header>

      {now ? (
        <section className="grid grid-cols-2 gap-4 rounded-xl border border-line bg-surface p-4 sm:grid-cols-4 lg:grid-cols-7">
          <div className="col-span-2 sm:col-span-4 lg:col-span-1">
            <div className="text-5xl font-extrabold tracking-tight">{fmt(now.values.temp)}°</div>
            <div className="text-sm text-muted">{weatherText(now.weatherCode)}</div>
          </div>
          <Stat label="Feels like" value={fmt(now.values.feels)} unit="°" sub={`Max today ${fmt(now.feelsMaxToday)}°`} />
          <Stat label="Humidity" value={fmt(now.values.humidity)} unit="%" sub={`Cloud ${fmt(now.cloud)}%`} />
          <Stat label="Wind" value={fmt(now.windSpeed)} unit="km/h" sub={`${compass(now.windDir)}, gusts ${fmt(now.values.gust)}`} />
          <Stat label="Rain, last 24 h" value={fmt(now.values.rain24, 1)} unit="mm" />
          <Stat label="Rain, next 24 h" value={fmt(now.values.rainNext24, 1)} unit="mm" sub={now.rainProbNext24 != null ? `${now.rainProbNext24}% max chance` : undefined} />
          <Stat label="Air (US AQI)" value={fmt(now.values.aqi)} sub={now.air ? `PM2.5 ${fmt(now.air.pm25)} · PM10 ${fmt(now.air.pm10)}` : undefined} />
        </section>
      ) : (
        <Skeleton className="h-24" />
      )}

      {wx.error && <SourceProblem error={wx.error} onRetry={() => wx.refetch()} />}

      <DailyStrip data={wx.data} />

      <Charts wx={wx.data} aq={aq.data} aqError={aq.error} range={range} win={win} nowWall={nowWall} theme={theme} file={st.id} />

      <div className="grid gap-4 lg:grid-cols-2">
        <ClimateContext stationId={st.id} />
        <Solar stationId={st.id} />
      </div>

      <p className="text-xs text-muted">
        <Freshness at={wx.dataUpdatedAt} fetching={wx.isFetching} /> · All times Sri Lanka time (UTC+5:30). Model values for the grid cell around {st.name}; they can differ from what a rain gauge in town records.
      </p>
    </div>
  )
}

type Wx = Awaited<ReturnType<typeof fetchStationSeries>>
type Aq = Awaited<ReturnType<typeof fetchAirSeries>>

function Charts({ wx, aq, aqError, range, win, nowWall, theme, file }: { wx?: Wx; aq?: Aq; aqError: unknown; range: Range; win: { from: string; to: string }; nowWall: string; theme: string; file: string }) {
  const opts = useMemo(() => {
    if (!wx?.hourly) return undefined
    const t = chartTokens()
    const time = wx.hourly.time as string[]
    const keep = time.map((x) => x >= win.from && x <= win.to)
    const tw = time.filter((_, i) => keep[i])
    const pick = (k: string) => series(wx.hourly, k).filter((_, i) => keep[i])
    const rain = pick('precipitation')
    const rainSpec = range === '30d'
      ? { name: 'Daily rain', type: 'bar' as const, data: dailySum(tw, rain).map(([d, v]) => [`${d}T12:00`, v] as [string, number]), color: t.lagoon }
      : { name: 'Hourly rain', type: 'bar' as const, data: zip(tw, rain), color: t.lagoon }
    const at = (aq?.hourly?.time ?? []) as string[]
    const akeep = at.map((x) => x >= win.from && x <= win.to)
    const atw = at.filter((_, i) => akeep[i])
    const apick = (k: string) => series(aq?.hourly, k).filter((_, i) => akeep[i])
    return {
      temp: timeOption([
        { name: 'Air temperature', data: zip(tw, pick('temperature_2m')), color: t.thambili, area: true },
        { name: 'Feels like', data: zip(tw, pick('apparent_temperature')), color: t.rambutan, dashed: true, width: 1.5 },
      ], { unit: '°C', now: nowWall }),
      rain: timeOption([rainSpec], { unit: 'mm', now: nowWall, yMin0: true }),
      rainTotal: { past: rain.filter((_, i) => tw[i] <= nowWall).reduce<number>((a, b) => a + (b ?? 0), 0), next: rain.filter((_, i) => tw[i] > nowWall).reduce<number>((a, b) => a + (b ?? 0), 0) },
      humid: timeOption([
        { name: 'Humidity', data: zip(tw, pick('relative_humidity_2m')), color: t.lagoon },
        { name: 'Cloud cover', data: zip(tw, pick('cloud_cover')), color: t.muted, dashed: true, width: 1.5 },
      ], { unit: '%', now: nowWall, min: 0, max: 100, decimals: 0 }),
      wind: timeOption([
        { name: 'Wind', data: zip(tw, pick('wind_speed_10m')), color: t.lagoon },
        { name: 'Gusts', data: zip(tw, pick('wind_gusts_10m')), color: t.thambili, dashed: true, width: 1.5 },
      ], { unit: 'km/h', now: nowWall, yMin0: true, decimals: 0 }),
      soil: timeOption([{ name: 'Top-soil moisture', data: zip(tw, pick('soil_moisture_0_to_1cm')), color: t.paddy, area: true }], { unit: 'm³/m³', now: nowWall, decimals: 2 }),
      air: atw.length
        ? timeOption([
            { name: 'US AQI', data: zip(atw, apick('us_aqi')), color: t.rambutan },
            { name: 'PM2.5 µg/m³', data: zip(atw, apick('pm2_5')), color: t.muted, dashed: true, width: 1.5 },
          ], { unit: '', now: nowWall, yMin0: true, decimals: 0 })
        : undefined,
    }
  }, [wx, aq, range, win.from, win.to, nowWall, theme]) // eslint-disable-line react-hooks/exhaustive-deps

  const loading = !wx
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard title="Temperature" sub="Air temperature and feels-like, °C" option={opts?.temp} loading={loading} file={`${file}-temperature`} />
      <ChartCard
        title="Rainfall"
        sub={opts ? `${fmt(opts.rainTotal.past, 1)} mm in this window so far · ${fmt(opts.rainTotal.next, 1)} mm forecast` : 'mm per hour'}
        option={opts?.rain} loading={loading} file={`${file}-rain`}
      />
      <ChartCard title="Humidity and cloud" sub="%" option={opts?.humid} loading={loading} file={`${file}-humidity`} />
      <ChartCard title="Wind" sub="Mean wind and gusts at 10 m, km/h" option={opts?.wind} loading={loading} file={`${file}-wind`} />
      <ChartCard title="Air quality" sub={aqError ? 'Air-quality source unavailable right now' : 'CAMS model, US AQI and PM2.5'} option={opts?.air} loading={!aq && !aqError} file={`${file}-air`} />
      <ChartCard title="Top-soil moisture" sub="0–1 cm, volumetric. Rising values after rain flag saturated ground." option={opts?.soil} loading={loading} file={`${file}-soil`} />
    </div>
  )
}

function DailyStrip({ data }: { data?: Wx }) {
  if (!data?.daily) return <Skeleton className="h-28" />
  const time = data.daily.time as string[]
  const today = colomboToday()
  const start = Math.max(0, time.indexOf(today))
  const days = time.slice(start, start + 7)
  const v = (k: string, i: number) => series(data.daily, k)[start + i]
  const sun = (k: string, i: number) => String((data.daily?.[k] as string[] | undefined)?.[start + i] ?? '').slice(11, 16)
  return (
    <section aria-label="7-day forecast" className="overflow-x-auto rounded-xl border border-line bg-surface">
      <ol className="grid min-w-[640px] grid-cols-7 divide-x divide-line">
        {days.map((d, i) => (
          <li key={d} className="p-3 text-sm">
            <div className="font-semibold">{i === 0 ? 'Today' : dayName(d)} <span className="font-normal text-muted">{dayMonth(d)}</span></div>
            <div className="mt-1 h-10 text-xs leading-tight text-muted">{weatherText(v('weather_code', i))}</div>
            <div className="text-lg font-bold">{fmt(v('temperature_2m_max', i))}° <span className="text-sm font-medium text-muted">{fmt(v('temperature_2m_min', i))}°</span></div>
            <div className="text-xs"><span className="font-semibold text-lagoon">{fmt(v('precipitation_sum', i), 1)} mm</span> <span className="text-muted">· {fmt(v('precipitation_probability_max', i))}%</span></div>
            <div className="mt-1 flex gap-2 text-[11px] text-muted">
              <span className="inline-flex items-center gap-0.5"><Sunrise className="size-3" aria-label="Sunrise" />{sun('sunrise', i)}</span>
              <span className="inline-flex items-center gap-0.5"><Sunset className="size-3" aria-label="Sunset" />{sun('sunset', i)}</span>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

/** Last 30 days of rain compared with the same calendar window in each of the previous 10 years (ERA5). */
function ClimateContext({ stationId }: { stationId: string }) {
  const st = stationById(stationId)!
  const theme = useSettings((s) => s.theme)
  // ERA5 lags ~5 days, so the window ends 6 days ago.
  const end = addDays(colomboToday(), -6)
  const start = addDays(end, -29)
  const y0 = Number(end.slice(0, 4)) - 10
  const q = useQuery({
    queryKey: ['archive', stationId, end],
    queryFn: ({ signal }) => fetchArchiveDaily(st, `${y0}-01-01`, end, signal),
    staleTime: 12 * 3600_000,
  })
  const result = useMemo(() => {
    if (!q.data?.daily) return undefined
    const time = q.data.daily.time as string[]
    const pr = series(q.data.daily, 'precipitation_sum')
    const md = (s: string) => s.slice(5)
    const crossesYear = md(start) > md(end)
    const inWindow = (t: string, year: number) => {
      const s = `${crossesYear ? year - 1 : year}-${md(start)}`
      const e = `${year}-${md(end)}`
      return t >= s && t <= e
    }
    const years: { year: number; total: number }[] = []
    const endYear = Number(end.slice(0, 4))
    for (let y = endYear - 9; y <= endYear; y++) {
      let tot = 0, n = 0
      time.forEach((t, i) => { if (inWindow(t, y)) { tot += pr[i] ?? 0; n++ } })
      if (n >= 25) years.push({ year: y, total: Math.round(tot) })
    }
    const thisYear = years.find((y) => y.year === endYear)
    const prior = years.filter((y) => y.year !== endYear)
    const mean = prior.length ? prior.reduce((a, b) => a + b.total, 0) / prior.length : null
    const t = chartTokens()
    const b = baseOption() as Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
    const option = {
      ...b,
      legend: { show: false },
      tooltip: { ...b.tooltip, trigger: 'axis', valueFormatter: (v: number) => `${v} mm` },
      xAxis: { ...b.xAxis, type: 'category', data: years.map((y) => String(y.year)) },
      yAxis: { ...b.yAxis, name: 'mm', min: 0 },
      series: [{
        type: 'bar', barMaxWidth: 22,
        data: years.map((y) => ({ value: y.total, itemStyle: { color: y.year === endYear ? t.lagoon : t.line, borderRadius: [3, 3, 0, 0] } })),
        markLine: mean != null ? { silent: true, symbol: 'none', data: [{ yAxis: Math.round(mean) }], lineStyle: { color: t.ink, type: 'dashed', opacity: 0.6 }, label: { formatter: '10-yr mean', color: t.muted, fontSize: 10, position: 'insideEndTop' } } : undefined,
      }],
    }
    return { thisYear, mean, option }
  }, [q.data, start, end, theme]) // eslint-disable-line react-hooks/exhaustive-deps

  const pct = result?.thisYear && result.mean ? Math.round((result.thisYear.total / result.mean) * 100) : null
  return (
    <ChartCard
      title="Rain against the past decade"
      sub={`${dayMonth(start)} – ${dayMonth(end)} each year, ERA5 reanalysis`}
      option={result?.option}
      loading={q.isLoading}
      file={`${stationId}-rain-anomaly`}
    >
      {q.error ? <div className="mt-2"><SourceProblem error={q.error} onRetry={() => q.refetch()} /></div> : null}
      {pct != null && (
        <p className="mt-2 text-sm">
          <b className="font-semibold">{fmt(result!.thisYear!.total)} mm</b> fell in these 30 days, {' '}
          <b className={`font-semibold ${pct >= 130 ? 'text-lagoon' : pct <= 70 ? 'text-thambili' : ''}`}>{pct}%</b> of the {fmt(result!.mean)} mm decade average
          {pct >= 130 ? ' — a wetter than usual spell.' : pct <= 70 ? ' — drier than usual.' : ' — close to normal.'}
        </p>
      )}
    </ChartCard>
  )
}

function Solar({ stationId }: { stationId: string }) {
  const st = stationById(stationId)!
  const theme = useSettings((s) => s.theme)
  const end = addDays(colomboToday(), -1)
  const start = addDays(end, -44)
  const q = useQuery({
    queryKey: ['power', stationId, end],
    queryFn: ({ signal }) => fetchSolar(st, compact(start), compact(end), signal),
    staleTime: 12 * 3600_000,
  })
  const res = useMemo(() => {
    const p = q.data?.properties.parameter
    if (!p) return undefined
    const all = p.ALLSKY_SFC_SW_DWN ?? {}
    const clr = p.CLRSKY_SFC_SW_DWN ?? {}
    const keys = Object.keys(all).filter((k) => all[k] > -900)
    const toIso = (k: string) => `${k.slice(0, 4)}-${k.slice(4, 6)}-${k.slice(6, 8)}T12:00`
    const t = chartTokens()
    const avg = keys.length ? keys.reduce((a, k) => a + all[k], 0) / keys.length : null
    return {
      avg,
      last: keys.at(-1),
      option: timeOption([
        { name: 'All-sky', type: 'bar', data: keys.map((k) => [toIso(k), all[k]]), color: t.thambili },
        { name: 'Clear-sky potential', data: keys.filter((k) => clr[k] > -900).map((k) => [toIso(k), clr[k]]), color: t.muted, dashed: true, width: 1.5 },
      ], { unit: 'kWh/m²', yMin0: true, decimals: 2 }),
    }
  }, [q.data, theme]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ChartCard
      title="Solar energy received"
      sub="NASA POWER daily surface irradiance. Gap to the dashed line is what cloud took away."
      option={res?.option}
      loading={q.isLoading}
      file={`${stationId}-solar`}
    >
      {q.error ? <div className="mt-2"><SourceProblem error={q.error} onRetry={() => q.refetch()} /></div> : null}
      {res?.avg != null && (
        <p className="mt-2 text-sm">
          Averaging <b className="font-semibold">{fmt(res.avg, 1)} kWh/m² a day</b> — about {fmt(res.avg * 0.8, 1)} kWh per day from each kW of rooftop solar (80% performance ratio).
          {res.last && <span className="text-muted"> Latest complete day: {dayMonth(`${res.last.slice(0, 4)}-${res.last.slice(4, 6)}-${res.last.slice(6, 8)}`)}.</span>}
        </p>
      )}
    </ChartCard>
  )
}

function exportCSV(id: string, wx?: Wx, aq?: Aq) {
  if (!wx?.hourly) return
  const time = wx.hourly.time as string[]
  const keys = ['temperature_2m', 'apparent_temperature', 'relative_humidity_2m', 'precipitation', 'wind_speed_10m', 'wind_gusts_10m', 'cloud_cover', 'soil_moisture_0_to_1cm']
  const at = (aq?.hourly?.time ?? []) as string[]
  const aIdx = new Map(at.map((t, i) => [t, i]))
  const aKeys = ['us_aqi', 'pm2_5', 'pm10']
  const rows = time.map((t, i) => {
    const ai = aIdx.get(t)
    return [t, ...keys.map((k) => series(wx.hourly, k)[i]), ...aKeys.map((k) => (ai == null ? null : series(aq?.hourly, k)[ai]))]
  })
  const units = wx.hourly_units ?? {}
  downloadCSV(
    `lankatwin-${id}-${colomboToday()}.csv`,
    ['time_asia_colombo', ...keys.map((k) => `${k}_${(units[k] ?? '').replace(/[^\w%°/]/g, '')}`), 'us_aqi', 'pm2_5_ugm3', 'pm10_ugm3'],
    rows,
  )
}
