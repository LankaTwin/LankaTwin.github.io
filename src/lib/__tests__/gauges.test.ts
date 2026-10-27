import { describe, expect, it } from 'vitest'
import { buildGauges, dailyRain, gaugeLevel, gaugeSummary, gaugeUnit, queryUrl, slug, type RawReading } from '../gauges'
import { buildAlerts } from '../alerts'

const NOW = Date.UTC(2026, 9, 27, 8, 0) // 13:30 in Colombo
const H = 3_600_000
const T = { alert: 2, minor: 3, major: 4 }

const row = (gauge: string, hoursAgo: number, water_level: number | null, rain_fall = 0, basin = 'Kelani Ganga'): RawReading => ({
  gauge, basin, water_level, rain_fall, alertpull: T.alert, minorpull: T.minor, majorpull: T.major, CreationDate: NOW - hoursAgo * H,
})

describe('gauge levels', () => {
  it('reaching a threshold counts as being at it', () => {
    expect(gaugeLevel(1.99, T)).toBe('normal')
    expect(gaugeLevel(2, T)).toBe('alert')
    expect(gaugeLevel(3.5, T)).toBe('minor')
    expect(gaugeLevel(4, T)).toBe('major')
    expect(gaugeLevel(null, T)).toBe('normal')
  })

  it('ignores missing or zero thresholds', () => {
    expect(gaugeLevel(10, { alert: null, minor: null, major: null })).toBe('normal')
    expect(gaugeLevel(10, { alert: 2, minor: null, major: null })).toBe('alert')
  })

  it('reads Nagalagam Street in feet', () => {
    expect(gaugeUnit('Nagalagam Street')).toBe('ft')
    expect(gaugeUnit('Hanwella')).toBe('m')
    expect(slug('Nagalagam Street')).toBe('nagalagam-street')
  })
})

describe('buildGauges', () => {
  const stations = [{ station: 'Hanwella', basin: 'Kelani Ganga', latitude: 6.9, longitude: 80.08 }, { station: 'Glencourse', basin: 'Kelani Ganga', latitude: 6.97, longitude: 80.18 }]
  const readings = [
    row('Hanwella', 3, 1.5, 4), row('Hanwella', 2, 2.2, 10), row('Hanwella', 0.5, 3.1, 12),
    row('Glencourse', 30, 2.5), // too old to count
    row('Putupaula', 1, 1.0, 2, 'Kalu Ganga'), // no listed position
  ]
  const gs = buildGauges(stations, readings, NOW)
  const han = gs.find((g) => g.id === 'hanwella')!

  it('uses the latest reading for status and trend', () => {
    expect(han.latest?.level).toBe(3.1)
    expect(han.level).toBe('minor')
    expect(han.trend).toBe('up')
    expect(han.change).toBeCloseTo(0.9)
    expect(han.thresholds).toEqual(T)
  })

  it('sums rain over the last hour and the last day', () => {
    expect(han.rain1h).toBe(12)
    expect(han.rain24h).toBe(26)
  })

  it('tracks the highest status reached', () => {
    expect(han.peak?.level).toBe('minor')
    expect(han.peak?.obs.level).toBe(3.1)
  })

  it('marks gauges without recent readings stale and normal', () => {
    const gl = gs.find((g) => g.id === 'glencourse')!
    expect(gl.stale).toBe(true)
    expect(gl.level).toBe('normal')
    expect(gl.peak?.level).toBe('alert')
  })

  it('keeps reporting gauges that have no listed position', () => {
    const p = gs.find((g) => g.id === 'putupaula')!
    expect(p.lat).toBeNull()
    expect(p.basin).toBe('Kalu Ganga')
  })

  it('sorts the worst gauge first', () => {
    expect(gs[0].id).toBe('hanwella')
  })

  it('counts gauges by level over the last two hours, like the department', () => {
    expect(gaugeSummary(gs, NOW)).toEqual({ stations: 2, reporting: 2, alert: 0, minor: 1, major: 0 })
  })

  it('drops duplicate timestamps, keeping the later row', () => {
    const [g] = buildGauges([], [row('X', 1, 1), row('X', 1, 1.4)], NOW)
    expect(g.series).toHaveLength(1)
    expect(g.latest?.level).toBe(1.4)
  })

  it('groups rain by Sri Lanka day', () => {
    // 18:00 UTC is 23:30 in Colombo; two hours later it is 01:30 the next day.
    const d = Date.UTC(2026, 9, 26, 18, 0)
    expect(dailyRain([{ time: d, level: null, rain: 3 }, { time: d + 2 * H, level: null, rain: 4 }])).toEqual([['2026-10-26', 3], ['2026-10-27', 4]])
  })

  it('raises signals for gauges at alert or flood level', () => {
    const alerts = buildAlerts([], [], 'en', gs)
    expect(alerts).toHaveLength(1)
    expect(alerts[0]).toMatchObject({ id: 'gauge-hanwella', level: 'warning', kind: 'river', href: '/gauges/hanwella', title: 'Minor flood level' })
    expect(alerts[0].detail).toContain('3.10 m')
    expect(buildAlerts([], [], 'si', gs)[0].title).toBe('සුළු ගංවතුර මට්ටම')
  })
})

describe('ArcGIS queries', () => {
  it('asks for JSON without geometry', () => {
    const u = queryUrl('https://example.com/FeatureServer/0', { where: "gauge <> 'X'" })
    expect(u).toContain('/query?f=json&returnGeometry=false&where=gauge%20%3C%3E%20\'X\'')
  })
})
