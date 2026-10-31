// The public LankaTwin API: static files under /api/v1/, rebuilt every hour by the deploy
// workflow (scripts/static-api.ts). This module turns readings into the published shapes and
// holds no network code, so the same functions run in tests, in the build and in the docs page.
import { buildAlerts, RULES, type Alert } from './alerts'
import { FLOOD_LEVELS, FLOOD_RAIN_CAP, FLOOD_RIVER_KM, FLOOD_WEIGHTS, nearestRiver } from './flood'
import { GAUGE_LEVEL_ORDER, gaugeSummary, STALE_HOURS, type GaugeStation, type GaugeObs } from './gauges'
import { bandFor, METRICS, weatherText } from './metrics'
import { riversNear, STATIONS, RIVER_POINTS, type RiverPoint, type Station } from './places'
import type { RiverReading, StationReading } from './readings'
import { SOURCES } from './sources'
import { tFor, type Lang } from '../i18n/core'

export const API_VERSION = '1.0.0'
export const API_BASE_PATH = '/api/v1'
/** How often the deploy workflow rebuilds the API, minutes. */
export const API_REFRESH_MINUTES = 60
export const API_DISCLAIMER =
  'Indicative data from global models and the Irrigation Department’s public gauge feed, screened by LankaTwin. ' +
  'Not an official warning: follow the Department of Meteorology, the Disaster Management Centre (117) and the Irrigation Department.'

/** Upstream feeds the build reads; an endpoint lists the ones it depends on. */
export type Feed = 'weather' | 'air' | 'rivers' | 'gauges'
export const FEEDS: Record<Feed, { name: string; sources: string[] }> = {
  // Forecast answers carry each town's ground elevation from the Copernicus DEM.
  weather: { name: 'Open-Meteo Forecast', sources: ['forecast', 'elevation'] },
  air: { name: 'Open-Meteo Air Quality (CAMS)', sources: ['air'] },
  rivers: { name: 'Open-Meteo Flood (GloFAS)', sources: ['flood'] },
  gauges: { name: 'Irrigation Department river gauges (ArcGIS)', sources: ['irrigation'] },
}

export interface SourceRef { id: string; name: string; provider: string; license: string; url: string }

export interface Envelope<T> {
  api: { name: string; version: string; docs: string; self: string }
  generated_at: string
  /** When the next hourly rebuild is due; clients should not poll faster. */
  next_update: string
  /** True when an upstream feed failed and this file still carries the previous build's data. */
  stale: boolean
  /** Feeds that failed in this build; the data is complete without them unless `stale`. */
  missing: Feed[]
  sources: SourceRef[]
  license: string
  disclaimer: string
  data: T
}

const sourceRef = (id: string): SourceRef | undefined => {
  const s = SOURCES.find((x) => x.id === id)
  return s && { id: s.id, name: s.name, provider: s.provider, license: s.license, url: s.url }
}

export function envelope<T>(site: string, path: string, data: T, opts: { now: Date; feeds: Feed[]; missing?: Feed[]; stale?: boolean }): Envelope<T> {
  const sources = [...new Set(opts.feeds.flatMap((f) => FEEDS[f].sources))].map(sourceRef).filter((s): s is SourceRef => !!s)
  return {
    api: { name: 'LankaTwin API', version: API_VERSION, docs: `${site}/developers`, self: `${site}${API_BASE_PATH}/${path}` },
    generated_at: opts.now.toISOString(),
    next_update: new Date(opts.now.getTime() + API_REFRESH_MINUTES * 60_000).toISOString(),
    stale: opts.stale ?? false,
    missing: opts.missing ?? [],
    sources,
    license: 'Data: CC BY 4.0 where the source allows (see `sources`); please credit LankaTwin and each source. Code: MIT.',
    disclaimer: API_DISCLAIMER,
    data,
  }
}

// ---------- Small helpers ----------

const r1 = (x: number | null | undefined, d = 1) => (x == null || !Number.isFinite(x) ? null : Math.round(x * 10 ** d) / 10 ** d)
const names = (s: Station) => ({ en: s.name, si: s.si, ta: s.ta })
const LANGS: Lang[] = ['en', 'si', 'ta']
/** Open-Meteo local times ("2026-10-31T11:45") carry no zone; Sri Lanka is UTC+05:30 all year. */
export const localToIso = (t: string | null | undefined) => (t && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(t) ? `${t}:00+05:30` : t || null)
const iso = (ms: number | null | undefined) => (ms == null ? null : new Date(ms).toISOString())

