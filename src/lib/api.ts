// Thin client-side connectors. Every source here is public, keyless and CORS-enabled.
import type { RiverPoint, Station } from './places'

const TZ = 'Asia/Colombo'

export class SourceError extends Error {
  constructor(public source: string, message: string, public status?: number, public code?: 'timeout' | 'network') {
    super(message)
  }
}

export async function fetchJson<T>(source: string, url: string, signal?: AbortSignal, timeoutMs = 20000): Promise<T> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  signal?.addEventListener('abort', () => ctrl.abort())
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    if (!res.ok) {
      let reason = `${res.status} ${res.statusText}`
      try {
        const body = await res.json()
        if (body?.reason) reason = body.reason
      } catch { /* not JSON */ }
      throw new SourceError(source, reason, res.status)
    }
    return (await res.json()) as T
  } catch (e) {
    if (e instanceof SourceError) throw e
    if ((e as Error).name === 'AbortError') throw new SourceError(source, 'The request timed out', undefined, 'timeout')
    throw new SourceError(source, 'Network unreachable or blocked', undefined, 'network')
  } finally {
    clearTimeout(timer)
  }
}

const qs = (p: Record<string, string | number | undefined>) =>
  Object.entries(p)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&')

const coords = (pts: { lat: number; lon: number }[]) => ({
  latitude: pts.map((p) => p.lat.toFixed(4)).join(','),
  longitude: pts.map((p) => p.lon.toFixed(4)).join(','),
})

/** Open-Meteo returns an object for one location and an array for several. */
const asArray = <T,>(x: T | T[]): T[] => (Array.isArray(x) ? x : [x])

// ---------- Open-Meteo forecast (weather) ----------

export interface OMBlock { time: string[]; [k: string]: (number | null)[] | string[] }
export interface OMResponse {
  latitude: number
  longitude: number
  elevation?: number
  current?: Record<string, number | string>
  current_units?: Record<string, string>
  hourly?: OMBlock
  hourly_units?: Record<string, string>
  daily?: OMBlock
  daily_units?: Record<string, string>
}

export const CURRENT_VARS = [
  'temperature_2m', 'relative_humidity_2m', 'apparent_temperature', 'precipitation', 'rain',
  'weather_code', 'cloud_cover', 'wind_speed_10m', 'wind_direction_10m', 'wind_gusts_10m', 'surface_pressure', 'is_day',
]

export async function fetchNowcast(stations: Station[], signal?: AbortSignal) {
  const url = `https://api.open-meteo.com/v1/forecast?${qs({
    ...coords(stations),
    current: CURRENT_VARS.join(','),
    hourly: 'precipitation,precipitation_probability',
    daily: 'temperature_2m_max,temperature_2m_min,apparent_temperature_max,precipitation_sum,wind_gusts_10m_max,uv_index_max',
    past_days: 1,
    forecast_days: 3,
    timezone: TZ,
  })}`
  return asArray(await fetchJson<OMResponse | OMResponse[]>('Open-Meteo Forecast', url, signal))
}

export async function fetchStationSeries(s: Station, pastDays: number, signal?: AbortSignal) {
  const url = `https://api.open-meteo.com/v1/forecast?${qs({
    latitude: s.lat,
    longitude: s.lon,
    hourly: 'temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,precipitation_probability,weather_code,is_day,uv_index,wind_speed_10m,wind_gusts_10m,cloud_cover,soil_moisture_0_to_1cm',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_gusts_10m_max,uv_index_max,sunrise,sunset',
    past_days: pastDays,
    forecast_days: 7,
    timezone: TZ,
  })}`
  return fetchJson<OMResponse>('Open-Meteo Forecast', url, signal)
}

export async function fetchMultiSeries(stations: Station[], variable: string, pastDays: number, forecastDays: number, signal?: AbortSignal) {
  const url = `https://api.open-meteo.com/v1/forecast?${qs({
    ...coords(stations),
    hourly: variable,
    past_days: pastDays,
    forecast_days: forecastDays,
    timezone: TZ,
  })}`
  return asArray(await fetchJson<OMResponse | OMResponse[]>('Open-Meteo Forecast', url, signal))
}

// ---------- Open-Meteo air quality (CAMS) ----------

export async function fetchAirNow(stations: Station[], signal?: AbortSignal) {
  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?${qs({
    ...coords(stations),
    current: 'us_aqi,pm2_5,pm10,ozone,nitrogen_dioxide,dust,uv_index',
    timezone: TZ,
  })}`
  return asArray(await fetchJson<OMResponse | OMResponse[]>('Open-Meteo Air Quality', url, signal))
}

export async function fetchAirSeries(s: Station, pastDays: number, signal?: AbortSignal) {
  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?${qs({
    latitude: s.lat,
    longitude: s.lon,
    hourly: 'us_aqi,pm2_5,pm10',
    past_days: Math.min(pastDays, 92),
    forecast_days: 4,
    timezone: TZ,
  })}`
  return fetchJson<OMResponse>('Open-Meteo Air Quality', url, signal)
}

// ---------- Open-Meteo flood (GloFAS river discharge) ----------

