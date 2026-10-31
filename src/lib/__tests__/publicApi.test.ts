import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { OMResponse } from '../api'
import { ENDPOINTS, fileFor, openApi } from '../apiSpec'
import { buildGauges } from '../gauges'
import { RIVER_POINTS, STATIONS } from '../places'
import {
  airOf, alertsAtom, alertsOf, cleanText, envelope, flat, geojson, gaugeOf, localToIso, methodology,
  placeDetail, riverDetail, snapshotOf, toCsv, weatherOf,
} from '../publicApi'
import { buildReadings, buildRivers } from '../readings'
import { cspFor, CSP_HOSTS, INLINE_SCRIPTS, withInlineScripts } from '../../../scripts/csp'
import { sanitizeSettings } from '../../stores/settings'

const SITE = 'https://lankatwin.github.io'
const NOW = new Date('2026-10-31T06:15:00Z') // 11:45 in Sri Lanka

/** One Open-Meteo forecast answer: 48 h of hourly rain around 11:45 on 31 October. */
function forecast(rainPerHour: number, extra: Record<string, number> = {}): OMResponse {
  const time = Array.from({ length: 72 }, (_, h) => `2026-10-${String(30 + Math.floor(h / 24)).padStart(2, '0')}T${String(h % 24).padStart(2, '0')}:00`)
  return {
    latitude: 6.9, longitude: 79.86, elevation: 7,
    current: { time: '2026-10-31T11:45', temperature_2m: 30.04, relative_humidity_2m: 78, apparent_temperature: 35.66, precipitation: 0, rain: 0, weather_code: 3, cloud_cover: 90, wind_speed_10m: 12.3, wind_direction_10m: 225, wind_gusts_10m: 30.1, surface_pressure: 1008.6, is_day: 1, ...extra },
    hourly: { time, precipitation: time.map(() => rainPerHour), precipitation_probability: time.map((_, i) => (i % 5) * 20) },
    daily: { time: ['2026-10-30', '2026-10-31', '2026-11-01'], temperature_2m_max: [31, 31.4, 30], temperature_2m_min: [24, 24.6, 24], apparent_temperature_max: [36, 37.2, 36], precipitation_sum: [1, 2, 3], wind_gusts_10m_max: [30, 33, 31], uv_index_max: [9, 9.5, 9] },
  }
}
const air = (aqi: number): OMResponse => ({ latitude: 0, longitude: 0, current: { time: '2026-10-31T11:00', us_aqi: aqi, pm2_5: 12.34, pm10: 20, ozone: 50, nitrogen_dioxide: 8, dust: 1, uv_index: 7.1 } })
const river = (median: number, peak: number): OMResponse => {
  const days = Array.from({ length: 60 }, (_, i) => new Date(Date.UTC(2026, 8, 16 + i)).toISOString().slice(0, 10))
  const today = days.indexOf('2026-10-31')
  return { latitude: 0, longitude: 0, daily: { time: days, river_discharge: days.map((_, i) => (i === today + 3 ? peak : median)), river_discharge_max: days.map(() => peak * 1.2) } }
}

// Colombo gets 5 mm an hour (120 mm a day), everyone else stays dry; the Kelani runs at 4× its median.
const weather = STATIONS.map((s) => forecast(s.id === 'colombo' ? 5 : 0))
const airAnswers = STATIONS.map((s) => air(s.id === 'jaffna' ? 160 : 45))
const rivers = buildRivers(RIVER_POINTS.map((p) => (p.id === 'kelani-hanwella' ? river(100, 400) : river(50, 55))), RIVER_POINTS, '2026-10-31')
const readings = buildReadings(weather, airAnswers, rivers)
const gauges = buildGauges(
  [{ station: 'Hanwella', basin: 'Kelani Ganga', latitude: 6.91, longitude: 80.08 }, { station: '=HYPERLINK("x")', basin: '<b>Evil</b>', latitude: 7, longitude: 80 }],
  [
    { gauge: 'Hanwella', basin: 'Kelani Ganga', water_level: 7.1, rain_fall: 3, alertpull: 7, minorpull: 8, majorpull: 10, CreationDate: NOW.getTime() - 3_600_000 },
    { gauge: 'Hanwella', basin: 'Kelani Ganga', water_level: 8.2, rain_fall: 4, alertpull: 7, minorpull: 8, majorpull: 10, CreationDate: NOW.getTime() - 600_000 },
  ],
  NOW.getTime(),
)
const alerts = alertsOf(readings, rivers, gauges)