/**
 * Text from upstream feeds, made safe to drop into HTML, CSV or a terminal by careless clients:
 * no control characters, no angle brackets, bounded length.
 */
// eslint-disable-next-line no-control-regex
export const cleanText = (s: string | null | undefined, max = 120) => (s ?? '').replace(/[\u0000-\u001f\u007f-\u009f<>]/g, '').trim().slice(0, max)

// ---------- Places ----------

export const placeMeta = (s: Station) => ({
  id: s.id, name: s.name, names: names(s), district: s.district, province: s.province,
  lat: s.lat, lon: s.lon, zone: s.zone,
  url: `/station/${s.id}`,
})

export function weatherOf(r: StationReading) {
  const v = r.values
  return {
    time: localToIso(r.time),
    elevation_m: r.elevation,
    temperature_c: r1(v.temp),
    feels_like_c: r1(v.feels),
    humidity_pct: r1(v.humidity, 0),
    rain_past_24h_mm: r1(v.rain24),
    rain_next_24h_mm: r1(v.rainNext24),
    rain_probability_next_24h_pct: r1(r.rainProbNext24, 0),
    weather_code: r.weatherCode,
    weather: r.weatherCode == null ? null : weatherText(r.weatherCode, tFor('en')),
    is_day: r.isDay,
    wind_speed_kmh: r1(r.windSpeed),
    wind_direction_deg: r1(r.windDir, 0),
    wind_gust_kmh: r1(v.gust),
    cloud_cover_pct: r1(r.cloud, 0),
    pressure_hpa: r1(r.pressure),
    today: {
      temperature_max_c: r1(r.tMax),
      temperature_min_c: r1(r.tMin),
      feels_like_max_c: r1(r.feelsMaxToday),
      feels_like_max_tomorrow_c: r1(r.feelsMaxTomorrow),
      wind_gust_max_kmh: r1(r.gustMaxToday),
      uv_index_max: r1(r.uvMax),
    },
  }
}

export function airOf(r: StationReading) {
  const a = r.air
  if (!a) return null
  return {
    time: localToIso(a.time),
    us_aqi: r1(a.aqi, 0),
    category: a.aqi == null ? null : bandFor(METRICS.aqi, a.aqi),
    pm2_5_ugm3: r1(a.pm25),
    pm10_ugm3: r1(a.pm10),
    ozone_ugm3: r1(a.ozone),
    no2_ugm3: r1(a.no2),
    dust_ugm3: r1(a.dust),
    uv_index: r1(a.uv),
  }
}

export function floodOf(r: StationReading, rivers?: RiverReading[]) {
  if (!r.flood) return null
  const near = nearestRiver(r.station, rivers)
  return {
    score: r.flood.score,
    level: r.flood.level,
    parts: r.flood.parts,
    inputs: {
      rain_past_24h_mm: r1(r.values.rain24),
      rain_next_24h_mm: r1(r.values.rainNext24),
      river: near ? { id: near.point.id, km: r1(near.km), ratio: r1(near.reading?.ratio ?? null, 2) } : null,
      elevation_m: r.elevation,
    },
  }
}

// ---------- Rivers (GloFAS) ----------

export const riverMeta = (p: RiverPoint) => ({
  id: p.id, river: p.river, near: p.near, basin: p.basin,
  names: { en: { river: p.river, near: p.near, basin: p.basin }, si: { river: p.si[0], near: p.si[1], basin: p.si[2] }, ta: { river: p.ta[0], near: p.ta[1], basin: p.ta[2] } },
  lat: p.lat, lon: p.lon, url: `/rivers/${p.id}`,
})

export const riverOf = (r: RiverReading) => ({
  ...riverMeta(r.point),
  date: r.time[r.todayIndex] ?? null,
  discharge_today_m3s: r1(r.today),
  median_30d_m3s: r1(r.median),
  peak_10d_m3s: r1(r.peak),
  peak_date: r.peakDate,
  ensemble_max_peak_m3s: r1(r.ensembleMaxPeak),
  ratio: r1(r.ratio, 2),
  level: r.level,
})

export const riverDetail = (r: RiverReading) => ({
  ...riverOf(r),
  series: r.time.map((date, i) => ({ date, discharge_m3s: r1(r.discharge[i]), ensemble_max_m3s: r1(r.ensembleMax[i]), forecast: i > r.todayIndex })),
})

