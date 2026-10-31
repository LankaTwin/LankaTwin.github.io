import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Code2, Download, Sunrise, Sunset, Waves } from 'lucide-react'
import ChartCard from '../components/ChartCard'
import { chartTokens, baseOption } from '../components/Chart'
import { FavoriteButton, Freshness, Segmented, SourceProblem, Skeleton, Stat } from '../components/ui'
import { ShareButton } from '../components/Share'
import PlacePhoto from '../components/PlacePhoto'
import WeatherIcon from '../components/WeatherIcon'
import { skyFor } from '../components/Landscape'
import { useTitle } from '../hooks/useApp'
import SeasonCard from '../components/SeasonCard'
import { rich, type Key } from '../i18n/core'
import { useT } from '../i18n/useT'
import { fetchAirSeries, fetchArchiveDaily, fetchSolar, fetchStationSeries, series } from '../lib/api'
import { dailySum, timeOption, zip } from '../lib/chartOptions'
import { downloadCSV } from '../lib/export'
import { compass, fmt, inkOn, RIVER_LEVELS, riverLevelText, uvBand, weatherText } from '../lib/metrics'
import { districtName, placeName, riverNames, riversNear, stationById, type Station } from '../lib/places'
import { addDays, addHours, colomboNow, colomboToday, compact, dayMonth, dayName } from '../lib/time'
import { useNowcast, useRivers } from '../hooks/useLiveData'
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
  const [embedOpen, setEmbedOpen] = useState(false)
  const { t, lang } = useT()
  const name = st ? placeName(st, lang) : ''
  useTitle(st ? name : t('place.unknownTitle'))

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
        <p className="mb-3">{t('place.unknown', { id: id ?? '' })}</p>
        <Link to="/stations" className="font-semibold text-lagoon underline">{t('place.browse')}</Link>
      </div>
    )
  }

  const nowWall = colomboNow()
  const others = [st.name, st.si, st.ta].filter((n) => n !== name).join(' · ')
  const sky = now ? weatherText(now.weatherCode, t) : ''
  const win = { from: addHours(nowWall, -RANGE[range].back), to: addHours(nowWall, RANGE[range].fwd) }

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 2xl:max-w-[1600px] 2xl:px-8">
      <Link to={`/?s=${st.id}&k=station`} className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> {t('place.back')}
      </Link>

      <PlacePhoto key={st.id} station={st} sky={now ? skyFor(now.weatherCode, now.isDay) : undefined} className="h-56 rounded-2xl sm:h-72">
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-4 text-white sm:p-6">
          <div className="min-w-0">
            <h1 className="text-4xl font-extrabold tracking-tight drop-shadow sm:text-5xl">{name}</h1>
            <p className="mt-0.5 text-lg font-medium text-white/90 drop-shadow">{others}</p>
            <p className="mt-1 text-sm text-white/80">
              {t('common.districtProvince', { district: districtName(st.district, lang), province: t(`prov.${st.province}` as Key) })} · {st.lat.toFixed(3)}°N {st.lon.toFixed(3)}°E
              {wx.data?.elevation != null && ` · ${Math.round(wx.data.elevation)} m`}
            </p>
          </div>
          {now && (
            <div className="hidden shrink-0 items-center gap-2 rounded-xl bg-black/30 px-3 py-2 backdrop-blur-sm sm:flex">
              <WeatherIcon code={now.weatherCode} isDay={now.isDay ?? true} className="size-12" />
              <div>
                <div className="text-3xl font-extrabold leading-none">{fmt(now.values.temp)}°</div>
                <div className="text-xs text-white/85">{sky}</div>
              </div>
            </div>
          )}
        </div>
      </PlacePhoto>

      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <FavoriteButton id={st.id} name={name} className="border border-line bg-surface !p-2" />
          <ShareButton title={t('place.shareTitle', { place: name })} text={now ? t('place.shareText', { place: name, temp: fmt(now.values.temp), sky: lang === 'en' ? sky.toLowerCase() : sky }) : undefined} path={`/station/${st.id}`} />
          <button onClick={() => setEmbedOpen((o) => !o)} aria-expanded={embedOpen} className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium hover:bg-sunken">
            <Code2 className="size-4" aria-hidden /> {t('place.embed')}
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented label={t('place.range')} value={range} onChange={setRange} options={[{ value: '24h', label: t('place.24h') }, { value: '7d', label: t('place.7d') }, { value: '30d', label: t('place.30d') }]} />
          <button
            disabled={!wx.data}
            onClick={() => exportCSV(st.id, wx.data, aq.data)}
            className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium hover:bg-sunken disabled:opacity-50"
          >
            <Download className="size-4" aria-hidden /> CSV
          </button>
        </div>
      </header>

      {embedOpen && <EmbedCode station={st} />}

      {now ? (
        <section className="grid grid-cols-2 gap-4 rounded-xl border border-line bg-surface p-4 sm:grid-cols-4 lg:grid-cols-7">
          <div className="col-span-2 flex items-center gap-2 sm:col-span-4 lg:col-span-1">
            <WeatherIcon code={now.weatherCode} isDay={now.isDay ?? true} className="size-12 shrink-0" />
            <div>
              <div className="text-5xl font-extrabold tracking-tight">{fmt(now.values.temp)}°</div>
              <div className="text-sm text-muted">{sky}</div>
            </div>
          </div>
          <Stat label={t('stat.feels')} value={fmt(now.values.feels)} unit="°" sub={t('stat.maxToday', { t: fmt(now.feelsMaxToday) })} />
          <Stat label={t('stat.humidity')} value={fmt(now.values.humidity)} unit="%" sub={t('stat.cloud', { c: fmt(now.cloud) })} />
          <Stat label={t('stat.wind')} value={fmt(now.windSpeed)} unit="km/h" sub={t('stat.windSub', { dir: compass(now.windDir), g: fmt(now.values.gust) })} />
          <Stat label={t('stat.rainPast')} value={fmt(now.values.rain24, 1)} unit="mm" />
          <Stat label={t('stat.rainNext')} value={fmt(now.values.rainNext24, 1)} unit="mm" sub={now.rainProbNext24 != null ? t('stat.maxChance', { p: now.rainProbNext24 }) : undefined} />
          <Stat label={t('stat.air')} value={fmt(now.values.aqi)} sub={now.air ? `PM2.5 ${fmt(now.air.pm25)} · PM10 ${fmt(now.air.pm10)}` : undefined} />
          <Stat label={t('stat.uvNow')} value={fmt(now.air?.uv)} sub={t('stat.uvSub', { band: uvBand(now.air?.uv, t), uv: fmt(now.uvMax) })} />
          <Stat label={t('stat.pressure')} value={fmt(now.pressure)} unit="hPa" />
          <Stat label={t('stat.today')} value={`${fmt(now.tMax)}°`} sub={t('stat.low', { t: fmt(now.tMin) })} />
          <Stat label={t('stat.gustsToday')} value={fmt(now.gustMaxToday)} unit="km/h" />
          <Stat label={t('stat.elevation')} value={fmt(now.elevation)} unit="m" sub={t('stat.elevationSub')} />
          {now.flood && <Stat label={t('stat.flood')} value={t(`floodLevel.${now.flood.level}` as Key)} sub={<Link to="/floods" className="hover:underline">{t('flood.score', { n: now.flood.score })}</Link>} />}
        </section>
      ) : (
        <Skeleton className="h-24" />
      )}

      {wx.error && <SourceProblem error={wx.error} onRetry={() => wx.refetch()} />}

      <HourlyStrip data={wx.data} nowWall={nowWall} />

      <DailyStrip data={wx.data} />

      <div className="grid gap-4 lg:grid-cols-2">
        <SeasonCard className="p-4" />
        <NearbyRivers station={st} />
      </div>

      <Charts wx={wx.data} aq={aq.data} aqError={aq.error} range={range} win={win} nowWall={nowWall} theme={theme} file={st.id} />

      <div className="grid gap-4 lg:grid-cols-2">
        <ClimateContext stationId={st.id} />
        <Solar stationId={st.id} />
      </div>

      <p className="text-xs text-muted">
        <Freshness at={wx.dataUpdatedAt} fetching={wx.isFetching} /> · {t('place.footnote', { place: name })}
      </p>
    </div>
  )
}

