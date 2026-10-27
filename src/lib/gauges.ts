// Irrigation Department river gauges. The department publishes hourly water levels and
// rainfall from its hydrometric stations as public ArcGIS Online feature services; these are
// the layers behind its "Realtime Water Level in Major River" dashboard.
import { fetchJson, SourceError } from './api'
import type { FeatureCollection } from 'geojson'

const BASE = 'https://services3.arcgis.com/J7ZFXmR8rSmQ3FGf/arcgis/rest/services'
export const GAUGE_SERVICES = {
  readings: `${BASE}/gauges_2_view/FeatureServer/0`,
  stations: `${BASE}/hydrostations/FeatureServer/0`,
  basins: `${BASE}/river_basins/FeatureServer/0`,
  rivers: `${BASE}/rivers/FeatureServer/0`,
  floodMap: `${BASE}/Flood_Map/FeatureServer`,
}
export const OFFICIAL_DASHBOARD = 'https://www.arcgis.com/apps/dashboards/2cffe83c9ff5497d97375498bdf3ff38'
const SOURCE = 'Irrigation Department (ArcGIS)'

// "Flood Inundation Area" layers of the department's flood map, one per mapped basin.
export const FLOOD_AREA_LAYERS = [2, 7, 12, 17, 22, 27, 32, 37, 42, 47, 52, 57, 62, 67, 72, 77, 82]

// The department's own dashboard leaves these out: Calidonia is a test gauge, Kala Oya has no feed.
const EXCLUDE_GAUGES = "gauge <> 'Calidonia'"
const EXCLUDE_STATIONS = "station <> 'Calidonia' AND basin <> 'Kala Oya'"
/** Gauges that report rainfall only. */
export const RAIN_ONLY = new Set(['Ampara'])

export type GaugeLevel = 'normal' | 'alert' | 'minor' | 'major'
export const GAUGE_LEVEL_ORDER: GaugeLevel[] = ['normal', 'alert', 'minor', 'major']
// Same colours as the department's dashboard: yellow alert, orange minor flood, red major flood.
export const GAUGE_LEVELS: Record<GaugeLevel, { color: string }> = {
  normal: { color: '#2f8f6b' },
  alert: { color: '#e6d70f' },
  minor: { color: '#f08a0e' },
  major: { color: '#d7263d' },
}

export interface Thresholds { alert: number | null; minor: number | null; major: number | null }

export interface GaugeObs {
  time: number
  level: number | null
  rain: number | null
}

export interface GaugeStation {
  id: string
  name: string
  basin: string
  lat: number | null
  lon: number | null
  unit: 'm' | 'ft'
  rainOnly: boolean
  thresholds: Thresholds
  /** Readings in time order, oldest first. */
  series: GaugeObs[]
  latest?: GaugeObs
  level: GaugeLevel
  /** Change since the previous reading, in the gauge's unit. */
  change: number | null
  trend: 'up' | 'down' | 'steady' | null
  /** Rain in the hour up to now and the past 24 hours, mm. */
  rain1h: number | null
  rain24h: number | null
  /** Highest status reached in the window, with its reading. */
  peak?: { level: GaugeLevel; obs: GaugeObs }
  /** No reading in the last {STALE_HOURS} hours. */
  stale: boolean
}

export const STALE_HOURS = 3
const H = 3_600_000

export const slug = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
/** Nagalagam Street (Colombo) is read in feet; every other gauge in metres. */
export const gaugeUnit = (name: string): 'm' | 'ft' => (/^nagalagam/i.test(name.trim()) ? 'ft' : 'm')

const num = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? x : null)
const thr = (x: unknown) => { const v = num(x); return v != null && v > 0 ? v : null }

/** Status from a level and the gauge's thresholds; a level at a threshold counts as reaching it. */
export function gaugeLevel(level: number | null | undefined, t: Thresholds): GaugeLevel {
  if (level == null) return 'normal'
  if (t.major != null && level >= t.major) return 'major'
  if (t.minor != null && level >= t.minor) return 'minor'
  if (t.alert != null && level >= t.alert) return 'alert'
  return 'normal'
}

const rank = (l: GaugeLevel) => GAUGE_LEVEL_ORDER.indexOf(l)

// ---------- ArcGIS REST ----------

