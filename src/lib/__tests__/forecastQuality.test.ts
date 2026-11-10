import { describe, expect, it } from 'vitest'
import type { OMResponse } from '../api'
import { median, modelOutlook, MODELS, rainAgreement, seaState, trackRecord } from '../forecastQuality'

describe('model agreement', () => {
  it('is high when models agree on dry, or on wet with close totals', () => {
    expect(rainAgreement([0, 0, 0.2, 0, 0.5, 0])).toBe('high')
    expect(rainAgreement([12, 14, 10, 15, 11, 13])).toBe('high')
  })

  it('is low when models split on wet or dry, or totals are far apart', () => {
    expect(rainAgreement([0, 0.2, 0, 6, 9, 12])).toBe('low')
    expect(rainAgreement([5, 8, 60, 10, 7, 6])).toBe('low')
    expect(rainAgreement([3, 4])).toBe('low') // too few models to judge
  })

  it('is medium in between', () => {
    // Real case, Colombo 10 Nov 2026: all models wet, totals 1.4–12.5 mm.
    expect(rainAgreement([12.5, 1.4, 3.0, 4.1, 2.2, 6.0])).toBe('medium')
  })

  it('reads one outlook per day from model-suffixed columns and skips past days', () => {
    const daily: Record<string, unknown> = { time: ['2026-11-09', '2026-11-10', '2026-11-11'] }
    MODELS.forEach((m, k) => {
      daily[`precipitation_sum_${m.id}`] = [9, k < 5 ? 0 : 0.4, 10 + k]
      daily[`temperature_2m_max_${m.id}`] = [30, 30 + k * 0.4, k === 5 ? null : 31]
    })
    const days = modelOutlook({ latitude: 0, longitude: 0, daily } as unknown as OMResponse, '2026-11-10')
    expect(days.map((d) => d.date)).toEqual(['2026-11-10', '2026-11-11'])
    expect(days[0]).toMatchObject({ models: 6, wet: 0, rainMin: 0, rainMax: 0.4, tMaxMin: 30, tMaxMax: 32, agreement: 'high' })
    expect(days[1]).toMatchObject({ wet: 6, rainMin: 10, rainMax: 15, rainMedian: 12.5, tMaxMin: 31, tMaxMax: 31 })
  })

  it('leaves out days that fewer than three models cover', () => {
    const daily = { time: ['2026-11-10'], precipitation_sum_gfs_seamless: [3], precipitation_sum_ecmwf_ifs025: [4], precipitation_sum_icon_seamless: [null] }
    expect(modelOutlook({ latitude: 0, longitude: 0, daily } as unknown as OMResponse, '2026-11-10')).toEqual([])
  })

  it('takes the median', () => {
    expect(median([3, 1, 2])).toBe(2)
    expect(median([4, 1, 3, 2])).toBe(2.5)
  })
})

describe('forecast track record', () => {
  // Two complete days and a partial today. Day 1: 24 mm fell, forecast 12 mm a day ahead (both
  // wet: a hit). Day 2: dry, but 2.4 mm was forecast (a miss).
  const time: string[] = []
  const temp: number[] = [], tempF: number[] = [], rain: number[] = [], rainF: (number | null)[] = []
  for (const [day, hours, r, rf] of [['2026-11-08', 24, 1, 0.5], ['2026-11-09', 24, 0, 0.1], ['2026-11-10', 10, 2, 2]] as const) {
    for (let h = 0; h < hours; h++) {
      time.push(`${day}T${String(h).padStart(2, '0')}:00`)
      temp.push(28); tempF.push(h % 2 ? 29 : 26) // off by 1 and 2 alternately: 1.5 on average
      rain.push(r); rainF.push(rf)
    }
  }
  const r = { latitude: 0, longitude: 0, hourly: { time, temperature_2m: temp, temperature_2m_previous_day1: tempF, precipitation: rain, precipitation_previous_day1: rainF } } as unknown as OMResponse

  it('scores complete past days only', () => {
    const [s] = trackRecord(r, '2026-11-10', [1])
    expect(s).toMatchObject({ lead: 1, days: 2, wetHits: 1 })
    expect(s.tempMae).toBeCloseTo(1.5)
    expect(s.rainMae).toBeCloseTo((12 + 2.4) / 2)
  })

  it('drops leads with no data and days with missing hours', () => {
    expect(trackRecord(r, '2026-11-10', [3])).toEqual([])
    const gap = { ...r, hourly: { ...r.hourly!, precipitation_previous_day1: rainF.map((x, i) => (i === 5 ? null : x)) } } as OMResponse
    expect(trackRecord(gap, '2026-11-10', [1])[0]).toMatchObject({ days: 1, wetHits: 0 })
  })
})

describe('sea state', () => {
  it('follows the WMO wave-height bands', () => {
    expect([0.2, 0.64, 1.25, 2.5, 4, 6.5].map(seaState)).toEqual(['calm', 'slight', 'moderate', 'rough', 'veryRough', 'high'])
    expect(seaState(null)).toBeNull()
  })
})