type Wx = Awaited<ReturnType<typeof fetchStationSeries>>
type Aq = Awaited<ReturnType<typeof fetchAirSeries>>

function Charts({ wx, aq, aqError, range, win, nowWall, theme, file }: { wx?: Wx; aq?: Aq; aqError: unknown; range: Range; win: { from: string; to: string }; nowWall: string; theme: string; file: string }) {
  const { t: tr, lang } = useT()
  const opts = useMemo(() => {
    if (!wx?.hourly) return undefined
    const t = chartTokens()
    const time = wx.hourly.time as string[]
    const keep = time.map((x) => x >= win.from && x <= win.to)
    const tw = time.filter((_, i) => keep[i])
    const pick = (k: string) => series(wx.hourly, k).filter((_, i) => keep[i])
    const rain = pick('precipitation')
    const rainSpec = range === '30d'
      ? { name: tr('series.dailyRain'), type: 'bar' as const, data: dailySum(tw, rain).map(([d, v]) => [`${d}T12:00`, v] as [string, number]), color: t.lagoon }
      : { name: tr('series.hourlyRain'), type: 'bar' as const, data: zip(tw, rain), color: t.lagoon }
    const at = (aq?.hourly?.time ?? []) as string[]
    const akeep = at.map((x) => x >= win.from && x <= win.to)
    const atw = at.filter((_, i) => akeep[i])
    const apick = (k: string) => series(aq?.hourly, k).filter((_, i) => akeep[i])
    return {
      temp: timeOption([
        { name: tr('series.airTemp'), data: zip(tw, pick('temperature_2m')), color: t.thambili, area: true },
        { name: tr('series.feels'), data: zip(tw, pick('apparent_temperature')), color: t.rambutan, dashed: true, width: 1.5 },
      ], { unit: '°C', now: nowWall }),
      rain: timeOption([rainSpec], { unit: 'mm', now: nowWall, yMin0: true }),
      rainTotal: { past: rain.filter((_, i) => tw[i] <= nowWall).reduce<number>((a, b) => a + (b ?? 0), 0), next: rain.filter((_, i) => tw[i] > nowWall).reduce<number>((a, b) => a + (b ?? 0), 0) },
      humid: timeOption([
        { name: tr('series.humidity'), data: zip(tw, pick('relative_humidity_2m')), color: t.lagoon },
        { name: tr('series.cloud'), data: zip(tw, pick('cloud_cover')), color: t.muted, dashed: true, width: 1.5 },
      ], { unit: '%', now: nowWall, min: 0, max: 100, decimals: 0 }),
      wind: timeOption([
        { name: tr('series.wind'), data: zip(tw, pick('wind_speed_10m')), color: t.lagoon },
        { name: tr('series.gusts'), data: zip(tw, pick('wind_gusts_10m')), color: t.thambili, dashed: true, width: 1.5 },
      ], { unit: 'km/h', now: nowWall, yMin0: true, decimals: 0 }),
      soil: timeOption([{ name: tr('series.soil'), data: zip(tw, pick('soil_moisture_0_to_1cm')), color: t.paddy, area: true }], { unit: 'm³/m³', now: nowWall, decimals: 2 }),
      air: atw.length
        ? timeOption([
            { name: tr('series.aqi'), data: zip(atw, apick('us_aqi')), color: t.rambutan },
            { name: tr('series.pm25'), data: zip(atw, apick('pm2_5')), color: t.muted, dashed: true, width: 1.5 },
          ], { unit: '', now: nowWall, yMin0: true, decimals: 0 })
        : undefined,
    }
  }, [wx, aq, range, win.from, win.to, nowWall, theme, lang]) // eslint-disable-line react-hooks/exhaustive-deps

  const loading = !wx
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard title={tr('chart.temp')} sub={tr('chart.tempSub')} option={opts?.temp} loading={loading} file={`${file}-temperature`} />
      <ChartCard
        title={tr('chart.rain')}
        sub={opts ? tr('chart.rainSub', { past: fmt(opts.rainTotal.past, 1), next: fmt(opts.rainTotal.next, 1) }) : tr('chart.rainUnit')}
        option={opts?.rain} loading={loading} file={`${file}-rain`}
      />
      <ChartCard title={tr('chart.humid')} sub="%" option={opts?.humid} loading={loading} file={`${file}-humidity`} />
      <ChartCard title={tr('chart.wind')} sub={tr('chart.windSub')} option={opts?.wind} loading={loading} file={`${file}-wind`} />
      <ChartCard title={tr('chart.air')} sub={tr(aqError ? 'chart.airDown' : 'chart.airSub')} option={opts?.air} loading={!aq && !aqError} file={`${file}-air`} />
      <ChartCard title={tr('chart.soil')} sub={tr('chart.soilSub')} option={opts?.soil} loading={loading} file={`${file}-soil`} />
    </div>
  )
}