// ---------- Gauges (Irrigation Department) ----------

const obs = (o: GaugeObs | undefined) => (o ? { time: iso(o.time), level: r1(o.level, 2), rain_mm: r1(o.rain) } : null)

export const gaugeOf = (g: GaugeStation) => ({
  id: g.id,
  name: cleanText(g.name, 80),
  basin: cleanText(g.basin, 80),
  lat: g.lat, lon: g.lon,
  unit: g.unit,
  rain_only: g.rainOnly,
  thresholds: g.thresholds,
  status: g.level,
  stale: g.stale,
  latest: obs(g.latest),
  change: g.change,
  trend: g.trend,
  rain_1h_mm: g.rain1h,
  rain_24h_mm: g.rain24h,
  peak: g.peak ? { status: g.peak.level, ...obs(g.peak.obs)! } : null,
  url: `/gauges/${g.id}`,
})

export const gaugeDetail = (g: GaugeStation) => ({ ...gaugeOf(g), series: g.series.map((o) => obs(o)!) })

// ---------- Alerts ----------

/** Signals in all three languages, keyed by the same ids the app uses. */
export function alertsOf(readings?: StationReading[], rivers?: RiverReading[], gauges?: GaugeStation[]) {
  const by: Record<Lang, Alert[]> = { en: [], si: [], ta: [] }
  for (const l of LANGS) by[l] = buildAlerts(readings, rivers, l, gauges)
  return by.en.map((a, i) => {
    const pick = (k: 'title' | 'detail' | 'place') => Object.fromEntries(LANGS.map((l) => [l, cleanText(by[l][i]?.[k] ?? a[k], 300)])) as Record<Lang, string>
    const placeId = a.href.startsWith('/station/') ? a.href.slice(9) : null
    return { id: a.id, level: a.level, kind: a.kind, place_id: placeId, place: pick('place'), title: pick('title'), detail: pick('detail'), url: a.href }
  })
}
export type ApiAlert = ReturnType<typeof alertsOf>[number]

// ---------- Island snapshot ----------

function extreme(readings: StationReading[], pick: (r: StationReading) => number | null | undefined, dir: 1 | -1) {
  let best: StationReading | undefined
  let bv = -Infinity
  for (const r of readings) {
    const v = pick(r)
    if (v == null || !Number.isFinite(v)) continue
    if (dir * v > bv) { bv = dir * v; best = r }
  }
  return best ? { id: best.station.id, name: best.station.name, value: r1(dir * bv) } : null
}

export function snapshotOf(readings: StationReading[] | undefined, rivers: RiverReading[] | undefined, gauges: GaugeStation[] | undefined, alerts: ApiAlert[], now = Date.now()) {
  const rs = readings ?? []
  const count = <K extends string>(xs: K[]) => xs.reduce<Record<string, number>>((m, k) => ((m[k] = (m[k] ?? 0) + 1), m), {})
  return {
    places: rs.length,
    hottest: extreme(rs, (r) => r.values.temp, 1),
    coolest: extreme(rs, (r) => r.values.temp, -1),
    highest_feels_like: extreme(rs, (r) => r.values.feels, 1),
    wettest_past_24h: extreme(rs, (r) => r.values.rain24, 1),
    wettest_next_24h: extreme(rs, (r) => r.values.rainNext24, 1),
    strongest_gust: extreme(rs, (r) => r.values.gust, 1),
    worst_air: extreme(rs, (r) => r.values.aqi, 1),
    highest_flood_risk: extreme(rs, (r) => r.flood?.score, 1),
    flood_risk_levels: count(rs.map((r) => r.flood?.level ?? 'low')),
    rivers: rivers ? count(rivers.map((r) => r.level)) : null,
    gauges: gauges ? gaugeSummary(gauges, now) : null,
    alerts: { total: alerts.length, warning: alerts.filter((a) => a.level === 'warning').length, watch: alerts.filter((a) => a.level === 'watch').length },
  }
}

// ---------- One place, everything ----------

