import type { RiverReading, StationReading } from '../hooks/useLiveData'
import { fmt, riverLevelText } from './metrics'
import { placeName, riverNames } from './places'
import { tFor, type Key, type Lang, type T } from '../i18n/core'

export type AlertLevel = 'watch' | 'warning'
export type AlertKind = 'rain' | 'flood' | 'storm' | 'heat' | 'wind' | 'air' | 'river'

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
  flood: { watch: 45, warning: 65 }, // flood-risk score (lib/flood.ts levels high / very high)
  storm: { watch: 95, warning: 96 }, // WMO code: 95 thunderstorm, 96/99 with hail
}

/** Alert text comes out in the interface language; tests and callers without one get English. */
export function buildAlerts(readings?: StationReading[], rivers?: RiverReading[], lang: Lang = 'en'): Alert[] {
  const t: T = tFor(lang)
  const out: Alert[] = []
  for (const r of readings ?? []) {
    const s = r.station
    const place = placeName(s, lang)
    const href = `/station/${s.id}`
    const rainMax = Math.max(r.values.rain24 ?? 0, r.values.rainNext24 ?? 0)
    if (rainMax >= RULES.rain.watch) {
      const fwd = (r.values.rainNext24 ?? 0) >= (r.values.rain24 ?? 0)
      out.push({
        id: `rain-${s.id}`, kind: 'rain', place, href,
        level: rainMax >= RULES.rain.warning ? 'warning' : 'watch',
        title: t(rainMax >= RULES.rain.warning ? 'alert.rain.heavy' : 'alert.rain.substantial'),
        detail: t(fwd ? 'alert.rain.next' : 'alert.rain.past', { mm: fmt(rainMax) }),
      })
    }
    const heat = Math.max(r.values.feels ?? -99, r.feelsMaxToday ?? -99, r.feelsMaxTomorrow ?? -99)
    if (heat >= RULES.heat.watch) {
      out.push({
        id: `heat-${s.id}`, kind: 'heat', place, href,
        level: heat >= RULES.heat.warning ? 'warning' : 'watch',
        title: t(heat >= RULES.heat.warning ? 'alert.heat.danger' : 'alert.heat.stress'),
        detail: t('alert.heat.detail', { t: fmt(heat) }),
      })
    }
    const gust = Math.max(r.values.gust ?? 0, r.gustMaxToday ?? 0)
    if (gust >= RULES.gust.watch) {
      out.push({
        id: `wind-${s.id}`, kind: 'wind', place, href,
        level: gust >= RULES.gust.warning ? 'warning' : 'watch',
        title: t('alert.wind.title'),
        detail: t('alert.wind.detail', { g: fmt(gust) }),
      })
    }
    const aqi = r.values.aqi
    if (aqi != null && aqi >= RULES.aqi.watch) {
      out.push({
        id: `air-${s.id}`, kind: 'air', place, href,
        level: aqi >= RULES.aqi.warning ? 'warning' : 'watch',
        title: t(aqi >= RULES.aqi.warning ? 'alert.air.unhealthy' : 'alert.air.sensitive'),
        detail: t('alert.air.detail', { aqi: fmt(aqi), pm: fmt(r.values.pm25) }),
      })
    }
  }
  for (const r of readings ?? []) {
    const s = r.station
    const place = placeName(s, lang)
    const href = `/station/${s.id}`
    const f = r.flood
    if (f && f.score >= RULES.flood.watch) {
      out.push({
        id: `flood-${s.id}`, kind: 'flood', place, href,
        level: f.score >= RULES.flood.warning ? 'warning' : 'watch',
        title: t('alert.flood.title', { level: t(`floodLevel.${f.level}` as Key) }),
        detail: t('alert.flood.detail', { n: f.score, ...f.parts }),
      })
    }
    const code = r.weatherCode ?? 0
    if (code >= RULES.storm.watch) {
      out.push({
        id: `storm-${s.id}`, kind: 'storm', place, href,
        level: code >= RULES.storm.warning ? 'warning' : 'watch',
        title: t(code >= RULES.storm.warning ? 'alert.storm.hail' : 'alert.storm.now'),
        detail: t('alert.storm.detail'),
      })
    }
  }
  for (const rv of rivers ?? []) {
    if (rv.level === 'normal') continue
    const n = riverNames(rv.point, lang)
    out.push({
      id: `river-${rv.point.id}`, kind: 'river', place: t('river.at', n),
      href: `/rivers/${rv.point.id}`,
      level: rv.level === 'elevated' ? 'watch' : 'warning',
      title: t('alert.river.title', { level: riverLevelText(rv.level, t) }),
      detail: t('alert.river.detail', { peak: fmt(rv.peak), ratio: fmt(rv.ratio, 1) }),
    })
  }
  return out.sort((a, b) => (a.level === b.level ? a.kind.localeCompare(b.kind) : a.level === 'warning' ? -1 : 1))
}