interface ArcResponse<A> {
  features?: { attributes: A }[]
  exceededTransferLimit?: boolean
  error?: { code: number; message: string; details?: string[] }
}

const q = (p: Record<string, string | number>) => Object.entries(p).map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&')

export function queryUrl(layer: string, p: Record<string, string | number>) {
  return `${layer}/query?${q({ f: 'json', returnGeometry: 'false', ...p })}`
}

/**
 * Pages through a query. The gauge layers return at most 1000 rows per call (four days is
 * ~3,700 rows) and may cap a page below what was asked, so the offset moves by rows received.
 */
async function queryAll<A>(layer: string, p: Record<string, string | number>, signal?: AbortSignal, pageSize = 1000, maxPages = 10): Promise<A[]> {
  const out: A[] = []
  for (let page = 0; page < maxPages; page++) {
    const res = await fetchJson<ArcResponse<A>>(SOURCE, queryUrl(layer, { ...p, resultOffset: out.length, resultRecordCount: pageSize }), signal)
    if (res.error) throw new SourceError(SOURCE, res.error.message || `ArcGIS error ${res.error.code}`, res.error.code)
    for (const f of res.features ?? []) out.push(f.attributes)
    if (!res.exceededTransferLimit || !res.features?.length) break
  }
  return out
}

export interface RawReading {
  gauge?: string
  basin?: string
  water_level?: number | null
  rain_fall?: number | null
  alertpull?: number | null
  minorpull?: number | null
  majorpull?: number | null
  CreationDate?: number
}
export interface RawStation { station?: string; basin?: string; latitude?: number; longitude?: number }

export function fetchGaugeReadings(days = 4, signal?: AbortSignal) {
  return queryAll<RawReading>(GAUGE_SERVICES.readings, {
    where: `(CreationDate BETWEEN CURRENT_TIMESTAMP - ${days} AND CURRENT_TIMESTAMP) AND ${EXCLUDE_GAUGES}`,
    outFields: 'gauge,basin,water_level,rain_fall,alertpull,minorpull,majorpull,CreationDate',
    orderByFields: 'CreationDate ASC',
  }, signal)
}

export function fetchGaugeStations(signal?: AbortSignal) {
  return queryAll<RawStation>(GAUGE_SERVICES.stations, {
    where: EXCLUDE_STATIONS,
    outFields: 'station,basin,latitude,longitude',
    orderByFields: 'basin ASC, station ASC',
  }, signal)
}

/** A layer as GeoJSON in WGS84, simplified for an island-scale map and paged past the layer's row cap. */
export async function fetchGeoLayer(layer: string, where = '1=1', outFields = '*', signal?: AbortSignal): Promise<FeatureCollection> {
  type Page = FeatureCollection & { error?: { code: number; message: string }; properties?: { exceededTransferLimit?: boolean } }
  const features: FeatureCollection['features'] = []
  for (let page = 0; page < 6; page++) {
    const url = `${layer}/query?${q({ f: 'geojson', where, outFields, outSR: 4326, maxAllowableOffset: 0.003, geometryPrecision: 4, resultOffset: features.length })}`
    const res = await fetchJson<Page>(SOURCE, url, signal, 30000)
    if (res.error) throw new SourceError(SOURCE, res.error.message, res.error.code)
    features.push(...(res.features ?? []))
    if (!res.properties?.exceededTransferLimit || !res.features?.length) break
  }
  return { type: 'FeatureCollection', features }
}

export async function fetchFloodAreas(signal?: AbortSignal): Promise<FeatureCollection> {
  const parts = await Promise.allSettled(FLOOD_AREA_LAYERS.map((id) => fetchGeoLayer(`${GAUGE_SERVICES.floodMap}/${id}`, '1=1', 'OBJECTID', signal)))
  const ok = parts.filter((p): p is PromiseFulfilledResult<FeatureCollection> => p.status === 'fulfilled')
  if (!ok.length) throw (parts[0] as PromiseRejectedResult | undefined)?.reason ?? new SourceError(SOURCE, 'No flood map layers')
  return { type: 'FeatureCollection', features: ok.flatMap((p) => p.value.features) }
}

// ---------- Shaping ----------