export function placeDetail(r: StationReading, rivers: RiverReading[] | undefined, alerts: ApiAlert[]) {
  return {
    place: placeMeta(r.station),
    weather: weatherOf(r),
    air: airOf(r),
    flood_risk: floodOf(r, rivers),
    rivers_nearby: riversNear(r.station, 45).map(({ point, km }) => {
      const rd = rivers?.find((x) => x.point.id === point.id)
      return { id: point.id, river: point.river, near: point.near, km: r1(km), level: rd?.level ?? null, ratio: r1(rd?.ratio ?? null, 2) }
    }),
    alerts: alerts.filter((a) => a.place_id === r.station.id),
  }
}

// ---------- Methodology ----------

export const methodology = () => ({
  alert_rules: {
    rain_24h_mm: RULES.rain, apparent_temperature_c: RULES.heat, wind_gust_kmh: RULES.gust,
    us_aqi: RULES.aqi, flood_risk_score: RULES.flood, weather_code: RULES.storm,
    note: 'A value at or above `watch` raises a watch; at or above `warning`, a warning. River and gauge signals follow their own levels below.',
  },
  flood_risk: {
    weights: FLOOD_WEIGHTS, rain_cap_mm: FLOOD_RAIN_CAP, river_search_km: FLOOD_RIVER_KM,
    levels: Object.fromEntries(Object.entries(FLOOD_LEVELS).map(([k, v]) => [k, { min_score: v.min }])),
  },
  river_levels: { ratio: 'forecast 10-day peak ÷ 30-day median discharge', elevated: 1.8, high: 3, 'very-high': 5 },
  gauge_levels: { order: GAUGE_LEVEL_ORDER, stale_after_hours: STALE_HOURS, note: 'Thresholds come with each gauge reading from the Irrigation Department.' },
  aqi_bands: METRICS.aqi.steps.map(([max, , label]) => ({ below: Number.isFinite(max) ? max : null, label })),
})

export const sourcesList = () => SOURCES.map((s) => ({ id: s.id, name: s.name, provider: s.provider, status: s.status, provides: s.provides, refresh: s.refresh, resolution: s.resolution, license: s.license, url: s.url }))

// ---------- Other formats ----------

/** RFC 4180 CSV. Cells that a spreadsheet would run as a formula get a leading apostrophe. */
export function toCsv(rows: Record<string, unknown>[], columns?: string[]) {
  const cols = columns ?? [...new Set(rows.flatMap((r) => Object.keys(r)))]
  const cell = (v: unknown) => {
    if (v == null) return ''
    let s = typeof v === 'object' ? JSON.stringify(v) : String(v)
    if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = `'${s}`
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [cols.join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\r\n') + '\r\n'
}

/** Flattens nested objects one level: { today: { a: 1 } } → { today_a: 1 }. */
export const flat = (o: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.entries(v as Record<string, unknown>).map(([k2, v2]) => [`${k}_${k2}`, v2]) : [[k, v]])))

export function geojson<T extends { lat: number | null; lon: number | null }>(items: T[]) {
  return {
    type: 'FeatureCollection' as const,
    features: items.filter((x) => x.lat != null && x.lon != null).map(({ lat, lon, ...props }) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [lon!, lat!] },
      properties: props,
    })),
  }
}

const xml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Atom feed of the current signals, for feed readers and simple integrations. */
export function alertsAtom(site: string, alerts: ApiAlert[], now: Date, lang: Lang = 'en') {
  const updated = now.toISOString()
  const feedUrl = `${site}${API_BASE_PATH}/alerts${lang === 'en' ? '' : `.${lang}`}.atom`
  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="${lang}">
  <title>${xml(tFor(lang)('alerts.feedTitle'))}</title>
  <subtitle>${xml(API_DISCLAIMER)}</subtitle>
  <id>${feedUrl}</id>
  <link rel="self" type="application/atom+xml" href="${feedUrl}"/>
  <link rel="alternate" type="text/html" href="${site}/alerts"/>
  <updated>${updated}</updated>
  <author><name>LankaTwin</name><uri>${site}/</uri></author>
${alerts.map((a) => `  <entry>
    <title>${xml(`${a.place[lang]}: ${a.title[lang]}`)}</title>
    <id>${site}/alerts#${xml(a.id)}-${updated.slice(0, 13)}</id>
    <link rel="alternate" type="text/html" href="${site}${xml(a.url)}"/>
    <updated>${updated}</updated>
    <category term="${a.level}"/>
    <category term="${a.kind}"/>
    <summary>${xml(a.detail[lang])}</summary>
  </entry>`).join('\n')}
</feed>
`
}

export { STATIONS as API_PLACES, RIVER_POINTS as API_RIVERS }