function HourlyStrip({ data, nowWall }: { data?: Wx; nowWall: string }) {
  const { t } = useT()
  if (!data?.hourly) return <Skeleton className="h-32" />
  const time = data.hourly.time as string[]
  const hour = nowWall.slice(0, 13)
  const start = Math.max(0, time.findIndex((t) => t.slice(0, 13) >= hour))
  const idx = Array.from({ length: 24 }, (_, k) => start + k).filter((i) => i < time.length)
  const v = (k: string, i: number) => series(data.hourly, k)[i]
  return (
    <section aria-label={t('place.next24')} className="rounded-xl border border-line bg-surface">
      <h2 className="px-4 pt-3 text-[15px] font-semibold">{t('place.next24')}</h2>
      <ol className="flex gap-1 overflow-x-auto px-2 pt-1 pb-3 [scrollbar-width:thin]">
        {idx.map((i, k) => {
          const p = v('precipitation_probability', i)
          const mm = v('precipitation', i)
          return (
            <li key={time[i]} className="flex w-[60px] shrink-0 flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-center text-xs">
              <span className="font-medium text-muted">{k === 0 ? t('common.now') : time[i].slice(11, 16)}</span>
              <WeatherIcon code={v('weather_code', i)} isDay={v('is_day', i) !== 0} className="size-8" title={weatherText(v('weather_code', i), t)} />
              <span className="text-[15px] font-bold">{fmt(v('temperature_2m', i))}°</span>
              <span className={`text-[11px] ${(p ?? 0) >= 50 ? 'font-semibold text-lagoon' : 'text-muted'}`}>{fmt(p)}%</span>
              <span className="text-[11px] text-muted">{mm != null && mm > 0 ? `${fmt(mm, 1)} mm` : '·'}</span>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

function NearbyRivers({ station }: { station: Station }) {
  const { rivers } = useRivers()
  const { t, lang } = useT()
  const near = riversNear(station, 45)
  return (
    <section className="rounded-xl border border-line bg-surface p-4">
      <h2 className="flex items-center gap-1.5 text-[15px] font-semibold"><Waves className="size-4 text-lagoon" aria-hidden /> {t('place.nearbyRivers')}</h2>
      {near.length === 0 ? (
        <p className="mt-1 text-sm text-muted">{rich(t('place.noRivers'), { place: placeName(station, lang), link: <Link to="/rivers" className="text-lagoon underline">{t('place.riversLink')}</Link> })}</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {near.map(({ point, km }) => {
            const r = rivers?.find((x) => x.point.id === point.id)
            const lv = r ? RIVER_LEVELS[r.level] : undefined
            const n = riverNames(point, lang)
            return (
              <li key={point.id}>
                <Link to={`/rivers/${point.id}`} className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-sunken">
                  <span className="min-w-0"><b className="font-semibold">{t('river.at', n)}</b> <span className="text-muted">· {t('common.km', { n: Math.round(km) })}</span></span>
                  {lv ? (
                    <span className="shrink-0 rounded-md px-1.5 py-0.5 text-xs font-semibold" style={{ background: lv.color, color: inkOn(lv.color) }}>{fmt(r!.today)} m³/s · {riverLevelText(r!.level, t)}</span>
                  ) : <Skeleton className="h-5 w-24" />}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function EmbedCode({ station }: { station: Station }) {
  const { t, lang } = useT()
  const name = placeName(station, lang)
  const src = `${location.origin}/embed/${station.id}${lang === 'en' ? '' : `?lang=${lang}`}`
  const code = `<iframe src="${src}" width="320" height="180" style="border:0" title="${t('place.embedFrame', { place: name })}" loading="lazy"></iframe>`
  const [copied, setCopied] = useState(false)
  return (
    <section className="grid gap-4 rounded-xl border border-line bg-surface p-4 md:grid-cols-[1fr_auto]">
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold">{t('place.embedTitle', { place: name })}</h2>
        <p className="mt-1 text-sm text-muted">{rich(t('place.embedDesc'), { dark: <code>?theme=dark</code>, light: <code>?theme=light</code>, lang: <code>?lang=si</code> })}</p>
        <textarea readOnly value={code} rows={3} onFocus={(e) => e.target.select()} className="mt-2 w-full rounded-lg border border-line bg-sunken p-2 font-mono text-xs" />
        <button
          onClick={async () => { try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { /* select and copy by hand */ } }}
          className="mt-2 rounded-lg bg-lagoon px-3 py-1.5 text-sm font-semibold text-canvas hover:brightness-110"
        >
          {copied ? t('common.copied') : t('place.embedCopy')}
        </button>
      </div>
      <iframe src={src} width={320} height={180} className="rounded-xl border-0" title={t('place.embedPreview', { place: name })} loading="lazy" />
    </section>
  )
}

function DailyStrip({ data }: { data?: Wx }) {
  const { t, locale } = useT()
  if (!data?.daily) return <Skeleton className="h-28" />
  const time = data.daily.time as string[]
  const today = colomboToday()
  const start = Math.max(0, time.indexOf(today))
  const days = time.slice(start, start + 7)
  const v = (k: string, i: number) => series(data.daily, k)[start + i]
  const sun = (k: string, i: number) => String((data.daily?.[k] as string[] | undefined)?.[start + i] ?? '').slice(11, 16)
  return (
    <section aria-label={t('place.daily')} className="overflow-x-auto rounded-xl border border-line bg-surface">
      {/* Scrolls sideways on phones; each day lays itself out by its own width (container queries). */}
      <ol className="grid min-w-[728px] grid-cols-7 divide-x divide-line">
        {days.map((d, i) => (
          <li key={d} className="@container min-w-0 p-3 text-sm">
            <div className="font-semibold">{i === 0 ? t('common.today') : dayName(d, locale)} <span className="font-normal text-muted">{dayMonth(d, locale)}</span></div>
            {/* Icon above its words in a narrow day, beside them where there's room. */}
            <div className="mt-1 flex min-h-12 flex-col items-start gap-0.5 @min-[8rem]:flex-row @min-[8rem]:items-center @min-[8rem]:gap-1.5">
              <WeatherIcon code={v('weather_code', i)} className="size-9 shrink-0" />
              <span className="max-w-full text-xs leading-tight break-words text-muted">{weatherText(v('weather_code', i), t)}</span>
            </div>
            <div className="text-lg font-bold">{fmt(v('temperature_2m_max', i))}° <span className="text-sm font-medium text-muted">{fmt(v('temperature_2m_min', i))}°</span></div>
            <div className="text-xs"><span className="font-semibold text-lagoon">{fmt(v('precipitation_sum', i), 1)} mm</span> <span className="text-muted">· {fmt(v('precipitation_probability_max', i))}%</span></div>
            <div className="text-[11px] text-muted">{t('place.dailySub', { uv: fmt(v('uv_index_max', i)), g: fmt(v('wind_gusts_10m_max', i)) })}</div>
            {/* Side by side where the column is wide enough, one under the other on phones. */}
            <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] tabular-nums text-muted">
              <span className="inline-flex items-center gap-0.5 whitespace-nowrap"><Sunrise className="size-3 shrink-0" aria-label={t('place.sunrise')} />{sun('sunrise', i)}</span>
              <span className="inline-flex items-center gap-0.5 whitespace-nowrap"><Sunset className="size-3 shrink-0" aria-label={t('place.sunset')} />{sun('sunset', i)}</span>
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
  const { t: tr, lang, locale } = useT()
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
        markLine: mean != null ? { silent: true, symbol: 'none', data: [{ yAxis: Math.round(mean) }], lineStyle: { color: t.ink, type: 'dashed', opacity: 0.6 }, label: { formatter: tr('chart.decadeMean'), color: t.muted, fontSize: 10, position: 'insideEndTop' } } : undefined,
      }],
    }
    return { thisYear, mean, option }
  }, [q.data, start, end, theme, lang]) // eslint-disable-line react-hooks/exhaustive-deps

  const pct = result?.thisYear && result.mean ? Math.round((result.thisYear.total / result.mean) * 100) : null
  return (
    <ChartCard
      title={tr('climate.title')}
      sub={tr('climate.sub', { from: dayMonth(start, locale), to: dayMonth(end, locale) })}
      option={result?.option}
      loading={q.isLoading}
      file={`${stationId}-rain-anomaly`}
    >
      {q.error ? <div className="mt-2"><SourceProblem error={q.error} onRetry={() => q.refetch()} /></div> : null}
      {pct != null && (
        <p className="mt-2 text-sm">
          {rich(tr('climate.result'), {
            mm: <b className="font-semibold">{fmt(result!.thisYear!.total)}</b>,
            pct: <b className={`font-semibold ${pct >= 130 ? 'text-lagoon' : pct <= 70 ? 'text-thambili' : ''}`}>{pct}</b>,
            mean: fmt(result!.mean),
          })}
          {tr(pct >= 130 ? 'climate.wetter' : pct <= 70 ? 'climate.drier' : 'climate.normal')}
        </p>
      )}
    </ChartCard>
  )
}

function Solar({ stationId }: { stationId: string }) {
  const st = stationById(stationId)!
  const theme = useSettings((s) => s.theme)
  const { t: tr, lang, locale } = useT()
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
        { name: tr('series.allSky'), type: 'bar', data: keys.map((k) => [toIso(k), all[k]]), color: t.thambili },
        { name: tr('series.clearSky'), data: keys.filter((k) => clr[k] > -900).map((k) => [toIso(k), clr[k]]), color: t.muted, dashed: true, width: 1.5 },
      ], { unit: 'kWh/m²', yMin0: true, decimals: 2 }),
    }
  }, [q.data, theme, lang]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ChartCard
      title={tr('solar.title')}
      sub={tr('solar.sub')}
      option={res?.option}
      loading={q.isLoading}
      file={`${stationId}-solar`}
    >
      {q.error ? <div className="mt-2"><SourceProblem error={q.error} onRetry={() => q.refetch()} /></div> : null}
      {res?.avg != null && (
        <p className="mt-2 text-sm">
          {rich(tr('solar.result'), { kwh: <b className="font-semibold">{fmt(res.avg, 1)}</b>, kw: fmt(res.avg * 0.8, 1) })}
          {res.last && <span className="text-muted"> {tr('solar.latest', { d: dayMonth(`${res.last.slice(0, 4)}-${res.last.slice(4, 6)}-${res.last.slice(6, 8)}`, locale) })}</span>}
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