describe('API shapes', () => {
  it('wraps data in an envelope with credits for each feed used', () => {
    const e = envelope(SITE, 'weather.json', [1], { now: NOW, feeds: ['weather'], missing: [] })
    expect(e.api).toMatchObject({ name: 'LankaTwin API', self: `${SITE}/api/v1/weather.json`, docs: `${SITE}/developers` })
    expect(e.generated_at).toBe(NOW.toISOString())
    expect(Date.parse(e.next_update) - NOW.getTime()).toBe(3_600_000)
    expect(e.sources.map((s) => s.id)).toEqual(['forecast', 'elevation'])
    expect(e).toMatchObject({ stale: false, missing: [], data: [1] })
    expect(envelope(SITE, 'gauges.json', null, { now: NOW, feeds: ['gauges'] }).sources[0].provider).toMatch(/Irrigation Department/)
  })

  it('reports weather with units in the names, rounded, and times with the Sri Lanka offset', () => {
    const w = weatherOf(readings.find((r) => r.station.id === 'colombo')!)
    expect(w).toMatchObject({ time: '2026-10-31T11:45:00+05:30', temperature_c: 30, feels_like_c: 35.7, humidity_pct: 78, rain_past_24h_mm: 120, rain_next_24h_mm: 120, weather_code: 3, weather: 'Overcast', is_day: true, wind_gust_kmh: 30.1, elevation_m: 7 })
    expect(w.today).toMatchObject({ temperature_max_c: 31.4, uv_index_max: 9.5 })
    expect(localToIso('2026-10-31T11:45')).toBe('2026-10-31T11:45:00+05:30')
    expect(localToIso('')).toBeNull()
  })

  it('reports air with a category', () => {
    expect(airOf(readings.find((r) => r.station.id === 'jaffna')!)).toMatchObject({ us_aqi: 160, category: 'Unhealthy', pm2_5_ugm3: 12.3 })
  })

  it('gives signals in English, Sinhala and Tamil with a place id', () => {
    const rain = alerts.find((a) => a.id === 'rain-colombo')!
    expect(rain).toMatchObject({ level: 'warning', kind: 'rain', place_id: 'colombo', url: '/station/colombo' })
    expect(rain.place).toEqual({ en: 'Colombo', si: 'කොළඹ', ta: 'கொழும்பு' })
    expect(rain.title.si).toMatch(/[඀-෿]/)
    expect(rain.title.ta).toMatch(/[஀-௿]/)
    expect(alerts.some((a) => a.id === 'air-jaffna')).toBe(true)
    expect(alerts.find((a) => a.id === 'gauge-hanwella')).toMatchObject({ level: 'warning', place_id: null })
  })

  it('still builds signals from the gauges alone when the weather feed is down', () => {
    expect(alertsOf(undefined, undefined, gauges).map((a) => a.id)).toEqual(['gauge-hanwella'])
  })

  it('cleans upstream text and keeps a gauge’s status apart from its water level', () => {
    const evil = gaugeOf(gauges.find((g) => g.basin.includes('Evil'))!)
    expect(evil.basin).toBe('bEvil/b')
    const h = gaugeOf(gauges.find((g) => g.id === 'hanwella')!)
    expect(h).toMatchObject({ status: 'minor', unit: 'm', latest: { level: 8.2, rain_mm: 4 }, trend: 'up', change: 1.1 })
    expect(cleanText('a\u0000b\u001b[31mc<script>', 50)).toBe('ab[31mcscript')
    expect(cleanText('x'.repeat(500), 10)).toHaveLength(10)
  })

  it('summarises the island', () => {
    const s = snapshotOf(readings, rivers, gauges, alerts, NOW.getTime())
    expect(s.places).toBe(STATIONS.length)
    expect(s.wettest_past_24h).toMatchObject({ id: 'colombo', value: 120 })
    expect(s.worst_air).toMatchObject({ id: 'jaffna', value: 160 })
    expect(s.rivers).toMatchObject({ high: 1 })
    expect(s.gauges).toMatchObject({ minor: 1 })
    expect(s.alerts.total).toBe(alerts.length)
  })

  it('puts everything about one place in one answer', () => {
    const d = placeDetail(readings.find((r) => r.station.id === 'colombo')!, rivers, alerts)
    expect(d.place.names.si).toBe('කොළඹ')
    expect(d.flood_risk?.inputs.river?.id).toBe('kelani-hanwella')
    expect(d.rivers_nearby[0]).toMatchObject({ id: 'kelani-hanwella', level: 'high', ratio: 4 })
    expect(d.alerts.every((a) => a.place_id === 'colombo')).toBe(true)
  })

  it('marks forecast days in a river series', () => {
    const d = riverDetail(rivers.find((r) => r.point.id === 'kelani-hanwella')!)
    const today = d.series.findIndex((x) => x.date === '2026-10-31')
    expect(d.series[today].forecast).toBe(false)
    expect(d.series[today + 1].forecast).toBe(true)
    expect(d).toMatchObject({ peak_10d_m3s: 400, median_30d_m3s: 100, level: 'high', peak_date: '2026-11-03' })
  })

  it('publishes the thresholds the signals use', () => {
    const m = methodology()
    expect(m.alert_rules.rain_24h_mm).toEqual({ watch: 50, warning: 100 })
    expect(m.flood_risk.weights).toEqual({ rain: 45, river: 35, terrain: 20 })
  })
})

