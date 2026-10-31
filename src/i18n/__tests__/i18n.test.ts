import { describe, expect, it } from 'vitest'
import { DICTS, rich, tFor, type Lang } from '../core'
import en from '../en'
import { buildAlerts } from '../../lib/alerts'
import { stationById } from '../../lib/places'
import type { StationReading } from '../../hooks/useLiveData'

const holes = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()
const SINHALA = /[඀-෿]/
const TAMIL = /[஀-௿]/
// Values that are the same in every language: only placeholders, units, codes and brand names.
const isUniversal = (v: string) => /^[\s\W\d]*$/.test(v.replace(/\{\w+\}|US AQI|AQI|PM2\.5|µg\/m³|°C|LankaTwin|API/g, ''))

describe('translations', () => {
  for (const lang of ['si', 'ta'] as Lang[]) {
    const d = DICTS[lang]
    const script = lang === 'si' ? SINHALA : TAMIL

    it(`${lang} has every English key and nothing extra`, () => {
      expect(Object.keys(d).sort()).toEqual(Object.keys(en).sort())
    })

    it(`${lang} keeps the same {placeholders} as English`, () => {
      const bad = Object.keys(en).filter((k) => holes(en[k as keyof typeof en]).join() !== holes(d[k as keyof typeof d]).join())
      expect(bad).toEqual([])
    })

    it(`${lang} strings are written in ${lang === 'si' ? 'Sinhala' : 'Tamil'} script`, () => {
      const untranslated = Object.entries(d).filter(([, v]) => v.trim() && !script.test(v) && !isUniversal(v)).map(([k]) => k)
      expect(untranslated).toEqual([])
    })
  }

  it('fills placeholders and falls back to the key for unknown ones', () => {
    expect(tFor('en')('common.district', { name: 'Kandy' })).toBe('Kandy District')
    expect(tFor('si')('common.district', { name: 'මහනුවර' })).toBe('මහනුවර දිස්ත්‍රික්කය')
    expect(tFor('en')('search.none')).toBe('Nothing matches “{q}”.')
  })

  it('splices React nodes into a translated sentence', () => {
    const parts = rich('Follow the {dom} now', { dom: 'DoM' }) as unknown[]
    expect(parts).toHaveLength(3)
  })

  it('builds signals in the interface language', () => {
    const r = {
      station: stationById('galle')!, time: '', elevation: 5, weatherCode: 63, isDay: true, windSpeed: 0, windDir: 0, cloud: 0, pressure: 0,
      tMax: 0, tMin: 0, feelsMaxToday: 0, feelsMaxTomorrow: 0, rainProbNext24: 0, uvMax: 0, gustMaxToday: 0,
      values: { temp: 28, feels: 30, rain24: 0, rainNext24: 120, flood: 0, humidity: 90, gust: 10, aqi: 20, pm25: 5 },
    } as StationReading
    const [si] = buildAlerts([r], [], 'si')
    expect(si.place).toBe('ගාල්ල')
    expect(si.title).toBe('තද වැසි')
    const [ta] = buildAlerts([r], [], 'ta')
    expect(ta.place).toBe('காலி')
    expect(ta.detail).toContain('120')
  })
})
