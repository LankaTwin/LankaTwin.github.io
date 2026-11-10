// How far to trust a forecast. No model is right every time, so the app shows two honest
// measures beside each forecast: how well the big global models agree about the days ahead,
// and how the forecasts of the past week turned out. Pure functions; the fetches are in api.ts.
import type { OMBlock, OMResponse } from './api'

/** Global models compared on a place page (Open-Meteo ids). */
export const MODELS: { id: string; name: string; by: string }[] = [
  { id: 'ecmwf_ifs025', name: 'ECMWF IFS', by: 'Europe' },
  { id: 'gfs_seamless', name: 'GFS', by: 'USA (NOAA)' },
  { id: 'icon_seamless', name: 'ICON', by: 'Germany (DWD)' },
  { id: 'ukmo_seamless', name: 'UKMO', by: 'UK Met Office' },
  { id: 'meteofrance_seamless', name: 'ARPEGE', by: 'Météo-France' },
  { id: 'jma_seamless', name: 'JMA GSM', by: 'Japan' },
]

/** A day counts as wet from this much rain, mm. */
export const WET_MM = 1

export type Agreement = 'high' | 'medium' | 'low'

export interface DayOutlook {
  date: string
  /** Models with a rain total for the day. */
  models: number
  wet: number
  rainMin: number
  rainMedian: number
  rainMax: number
  tMaxMin: number | null
  tMaxMax: number | null
  agreement: Agreement
}

export function median(xs: number[]) {
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

const nums = (xs: (number | null | undefined)[]) => xs.filter((x): x is number => typeof x === 'number' && Number.isFinite(x))

/**
 * Agreement between models on one day's rain. High: nearly all say wet or nearly all say dry,
 * with totals close together. Low: they split on wet or dry, or the totals are far apart.
 */
export function rainAgreement(rain: number[]): Agreement {
  if (rain.length < 3) return 'low'
  const wetFrac = rain.filter((r) => r >= WET_MM).length / rain.length
  const med = median(rain)
  const spread = Math.max(...rain) - Math.min(...rain)
  if (spread > Math.max(20, 2.5 * med) || (wetFrac > 0.34 && wetFrac < 0.66)) return 'low'
  if ((wetFrac >= 0.8 || wetFrac <= 0.2) && spread <= Math.max(5, med)) return 'high'
  return 'medium'
}

/** One outlook per day from a multi-model answer (keys like precipitation_sum_gfs_seamless). */
export function modelOutlook(r: OMResponse, from: string, days = 7): DayOutlook[] {
  const d = r.daily as OMBlock | undefined
  const time = (d?.time ?? []) as string[]
  const out: DayOutlook[] = []
  for (let i = 0; i < time.length && out.length < days; i++) {
    if (time[i] < from) continue
    const col = (k: string) => nums(MODELS.map((m) => (d?.[`${k}_${m.id}`] as (number | null)[] | undefined)?.[i]))
    const rain = col('precipitation_sum')
    const tmax = col('temperature_2m_max')
    if (rain.length < 3) continue
    out.push({
      date: time[i], models: rain.length, wet: rain.filter((x) => x >= WET_MM).length,
      rainMin: Math.min(...rain), rainMedian: median(rain), rainMax: Math.max(...rain),
      tMaxMin: tmax.length ? Math.min(...tmax) : null, tMaxMax: tmax.length ? Math.max(...tmax) : null,
      agreement: rainAgreement(rain),
    })
  }
  return out
}

// ---------- Track record ----------

export interface LeadScore {
  /** Days ahead the forecast was made. */
  lead: number
  days: number
  /** Mean absolute error of hourly temperature, °C. */
  tempMae: number | null
  /** Mean absolute error of the daily rain total, mm. */
  rainMae: number | null
  /** Days where the forecast got wet-or-dry right. */
  wetHits: number
}

/**
 * Scores the forecasts made 1, 2 and 3 days ahead for the complete days before `today`, against
 * the model's latest analysis of what happened (not a rain gauge or thermometer).
 */
export function trackRecord(r: OMResponse, today: string, leads = [1, 2, 3]): LeadScore[] {
  const h = r.hourly
  const time = (h?.time ?? []) as string[]
  const col = (k: string) => (h?.[k] ?? []) as (number | null)[]
  const tempNow = col('temperature_2m')
  const rainNow = col('precipitation')
  return leads.map((lead) => {
    const tempThen = col(`temperature_2m_previous_day${lead}`)
    const rainThen = col(`precipitation_previous_day${lead}`)
    let tErr = 0, tN = 0
    const byDay = new Map<string, { a: number; f: number; n: number }>()
    for (let i = 0; i < time.length; i++) {
      const day = time[i].slice(0, 10)
      if (day >= today) continue
      const [ta, tf, ra, rf] = [tempNow[i], tempThen[i], rainNow[i], rainThen[i]]
      if (ta != null && tf != null) { tErr += Math.abs(ta - tf); tN++ }
      if (ra != null && rf != null) {
        const e = byDay.get(day) ?? { a: 0, f: 0, n: 0 }
        e.a += ra; e.f += rf; e.n++
        byDay.set(day, e)
      }
    }
    // Only whole days: a partial day's total would look like a miss.
    const full = [...byDay.values()].filter((e) => e.n === 24)
    return {
      lead, days: full.length,
      tempMae: tN ? tErr / tN : null,
      rainMae: full.length ? full.reduce((s, e) => s + Math.abs(e.a - e.f), 0) / full.length : null,
      wetHits: full.filter((e) => (e.a >= WET_MM) === (e.f >= WET_MM)).length,
    }
  }).filter((s) => s.days > 0)
}

// ---------- Sea ----------

export type SeaState = 'calm' | 'slight' | 'moderate' | 'rough' | 'veryRough' | 'high'

/** WMO sea state from significant wave height, metres. */
export function seaState(waveM: number | null | undefined): SeaState | null {
  if (waveM == null || !Number.isFinite(waveM)) return null
  if (waveM < 0.5) return 'calm'
  if (waveM < 1.25) return 'slight'
  if (waveM < 2.5) return 'moderate'
  if (waveM < 4) return 'rough'
  if (waveM < 6) return 'veryRough'
  return 'high'
}
