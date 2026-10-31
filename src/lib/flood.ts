// A screening score for flood likelihood at a place, from data the app already has:
// rain (past and next 24 h), how far the nearest river is running above its recent
// median, and how low-lying the ground is. It is a heads-up, not a flood forecast;
// the Irrigation Department and DMC issue the official ones.
import type { RiverReading, StationReading } from './readings'
import { riversNear } from './places'

export type FloodLevel = 'low' | 'moderate' | 'high' | 'very-high'

export interface FloodInputs {
  rain24: number | null
  rainNext24: number | null
  /** Forecast peak ÷ 30-day median at the nearest river point, if one is close enough. */
  riverRatio: number | null
  /** Ground elevation, metres. */
  elevation: number | null
}

export interface FloodRisk {
  score: number
  level: FloodLevel
  parts: { rain: number; river: number; terrain: number }
}

export const FLOOD_WEIGHTS = { rain: 45, river: 35, terrain: 20 }
/** Rain at which the rain part maxes out, mm in 24 h (DoM "very heavy" is 150 mm). */
export const FLOOD_RAIN_CAP = 150
/** River points farther than this from a place don't count towards its score. */
export const FLOOD_RIVER_KM = 30

export const FLOOD_LEVELS: Record<FloodLevel, { color: string; min: number }> = {
  low: { color: '#3fa3ad', min: 0 },
  moderate: { color: '#c99a1c', min: 25 },
  high: { color: '#d9692a', min: 45 },
  'very-high': { color: '#c23a2e', min: 65 },
}

const clamp = (x: number) => Math.max(0, Math.min(1, x))

export function floodLevel(score: number): FloodLevel {
  if (score >= FLOOD_LEVELS['very-high'].min) return 'very-high'
  if (score >= FLOOD_LEVELS.high.min) return 'high'
  if (score >= FLOOD_LEVELS.moderate.min) return 'moderate'
  return 'low'
}

export function floodRisk({ rain24, rainNext24, riverRatio, elevation }: FloodInputs): FloodRisk {
  const rainMax = Math.max(rain24 ?? 0, rainNext24 ?? 0)
  const rain = FLOOD_WEIGHTS.rain * clamp(rainMax / FLOOD_RAIN_CAP)
  // Ratio 1 (normal) scores nothing; 5× the median or more scores in full.
  const river = riverRatio == null ? 0 : FLOOD_WEIGHTS.river * clamp((riverRatio - 1) / 4)
  // Low ground floods first; above ~150 m water drains away fast. Unknown elevation counts as mid-range.
  const e = elevation ?? 60
  const terrain = FLOOD_WEIGHTS.terrain * (e < 10 ? 1 : e < 30 ? 0.65 : e < 100 ? 0.3 : e < 150 ? 0.1 : 0)
  // Terrain alone can't make a place risky: it only counts when there is water to drain.
  const wet = clamp((rain + river) / 20)
  const score = Math.round(rain + river + terrain * wet)
  return { score, level: floodLevel(score), parts: { rain: Math.round(rain), river: Math.round(river), terrain: Math.round(terrain * wet) } }
}

/** The nearest tracked river point within FLOOD_RIVER_KM of a place, with its reading. */
export function nearestRiver(p: { lat: number; lon: number }, rivers?: RiverReading[]) {
  const near = riversNear(p, FLOOD_RIVER_KM)[0]
  if (!near) return undefined
  const reading = rivers?.find((r) => r.point.id === near.point.id)
  return { ...near, reading }
}

export function townFloodRisk(r: StationReading, rivers?: RiverReading[]) {
  return floodRisk({
    rain24: r.values.rain24,
    rainNext24: r.values.rainNext24,
    riverRatio: nearestRiver(r.station, rivers)?.reading?.ratio ?? null,
    elevation: r.elevation,
  })
}