export async function fetchRivers(points: RiverPoint[], signal?: AbortSignal) {
  const url = `https://flood-api.open-meteo.com/v1/flood?${qs({
    ...coords(points),
    daily: 'river_discharge,river_discharge_max,river_discharge_p75',
    past_days: 45,
    forecast_days: 14,
  })}`
  return asArray(await fetchJson<OMResponse | OMResponse[]>('Open-Meteo Flood (GloFAS)', url, signal))
}

// ---------- Open-Meteo historical (ERA5) for climate context ----------

export async function fetchArchiveDaily(s: Station, start: string, end: string, signal?: AbortSignal) {
  const url = `https://archive-api.open-meteo.com/v1/archive?${qs({
    latitude: s.lat,
    longitude: s.lon,
    start_date: start,
    end_date: end,
    daily: 'precipitation_sum,temperature_2m_mean',
    timezone: TZ,
  })}`
  return fetchJson<OMResponse>('Open-Meteo Historical (ERA5)', url, signal)
}

// ---------- NASA POWER (solar resource) ----------

export interface PowerResponse {
  properties: { parameter: Record<string, Record<string, number>> }
}

export async function fetchSolar(s: Station, start: string, end: string, signal?: AbortSignal) {
  const url = `https://power.larc.nasa.gov/api/temporal/daily/point?${qs({
    parameters: 'ALLSKY_SFC_SW_DWN,CLRSKY_SFC_SW_DWN',
    community: 'RE',
    latitude: s.lat,
    longitude: s.lon,
    start,
    end,
    format: 'JSON',
  })}`
  return fetchJson<PowerResponse>('NASA POWER', url, signal, 30000)
}

/** Read a numeric series out of an Open-Meteo block. */
export function series(block: OMBlock | undefined, key: string): (number | null)[] {
  const v = block?.[key]
  return Array.isArray(v) ? (v as (number | null)[]) : []
}

// ---------- Wikipedia / Wikimedia Commons (place photos) ----------

export interface PlacePhoto {
  src: string
  width: number
  height: number
  pageUrl: string
  fileUrl?: string
  artist?: string
  license?: string
}

interface WikiSummary {
  type?: string
  thumbnail?: { source: string; width: number; height: number }
  originalimage?: { source: string; width: number; height: number }
  content_urls?: { desktop?: { page?: string } }
}

interface ImageInfo {
  query?: { pages?: Record<string, { imageinfo?: { descriptionurl?: string; extmetadata?: Record<string, { value?: string }> }[] }> }
}

const stripHtml = (s?: string) => (s ? new DOMParser().parseFromString(s, 'text/html').body.textContent?.trim() || undefined : undefined)

/** The lead photo of a Wikipedia article, with its author and licence from Commons. Null when the article has none. */
export async function fetchPlacePhoto(title: string, signal?: AbortSignal): Promise<PlacePhoto | null> {
  const t = encodeURIComponent(title.replaceAll(' ', '_'))
  const sum = await fetchJson<WikiSummary>('Wikipedia', `https://en.wikipedia.org/api/rest_v1/page/summary/${t}`, signal, 12000)
  const img = sum.thumbnail
  if (sum.type === 'disambiguation' || !img || !sum.originalimage) return null
  // Ask for a 1280 px rendition: thumbnails come as .../NNNpx-Name.jpg.
  const src = img.source.replace(/\/(\d+)px-/, (_m, n) => `/${Math.max(Number(n), Math.min(1280, sum.originalimage!.width))}px-`)
  const photo: PlacePhoto = { src, width: sum.originalimage.width, height: sum.originalimage.height, pageUrl: sum.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${t}` }
  try {
    const file = decodeURIComponent(sum.originalimage.source.split('/').pop() ?? '')
    const info = await fetchJson<ImageInfo>('Wikimedia Commons', `https://en.wikipedia.org/w/api.php?${qs({
      action: 'query', prop: 'imageinfo', iiprop: 'extmetadata|url', titles: `File:${file}`, format: 'json', origin: '*',
    })}`, signal, 12000)
    const page = Object.values(info.query?.pages ?? {})[0]
    const ii = page?.imageinfo?.[0]
    photo.fileUrl = ii?.descriptionurl
    photo.artist = stripHtml(ii?.extmetadata?.Artist?.value)
    photo.license = stripHtml(ii?.extmetadata?.LicenseShortName?.value)
  } catch { /* the photo still shows, credited to its Wikipedia article */ }
  return photo
}

// ---------- NASA GIBS still image of the island ----------

/** A single true-colour MODIS image covering the whole island for one day. */
export function islandSnapshotUrl(date: string, width = 600) {
  const [[w, s], [e, n]] = [[79.4, 5.75], [82.05, 9.95]]
  const height = Math.round((width * (n - s)) / (e - w))
  return `https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?${qs({
    SERVICE: 'WMS', REQUEST: 'GetMap', VERSION: '1.1.1', LAYERS: 'MODIS_Terra_CorrectedReflectance_TrueColor',
    STYLES: '', FORMAT: 'image/jpeg', SRS: 'EPSG:4326', BBOX: `${w},${s},${e},${n}`, WIDTH: width, HEIGHT: height, TIME: date,
  })}`
}