describe('API formats', () => {
  it('writes RFC 4180 CSV and defuses spreadsheet formulas', () => {
    const csv = toCsv([{ a: 'plain', b: 'with, comma', c: 'say "hi"' }, { a: '=HYPERLINK("http://x")', b: -3.5, c: '+1' }, { a: null, b: '@sum', c: 'line\nbreak' }])
    expect(csv.split('\r\n')[0]).toBe('a,b,c')
    expect(csv).toContain('plain,"with, comma","say ""hi"""')
    expect(csv).toContain(`"'=HYPERLINK(""http://x"")",-3.5,'+1`)
    expect(csv).toContain(`,'@sum,"line\nbreak"`)
    expect(csv.endsWith('\r\n')).toBe(true)
  })

  it('flattens one level for CSV', () => {
    expect(flat({ a: 1, today: { max: 2, min: null }, list: [1] })).toEqual({ a: 1, today_max: 2, today_min: null, list: [1] })
  })

  it('writes GeoJSON points as [lon, lat] and skips items without a position', () => {
    const g = geojson([{ id: 'a', lat: 7, lon: 80 }, { id: 'b', lat: null, lon: null }])
    expect(g.features).toHaveLength(1)
    expect(g.features[0]).toEqual({ type: 'Feature', geometry: { type: 'Point', coordinates: [80, 7] }, properties: { id: 'a' } })
  })

  it('writes an Atom feed with escaped text in each language', () => {
    const tricky = [{ ...alerts[0], place: { en: 'A & B <x>', si: 'අ', ta: 'அ' } }]
    const en = alertsAtom(SITE, tricky, NOW)
    expect(en).toContain('<title>A &amp; B &lt;x&gt;: ')
    expect(en).not.toContain('<x>')
    expect(en).toContain(`<link rel="self" type="application/atom+xml" href="${SITE}/api/v1/alerts.atom"/>`)
    expect(alertsAtom(SITE, tricky, NOW, 'si')).toContain(`${SITE}/api/v1/alerts.si.atom`)
    expect(en.match(/<entry>/g)).toHaveLength(1)
  })
})

