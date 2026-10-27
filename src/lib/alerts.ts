import type { RiverReading, StationReading } from '../hooks/useLiveData'
import { fmt, RIVER_LEVELS } from './metrics'

export type AlertLevel = 'watch' | 'warning'
export type AlertKind = 'rain' | 'heat' | 'wind' | 'air' | 'river'

export interface Alert {
  id: string
  level: AlertLevel
  kind: AlertKind
  title: string
  detail: string
  place: string
  href: string
}

/**
 * Thresholds. These are indicative screening rules on model data, not official
 * warnings. The Department of Meteorology and DMC remain the authorities.
 */
export const RULES = {
  rain: { watch: 50, warning: 100 }, // mm in 24 h (DoM calls 100 mm+ "heavy")
  heat: { watch: 39, warning: 42 }, // apparent temperature °C
  gust: { watch: 50, warning: 70 }, // km/h
  aqi: { watch: 101, warning: 151 }, // US AQI
}

export function buildAlerts(readings?: StationReading[], rivers?: RiverReading[]): Alert[] {
  const out: Alert[] = []
  for (const r of readings ?? []) {
    const s = r.station
    const href = `/station/${s.id}`
    const rainMax = Math.max(r.values.rain24 ?? 0, r.values.rainNext24 ?? 0)
    if (rainMax >= RULES.rain.watch) {
      const fwd = (r.values.rainNext24 ?? 0) >= (r.values.rain24 ?? 0)
      out.push({
        id: `rain-${s.id}`, kind: 'rain', place: s.name, href,
        level: rainMax >= RULES.rain.warning ? 'warning' : 'watch',
        title: rainMax >= RULES.rain.warning ? 'Heavy rain' : 'Substantial rain',
        detail: `${fmt(rainMax)} mm ${fwd ? 'forecast in the next 24 h' : 'in the last 24 h'}`,
      })
    }
    const heat = Math.max(r.values.feels ?? -99, r.feelsMaxToday ?? -99, r.feelsMaxTomorrow ?? -99)
    if (heat >= RULES.heat.watch) {
      out.push({
        id: `heat-${s.id}`, kind: 'heat', place: s.name, href,
        level: heat >= RULES.heat.warning ? 'warning' : 'watch',
        title: heat >= RULES.heat.warning ? 'Dangerous heat' : 'Heat stress',
        detail: `Feels like up to ${fmt(heat)}° today or tomorrow`,
      })
    }
    const gust = Math.max(r.values.gust ?? 0, r.gustMaxToday ?? 0)
    if (gust >= RULES.gust.watch) {
      out.push({
        id: `wind-${s.id}`, kind: 'wind', place: s.name, href,
        level: gust >= RULES.gust.warning ? 'warning' : 'watch',
        title: 'Strong gusts',
        detail: `Gusts to ${fmt(gust)} km/h today`,
      })
    }
    const aqi = r.values.aqi
    if (aqi != null && aqi >= RULES.aqi.watch) {
      out.push({
        id: `air-${s.id}`, kind: 'air', place: s.name, href,
        level: aqi >= RULES.aqi.warning ? 'warning' : 'watch',
        title: aqi >= RULES.aqi.warning ? 'Unhealthy air' : 'Air unhealthy for sensitive groups',
        detail: `US AQI ${fmt(aqi)}, PM2.5 ${fmt(r.values.pm25)} µg/m³`,
      })
    }
  }
  for (const rv of rivers ?? []) {
    if (rv.level === 'normal') continue
    out.push({
      id: `river-${rv.point.id}`, kind: 'river', place: `${rv.point.river} at ${rv.point.near}`,
      href: `/rivers/${rv.point.id}`,
      level: rv.level === 'elevated' ? 'watch' : 'warning',
      title: `${RIVER_LEVELS[rv.level].label} river flow`,
      detail: `Forecast peak ${fmt(rv.peak)} m³/s is ${fmt(rv.ratio, 1)}× the 30-day median`,
    })
  }
  return out.sort((a, b) => (a.level === b.level ? a.kind.localeCompare(b.kind) : a.level === 'warning' ? -1 : 1))
}
