import { describe, expect, it } from 'vitest'
import { buildAlerts, RULES } from '../alerts'
import { bandFor, colorFor, compass, METRICS, riverLevel, uvBand } from '../metrics'
import { distanceKm, nearestStation, riversNear, STATIONS, stationById } from '../places'
import { search } from '../search'
import { tFor } from '../../i18n/core'
import { seasonFor, SEASONS } from '../season'
import { addDays, addHours } from '../time'
import type { RiverReading, StationReading } from '../../hooks/useLiveData'

function reading(id: string, values: Partial<StationReading['values']> = {}, extra: Partial<StationReading> = {}): StationReading {
  return {
    station: stationById(id)!, time: '2026-10-27T12:00',
    values: { temp: 30, feels: 33, rain24: 0, rainNext24: 0, humidity: 70, gust: 20, aqi: 40, pm25: 10, ...values },
    weatherCode: 1, isDay: true, windSpeed: 10, windDir: 220, cloud: 20, pressure: 1008, tMax: 31, tMin: 25,
    feelsMaxToday: 34, feelsMaxTomorrow: 34, rainProbNext24: 10, uvMax: 9, gustMaxToday: 25, ...extra,
  }
}

describe('signals', () => {
  it('stays quiet on an ordinary day', () => {
    expect(buildAlerts([reading('colombo')], [])).toEqual([])
  })

  it('raises rain at watch and warning thresholds, using whichever 24 h window is wetter', () => {
    const [watch] = buildAlerts([reading('galle', { rain24: RULES.rain.watch, rainNext24: 10 })])
    expect(watch).toMatchObject({ kind: 'rain', level: 'watch', place: 'Galle' })
    expect(watch.detail).toContain('last 24 h')
    const [warn] = buildAlerts([reading('galle', { rainNext24: RULES.rain.warning + 20 })])
    expect(warn).toMatchObject({ level: 'warning', title: 'Heavy rain' })
    expect(warn.detail).toContain('forecast')
  })

  it('flags heat from tomorrow’s forecast, not only the current hour', () => {
    const [a] = buildAlerts([reading('jaffna', {}, { feelsMaxTomorrow: RULES.heat.warning })])
    expect(a).toMatchObject({ kind: 'heat', level: 'warning' })
  })

  it('lists warnings before watches', () => {
    const out = buildAlerts([reading('kandy', { gust: RULES.gust.watch }), reading('colombo', { aqi: RULES.aqi.warning })])
    expect(out.map((a) => a.level)).toEqual(['warning', 'watch'])
  })

  it('reports rivers that are above normal', () => {
    const rv = { point: { id: 'kelani-hanwella', river: 'Kelani Ganga', near: 'Hanwella' }, level: 'high', peak: 900, ratio: 3.4 } as unknown as RiverReading
    const [a] = buildAlerts([], [rv, { ...rv, level: 'normal' } as RiverReading])
    expect(a).toMatchObject({ kind: 'river', level: 'warning', href: '/rivers/kelani-hanwella' })
  })
})

describe('metrics', () => {
  it('maps values to colour bands with exclusive upper bounds', () => {
    expect(bandFor(METRICS.aqi, 50)).toBe('Good')
    expect(bandFor(METRICS.aqi, 51)).toBe('Moderate')
    expect(bandFor(METRICS.aqi, 999)).toBe('Hazardous')
    expect(bandFor(METRICS.temp, null)).toBe('—')
    expect(colorFor(METRICS.temp, undefined)).toBe('#9aa7aa')
  })

  it('grades river rise ratios', () => {
    expect([null, 1, 1.8, 3, 5].map(riverLevel)).toEqual(['normal', 'normal', 'elevated', 'high', 'very-high'])
  })

  it('names UV categories and compass points', () => {
    expect([2, 3, 6, 8, 11].map((u) => uvBand(u, tFor('en')))).toEqual(['Low', 'Moderate', 'High', 'Very high', 'Extreme'])
    expect([0, 90, 225, 359].map(compass)).toEqual(['N', 'E', 'SW', 'N'])
  })
})

describe('places', () => {
  it('has unique ids and Sinhala and Tamil names for every town', () => {
    expect(new Set(STATIONS.map((s) => s.id)).size).toBe(STATIONS.length)
    for (const s of STATIONS) {
      expect(s.si).toMatch(/[඀-෿]/)
      expect(s.ta).toMatch(/[஀-௿]/)
    }
  })

  it('measures distance and finds the nearest town', () => {
    const km = distanceKm(stationById('colombo')!, stationById('kandy')!)
    expect(km).toBeGreaterThan(85)
    expect(km).toBeLessThan(100)
    expect(nearestStation({ lat: 7.29, lon: 80.64 }).station.id).toBe('kandy')
    expect(nearestStation({ lat: 6.93, lon: 79.85 }).station.id).toBe('colombo')
  })

  it('lists rivers near a town, closest first', () => {
    const near = riversNear(stationById('ratnapura')!)
    expect(near[0].point.id).toBe('kalu-ratnapura')
    expect(near.every((n, i) => i === 0 || n.km >= near[i - 1].km)).toBe(true)
  })
})

describe('search', () => {
  it('finds towns by English, Sinhala and Tamil names', () => {
    expect(search('kan')[0].id).toBe('kandy')
    expect(search('මහනුවර')[0].id).toBe('kandy')
    expect(search('யாழ்')[0].id).toBe('jaffna')
  })

  it('finds rivers and pages', () => {
    expect(search('kelani')[0]).toMatchObject({ kind: 'river', href: '/rivers/kelani-hanwella' })
    expect(search('emergency')[0]).toMatchObject({ kind: 'page', href: '/alerts' })
    expect(search('zzzz')).toEqual([])
  })
})

describe('seasons', () => {
  it('covers every month exactly once', () => {
    const months = SEASONS.flatMap((s) => s.span).sort((a, b) => a - b)
    expect(months).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
  })

  it('picks the season for a date', () => {
    expect(seasonFor('2026-01-15').id).toBe('nem')
    expect(seasonFor('2026-04-01').id).toBe('fim')
    expect(seasonFor('2026-07-31').id).toBe('swm')
    expect(seasonFor('2026-10-27').id).toBe('sim')
    expect(seasonFor('2026-12-01').id).toBe('nem')
  })
})

describe('time', () => {
  it('adds days and hours to wall-clock strings across month and year ends', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(addHours('2026-10-27T23:00', 2)).toBe('2026-10-28T01:00')
  })
})