describe('API catalogue and OpenAPI', () => {
  it('has unique ids and well-formed paths', () => {
    expect(new Set(ENDPOINTS.map((e) => e.id)).size).toBe(ENDPOINTS.length)
    for (const e of ENDPOINTS) {
      expect(e.path).toMatch(/^[a-z-]+(\/\{id\})?$/)
      expect(e.path.includes('{id}')).toBe(!!e.param)
      expect(e.formats.length).toBeGreaterThan(0)
    }
  })

  it('describes every endpoint and format in OpenAPI 3.1', () => {
    const doc = openApi(SITE, { place: STATIONS.map((s) => s.id) })
    expect(doc.openapi).toBe('3.1.0')
    expect(doc.servers[0].url).toBe(`${SITE}/api/v1`)
    const files = ENDPOINTS.flatMap((e) => e.formats.map((f) => `/${fileFor(e, f)}`))
    expect(Object.keys(doc.paths).sort()).toEqual(files.sort())
    const ops = Object.values(doc.paths).map((p) => (p as { get: { operationId: string } }).get.operationId)
    expect(new Set(ops).size).toBe(ops.length)
    const place = (doc.paths['/places/{id}.json'] as { get: { parameters: { schema: { enum: string[] } }[] } }).get
    expect(place.parameters[0].schema.enum).toContain('colombo')
  })
})

describe('Content Security Policy', () => {
  it('puts the known inline scripts in place and refuses unknown ones', () => {
    const page = '<head><!--inline:head--></head><body><!--inline:splash--><script type="application/ld+json">{}</script><script src="/x.js"></script></body>'
    const html = withInlineScripts(page)
    expect(html).toContain(`<script>${INLINE_SCRIPTS.head}</script>`)
    expect(html).toContain(`<script>${INLINE_SCRIPTS.splash}</script>`)
    expect(() => withInlineScripts(page.replace('<!--inline:splash-->', ''))).toThrow(/lost/)
    expect(() => withInlineScripts(page + '<script>evil()</script>')).toThrow(/doesn't know/)
  })

  it('allows inline scripts by hash only', () => {
    const policy = cspFor(['a()'])
    const scriptSrc = policy.split('; ').find((d) => d.startsWith('script-src'))!
    expect(scriptSrc).toMatch(/^script-src 'self' 'sha256-[A-Za-z0-9+/]+=*'$/)
    expect(scriptSrc).not.toContain('unsafe')
    expect(policy).toContain("object-src 'none'")
    expect(policy).toContain("base-uri 'self'")
  })

  it('allows every host the app fetches from, and nothing it doesn’t', () => {
    const code = ['src/lib/api.ts', 'src/lib/gauges.ts', 'src/components/MapView.tsx', 'src/lib/cloudinary.ts']
      .map((f) => readFileSync(f, 'utf8')).join('\n')
    const hosts = new Set([...code.matchAll(/https:\/\/([a-z0-9.-]+\.[a-z]{2,})/g)].map((m) => `https://${m[1]}`))
    // Pages linked to, never fetched.
    for (const link of ['https://www.arcgis.com']) hosts.delete(link)
    const allowed = new Set([...CSP_HOSTS.connect, ...CSP_HOSTS.img])
    expect([...hosts].filter((h) => !allowed.has(h))).toEqual([])
  })
})

describe('saved settings', () => {
  it('keeps valid values and drops tampered ones', () => {
    expect(sanitizeSettings({ lang: 'si', metric: 'aqi', refreshMinutes: 15, favorites: ['kandy', 'kandy', '<img>'], showRivers: false, compare: ['colombo'] }))
      .toEqual({ lang: 'si', metric: 'aqi', refreshMinutes: 15, favorites: ['kandy'], showRivers: false, compare: ['colombo'] })
    expect(sanitizeSettings({ lang: 'fr', metric: 'x', refreshMinutes: 0, overlay: 'javascript:', overlayOpacity: 9, showRivers: 'yes', compare: [] })).toEqual({})
    expect(sanitizeSettings(null)).toEqual({})
    expect(sanitizeSettings('{"lang":"si"}')).toEqual({})
  })
})
