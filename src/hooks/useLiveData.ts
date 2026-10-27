import { useQuery } from '@tanstack/react-query'
import { fetchAirNow, fetchNowcast, fetchRivers, series, type OMResponse } from '../lib/api'
import { RIVER_POINTS, STATIONS, type RiverPoint, type Station } from '../lib/places'
import { riverLevel, type MetricId, type RiverLevel } from '../lib/metrics'
import { useSettings } from '../stores/settings'
import { townFloodRisk, type FloodRisk } from '../lib/flood'

export interface StationReading {
  station: Station
  time: string
  /** Ground elevation at the town, metres (Copernicus DEM via Open-Meteo). */
  elevation: number | null
  flood?: FloodRisk
  values: Record<MetricId, number | null>
  weatherCode: number | null
  isDay: boolean | null
  windSpeed: number | null
  windDir: number | null
  cloud: number | null
  pressure: number | null
  tMax: number | null
  tMin: number | null
  feelsMaxToday: number | null
  feelsMaxTomorrow: number | null
  rainProbNext24: number | null
  uvMax: number | null
  gustMaxToday: number | null
  air?: { aqi: number | null; pm25: number | null; pm10: number | null; ozone: number | null; no2: number | null; dust: number | null; uv: number | null; time: string }
}

export interface RiverReading {
  point: RiverPoint
  today: number | null
  median: number | null
  peak: number | null
  peakDate: string | null
  ensembleMaxPeak: number | null
  ratio: number | null
  level: RiverLevel
  time: string[]
  discharge: (number | null)[]
  ensembleMax: (number | null)[]
  todayIndex: number
}

export const num = (x: unknown) => (typeof x === 'number' && !Number.isNaN(x) ? x : null)
const sum = (xs: (number | null)[]) => xs.reduce<number>((a, b) => a + (b ?? 0), 0)

/** Rain summed over the 24 hours up to the current step and the 24 hours after it. */
export function rainWindows(r: OMResponse) {
  const now = String(r.current?.time ?? '')
  const ht = (r.hourly?.time ?? []) as string[]
  let i = -1
  for (let k = 0; k < ht.length; k++) if (ht[k] <= now) i = k
  const pr = series(r.hourly, 'precipitation')
  const past = i >= 0 ? pr.slice(Math.max(0, i - 23), i + 1) : []
  const next = i >= 0 ? pr.slice(i + 1, i + 25) : []
  return { i, past: past.length ? sum(past) : null, next: next.length ? sum(next) : null }
}

function toReading(st: Station, r: OMResponse): StationReading {
  const c = r.current ?? {}
  const now = String(c.time ?? '')
  const { i, past, next } = rainWindows(r)
  const pp = series(r.hourly, 'precipitation_probability')
  const nextProb = i >= 0 ? pp.slice(i + 1, i + 25).filter((x): x is number => x != null) : []
  const dt = (r.daily?.time ?? []) as string[]
  const today = now.slice(0, 10)
  const d = Math.max(0, dt.indexOf(today))
  const dv = (k: string, off = 0) => num(series(r.daily, k)[d + off])
  return {
    station: st,
    time: now,
    elevation: num(r.elevation),
    values: {
      temp: num(c.temperature_2m),
      feels: num(c.apparent_temperature),
      rain24: past,
      rainNext24: next,
      humidity: num(c.relative_humidity_2m),
      gust: num(c.wind_gusts_10m),
      aqi: null,
      pm25: null,
      flood: null,
    },
    weatherCode: num(c.weather_code),
    isDay: c.is_day == null ? null : Number(c.is_day) === 1,
    windSpeed: num(c.wind_speed_10m),
    windDir: num(c.wind_direction_10m),
    cloud: num(c.cloud_cover),
    pressure: num(c.surface_pressure),
    tMax: dv('temperature_2m_max'),
    tMin: dv('temperature_2m_min'),
    feelsMaxToday: dv('apparent_temperature_max'),
    feelsMaxTomorrow: dv('apparent_temperature_max', 1),
    rainProbNext24: nextProb.length ? Math.max(...nextProb) : null,
    uvMax: dv('uv_index_max'),
    gustMaxToday: dv('wind_gusts_10m_max'),
  }
}

export function useNowcast() {
  const refreshMin = useSettings((s) => s.refreshMinutes)
  const interval = refreshMin * 60_000
  const weather = useQuery({
    queryKey: ['nowcast'],
    queryFn: ({ signal }) => fetchNowcast(STATIONS, signal),
    refetchInterval: interval,
  })
  const air = useQuery({
    queryKey: ['air-now'],
    queryFn: ({ signal }) => fetchAirNow(STATIONS, signal),
    refetchInterval: interval,
  })
  // Rivers feed the flood score; the query is shared with every other useRivers() caller.
  const { rivers } = useRivers()

  let readings: StationReading[] | undefined
  if (weather.data) {
    readings = STATIONS.map((st, k) => {
      const rd = toReading(st, weather.data[k])
      const a = air.data?.[k]?.current
      if (a) {
        rd.values.aqi = num(a.us_aqi)
        rd.values.pm25 = num(a.pm2_5)
        rd.air = { aqi: num(a.us_aqi), pm25: num(a.pm2_5), pm10: num(a.pm10), ozone: num(a.ozone), no2: num(a.nitrogen_dioxide), dust: num(a.dust), uv: num(a.uv_index), time: String(a.time ?? '') }
      }
      rd.flood = townFloodRisk(rd, rivers)
      rd.values.flood = rd.flood.score
      return rd
    })
  }
  return { readings, weather, air, updatedAt: Math.max(weather.dataUpdatedAt, air.dataUpdatedAt) }
}

/** Today's discharge, the 30-day median and the 10-day forecast peak from one GloFAS daily series. */
export function riverStats(r: OMResponse, today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' })): Omit<RiverReading, 'point'> {
  const time = (r.daily?.time ?? []) as string[]
  const dis = series(r.daily, 'river_discharge')
  const emax = series(r.daily, 'river_discharge_max')
  let ti = time.indexOf(today)
  if (ti < 0) ti = time.findIndex((t) => t > today) - 1
  if (ti < 0) ti = 0
  const past = dis.slice(Math.max(0, ti - 30), ti).filter((x): x is number => x != null)
  const med = median(past)
  let peak: number | null = null
  let peakDate: string | null = null
  for (let j = ti; j < Math.min(dis.length, ti + 10); j++) {
    const v = dis[j]
    if (v != null && (peak == null || v > peak)) { peak = v; peakDate = time[j] }
  }
  const fe = emax.slice(ti, ti + 10).filter((x): x is number => x != null)
  const ratio = peak != null && med != null && med > 0.5 ? peak / med : null
  return {
    today: num(dis[ti]), median: med, peak, peakDate,
    ensembleMaxPeak: fe.length ? Math.max(...fe) : null,
    ratio, level: riverLevel(ratio), time, discharge: dis, ensembleMax: emax, todayIndex: ti,
  }
}

function median(xs: number[]) {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

export function useRivers() {
  const refreshMin = useSettings((s) => s.refreshMinutes)
  const q = useQuery({
    queryKey: ['rivers'],
    queryFn: ({ signal }) => fetchRivers(RIVER_POINTS, signal),
    // GloFAS updates once a day; no need to poll as often as weather.
    refetchInterval: Math.max(60, refreshMin) * 60_000,
    staleTime: 30 * 60_000,
  })
  const rivers: RiverReading[] | undefined = q.data?.map((r, k) => ({ point: RIVER_POINTS[k], ...riverStats(r) }))
  return { rivers, query: q }
}