/** Joins station positions with readings; gauges with readings but no listed position are kept without one. */
export function buildGauges(stations: RawStation[], readings: RawReading[], now = Date.now()): GaugeStation[] {
  const byName = new Map<string, GaugeStation>()
  const make = (name: string, basin: string, lat: number | null, lon: number | null): GaugeStation => ({
    id: slug(name), name, basin, lat, lon, unit: gaugeUnit(name), rainOnly: RAIN_ONLY.has(name),
    thresholds: { alert: null, minor: null, major: null }, series: [], level: 'normal', change: null, trend: null,
    rain1h: null, rain24h: null, stale: true,
  })
  for (const s of stations) {
    const name = s.station?.trim()
    if (!name || byName.has(name.toLowerCase())) continue
    byName.set(name.toLowerCase(), make(name, s.basin?.trim() ?? '', num(s.latitude), num(s.longitude)))
  }
  for (const r of readings) {
    const name = r.gauge?.trim()
    const time = num(r.CreationDate)
    if (!name || time == null || time > now + H) continue
    let g = byName.get(name.toLowerCase())
    if (!g) { g = make(name, r.basin?.trim() ?? '', null, null); byName.set(name.toLowerCase(), g) }
    if (!g.basin && r.basin) g.basin = r.basin.trim()
    // Thresholds ride on every reading; the most recent non-empty one wins.
    const t = { alert: thr(r.alertpull), minor: thr(r.minorpull), major: thr(r.majorpull) }
    if (t.alert ?? t.minor ?? t.major) g.thresholds = t
    g.series.push({ time, level: g.rainOnly ? null : num(r.water_level), rain: num(r.rain_fall) })
  }
  for (const g of byName.values()) finish(g, now)
  return [...byName.values()].sort((a, b) => rank(b.level) - rank(a.level) || a.basin.localeCompare(b.basin) || a.name.localeCompare(b.name))
}

function finish(g: GaugeStation, now: number) {
  g.series.sort((a, b) => a.time - b.time)
  // One reading per timestamp: later rows are corrections.
  g.series = g.series.filter((o, i, s) => i === s.length - 1 || s[i + 1].time !== o.time)
  const withLevel = g.series.filter((o) => o.level != null)
  g.latest = g.series.at(-1)
  const last = withLevel.at(-1)
  const prev = withLevel.at(-2)
  g.stale = !g.latest || now - g.latest.time > STALE_HOURS * H
  g.level = last && !g.stale ? gaugeLevel(last.level, g.thresholds) : 'normal'
  g.change = last && prev ? round(last.level! - prev.level!) : null
  g.trend = g.change == null ? null : Math.abs(g.change) < 0.005 ? 'steady' : g.change > 0 ? 'up' : 'down'
  const rainSince = (ms: number) => {
    const xs = g.series.filter((o) => o.time > now - ms && o.rain != null)
    return xs.length ? round(xs.reduce((a, o) => a + o.rain!, 0)) : null
  }
  g.rain1h = rainSince(H)
  g.rain24h = rainSince(24 * H)
  let peak: GaugeStation['peak']
  for (const o of withLevel) {
    const l = gaugeLevel(o.level, g.thresholds)
    if (!peak || rank(l) > rank(peak.level) || (l === peak.level && o.level! > peak.obs.level!)) peak = { level: l, obs: o }
  }
  g.peak = peak
}

const round = (x: number) => Math.round(x * 100) / 100

/** The department's headline counts: stations, and gauges at each level in the last two hours. */
export function gaugeSummary(gauges: GaugeStation[], now = Date.now()) {
  const recent = gauges.filter((g) => g.latest && now - g.latest.time <= 2 * H)
  const at = (l: GaugeLevel) => recent.filter((g) => g.level === l).length
  return { stations: gauges.filter((g) => g.lat != null).length || gauges.length, reporting: recent.length, alert: at('alert'), minor: at('minor'), major: at('major') }
}

/** Rain by Sri Lanka calendar day. */
export function dailyRain(series: GaugeObs[]) {
  const m = new Map<string, number>()
  for (const o of series) {
    if (o.rain == null) continue
    const d = new Date(o.time).toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' })
    m.set(d, round((m.get(d) ?? 0) + o.rain))
  }
  return [...m.entries()]
}

export const basinsOf = (gauges: GaugeStation[]) => [...new Set(gauges.map((g) => g.basin).filter(Boolean))].sort((a, b) => a.localeCompare(b))
