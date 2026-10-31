// Vite plugin: the public LankaTwin API. After each build it reads the upstream feeds once
// (Open-Meteo weather, air and GloFAS; the Irrigation Department's gauges), shapes them with the
// app's own code and writes static files under dist/api/v1/. The deploy workflow rebuilds every
// hour, so thousands of clients cost the upstream services one request per feed per hour.
//
// A feed that fails doesn't blank the API: files that depend on it are carried over from the
// live site, flagged `stale: true`, and status.json says which feed failed and why.
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { createServer, type Plugin, type ResolvedConfig } from 'vite'

type Api = typeof import('../src/lib/api.ts')
type Gauges = typeof import('../src/lib/gauges.ts')
type Readings = typeof import('../src/lib/readings.ts')
type Pub = typeof import('../src/lib/publicApi.ts')
type Spec = typeof import('../src/lib/apiSpec.ts')
type Places = typeof import('../src/lib/places.ts')
type Seo = typeof import('../src/lib/seo.ts')
interface Mods { api: Api; gauges: Gauges; readings: Readings; pub: Pub; spec: Spec; places: Places; seo: Seo }

async function load(): Promise<Mods> {
  const vite = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
  try {
    const m = (p: string) => vite.ssrLoadModule(p)
    return {
      api: (await m('/src/lib/api.ts')) as Api,
      gauges: (await m('/src/lib/gauges.ts')) as Gauges,
      readings: (await m('/src/lib/readings.ts')) as Readings,
      pub: (await m('/src/lib/publicApi.ts')) as Pub,
      spec: (await m('/src/lib/apiSpec.ts')) as Spec,
      places: (await m('/src/lib/places.ts')) as Places,
      seo: (await m('/src/lib/seo.ts')) as Seo,
    }
  } finally {
    await vite.close()
  }
}

type Feed = 'weather' | 'air' | 'rivers' | 'gauges'
interface FeedResult<T> { ok: boolean; value?: T; ms: number; error?: string }

async function timed<T>(fn: () => Promise<T>): Promise<FeedResult<T>> {
  const t0 = Date.now()
  try {
    return { ok: true, value: await fn(), ms: Date.now() - t0 }
  } catch (e) {
    // Upstream error text is trimmed: it ends up in a public file.
    return { ok: false, ms: Date.now() - t0, error: String((e as Error).message ?? e).replace(/[^\x20-\x7e]/g, '').slice(0, 160) }
  }
}

/**
 * Feeds each data file needs: all of `all`, and at least one of `any`. Without them the previous
 * build's file is served instead. Signals and the snapshot still come out when only the weather
 * or only the official gauges answered, with the rest listed in `missing`.
 */
const NEEDS: Record<string, { all?: Feed[]; any?: Feed[] }> = {
  places: {}, place: { all: ['weather'] }, weather: { all: ['weather'] }, air: { all: ['weather', 'air'] },
  'flood-risk': { all: ['weather'] }, rivers: { all: ['rivers'] }, river: { all: ['rivers'] },
  gauges: { all: ['gauges'] }, gauge: { all: ['gauges'] },
  snapshot: { any: ['weather', 'gauges'] }, alerts: { any: ['weather', 'gauges'] },
}
const needed = (id: string) => [...(NEEDS[id]?.all ?? []), ...(NEEDS[id]?.any ?? [])]

export default function staticApi(opts: { offline?: boolean } = {}): Plugin {
  let config: ResolvedConfig
  return {
    name: 'lankatwin-static-api',
    configResolved(c) { config = c },
    async closeBundle() {
      if (config.command !== 'build') return
      const offline = opts.offline || process.env.LT_API_OFFLINE === '1'
      const { api, gauges: G, readings: R, pub: P, spec: S, places: PL, seo } = await load()
      const site = seo.SITE.url
      const out = join(config.build.outDir, 'api', 'v1')
      const now = new Date()
      const written: string[] = []
      const write = (file: string, body: string) => {
        const p = join(out, file)
        mkdirSync(dirname(p), { recursive: true })
        writeFileSync(p, body)
        written.push(file)
      }
      const json = (x: unknown) => JSON.stringify(x)
      const fail = <T,>(): Promise<T> => Promise.reject(new Error('offline build'))

      // ---- Feeds, in parallel ----
      const [weather, air, rivers, gauges] = await Promise.all([
        timed(() => (offline ? fail<Awaited<ReturnType<Api['fetchNowcast']>>>() : api.fetchNowcast(PL.STATIONS))),
        timed(() => (offline ? fail<Awaited<ReturnType<Api['fetchAirNow']>>>() : api.fetchAirNow(PL.STATIONS))),
        timed(() => (offline ? fail<Awaited<ReturnType<Api['fetchRivers']>>>() : api.fetchRivers(PL.RIVER_POINTS))),
        timed(async () => {
          if (offline) return fail<ReturnType<Gauges['buildGauges']>>()
          const [st, rd] = await Promise.all([G.fetchGaugeStations(), G.fetchGaugeReadings(4)])
          return G.buildGauges(st, rd, now.getTime())
        }),
      ])
      const feeds: Record<Feed, FeedResult<unknown>> = { weather, air, rivers, gauges }
      const missing = (Object.keys(feeds) as Feed[]).filter((f) => !feeds[f].ok)

      const riverReadings = rivers.ok ? R.buildRivers(rivers.value!) : undefined
      const readings = weather.ok ? R.buildReadings(weather.value!, air.value, riverReadings) : undefined
      const gaugeList = gauges.value
      const alerts = P.alertsOf(readings, riverReadings, gaugeList)

      const env = <T,>(path: string, data: T, feedsUsed: Feed[]) =>
        json(P.envelope(site, path, data, { now, feeds: feedsUsed, missing: feedsUsed.filter((f) => missing.includes(f)) }))

      // ---- Fallback to the previous build for files whose feed failed ----
      const carried: string[] = []
      async function carryOver(file: string): Promise<boolean> {
        if (offline) return false
        try {
          const res = await fetch(`${site}/api/v1/${file}`, { signal: AbortSignal.timeout(15000), redirect: 'error' })
          if (!res.ok) return false
          let body = await res.text()
          if (file.endsWith('.json') || file.endsWith('.geojson')) {
            const prev = JSON.parse(body) as Record<string, unknown>
            if (!prev || typeof prev !== 'object' || !('data' in prev)) return false
            body = json({ ...prev, stale: true, missing })
          }
          write(file, body)
          carried.push(file)
          return true
        } catch {
          return false
        }
      }
      /** Writes a file whose feeds answered, or carries the last good one over. */
      async function emit(id: string, file: string, make: () => string | undefined) {
        const n = NEEDS[id] ?? {}
        const ok = (n.all ?? []).every((f) => feeds[f].ok) && (!n.any || n.any.some((f) => feeds[f].ok))
        const body = ok ? make() : undefined
        if (body != null) return write(file, body)
        if (await carryOver(file)) return
        // Nothing to carry over (first build, or offline): an honest empty file.
        if (file.endsWith('.json')) write(file, json({ ...P.envelope(site, file, null, { now, feeds: needed(id), missing }), stale: true }))
      }

      const placeRow = (r: ReturnType<typeof R.buildReadings>[number]) => {
        const m = P.placeMeta(r.station)
        return { place: { id: m.id, name: m.name, names: m.names, district: m.district, lat: m.lat, lon: m.lon } }
      }

      // ---- Data files ----
      await emit('places', 'places.json', () => env('places.json', PL.STATIONS.map(P.placeMeta), []))
      await emit('places', 'places.geojson', () => {
        const byId = new Map(readings?.map((r) => [r.station.id, r]))
        const rows = PL.STATIONS.map((s) => {
          const r = byId.get(s.id)
          return { ...P.placeMeta(s), temperature_c: r?.values.temp ?? null, rain_past_24h_mm: r?.values.rain24 ?? null, rain_next_24h_mm: r?.values.rainNext24 ?? null, us_aqi: r?.values.aqi ?? null, flood_risk: r?.flood?.score ?? null, flood_level: r?.flood?.level ?? null }
        })
        return json({ ...P.geojson(rows), metadata: P.envelope(site, 'places.geojson', undefined, { now, feeds: ['weather', 'air', 'rivers'], missing }) })
      })
      await emit('snapshot', 'snapshot.json', () => env('snapshot.json', P.snapshotOf(readings, riverReadings, gaugeList, alerts, now.getTime()), ['weather', 'air', 'rivers', 'gauges']))
      await emit('weather', 'weather.json', () => env('weather.json', readings!.map((r) => ({ ...placeRow(r), ...P.weatherOf(r) })), ['weather']))
      await emit('weather', 'weather.csv', () => P.toCsv(readings!.map((r) => P.flat({ place_id: r.station.id, place: r.station.name, district: r.station.district, lat: r.station.lat, lon: r.station.lon, ...P.weatherOf(r) }))))
      await emit('air', 'air.json', () => env('air.json', readings!.map((r) => ({ ...placeRow(r), ...P.airOf(r) })), ['air']))
      await emit('air', 'air.csv', () => P.toCsv(readings!.map((r) => ({ place_id: r.station.id, place: r.station.name, district: r.station.district, lat: r.station.lat, lon: r.station.lon, ...P.airOf(r) }))))
      await emit('flood-risk', 'flood-risk.json', () => env('flood-risk.json', readings!.map((r) => ({ ...placeRow(r), ...P.floodOf(r, riverReadings) })), ['weather', 'rivers']))
      await emit('flood-risk', 'flood-risk.csv', () => P.toCsv(readings!.map((r) => {
        const f = P.floodOf(r, riverReadings)
        return { place_id: r.station.id, place: r.station.name, district: r.station.district, score: f?.score, level: f?.level, rain_points: f?.parts.rain, river_points: f?.parts.river, terrain_points: f?.parts.terrain, nearest_river: f?.inputs.river?.id, river_ratio: f?.inputs.river?.ratio, elevation_m: f?.inputs.elevation_m }
      })))
      await emit('rivers', 'rivers.json', () => env('rivers.json', riverReadings!.map(P.riverOf), ['rivers']))
      await emit('rivers', 'rivers.csv', () => P.toCsv(riverReadings!.map((r) => { const { names: _n, ...rest } = P.riverOf(r); return rest })))
      await emit('rivers', 'rivers.geojson', () => json({ ...P.geojson(riverReadings!.map(P.riverOf)), metadata: P.envelope(site, 'rivers.geojson', undefined, { now, feeds: ['rivers'] }) }))
      for (const p of PL.RIVER_POINTS) {
        await emit('river', `rivers/${p.id}.json`, () => {
          const r = riverReadings?.find((x) => x.point.id === p.id)
          return r && env(`rivers/${p.id}.json`, P.riverDetail(r), ['rivers'])
        })
      }
      await emit('gauges', 'gauges.json', () => env('gauges.json', { summary: G.gaugeSummary(gaugeList!, now.getTime()), gauges: gaugeList!.map(P.gaugeOf) }, ['gauges']))
      await emit('gauges', 'gauges.csv', () => P.toCsv(gaugeList!.map((g) => {
        const x = P.gaugeOf(g)
        return { id: x.id, name: x.name, basin: x.basin, lat: x.lat, lon: x.lon, unit: x.unit, status: x.status, stale: x.stale, latest_time: x.latest?.time, latest_level: x.latest?.level, latest_rain_mm: x.latest?.rain_mm, change: x.change, trend: x.trend, rain_1h_mm: x.rain_1h_mm, rain_24h_mm: x.rain_24h_mm, alert_level: x.thresholds.alert, minor_flood_level: x.thresholds.minor, major_flood_level: x.thresholds.major }
      })))
      await emit('gauges', 'gauges.geojson', () => json({ ...P.geojson(gaugeList!.map(P.gaugeOf)), metadata: P.envelope(site, 'gauges.geojson', undefined, { now, feeds: ['gauges'] }) }))

      // Gauge ids come from the feed; when it failed, from the last published list.
      let gaugeIds = gaugeList?.map((g) => g.id)
      if (!gaugeIds && !offline) {
        try {
          const prev = (await (await fetch(`${site}/api/v1/gauges.json`, { signal: AbortSignal.timeout(15000) })).json()) as { data?: { gauges?: { id: string }[] } }
          gaugeIds = prev.data?.gauges?.map((g) => g.id).filter((id) => /^[a-z0-9-]{1,80}$/.test(id))
        } catch { /* no gauge files this time */ }
      }
      for (const id of gaugeIds ?? []) {
        await emit('gauge', `gauges/${id}.json`, () => {
          const g = gaugeList?.find((x) => x.id === id)
          return g && env(`gauges/${id}.json`, P.gaugeDetail(g), ['gauges'])
        })
      }

      for (const s of PL.STATIONS) {
        await emit('place', `places/${s.id}.json`, () => {
          const r = readings?.find((x) => x.station.id === s.id)
          return r && env(`places/${s.id}.json`, P.placeDetail(r, riverReadings, alerts), ['weather', 'air', 'rivers', 'gauges'])
        })
      }
      await emit('alerts', 'alerts.json', () => env('alerts.json', alerts, ['weather', 'air', 'rivers', 'gauges']))
      await emit('alerts', 'alerts.csv', () => P.toCsv(alerts.map((a) => ({ id: a.id, level: a.level, kind: a.kind, place_id: a.place_id, place: a.place.en, title: a.title.en, detail: a.detail.en, url: `${site}${a.url}` }))))
      for (const lang of ['en', 'si', 'ta'] as const) {
        await emit('alerts', `alerts${lang === 'en' ? '' : `.${lang}`}.atom`, () => P.alertsAtom(site, alerts, now, lang))
      }

      // ---- Reference and catalogue ----
      write('methodology.json', env('methodology.json', P.methodology(), []))
      write('sources.json', env('sources.json', P.sourcesList(), []))
      const ids = { place: PL.STATIONS.map((s) => s.id), river: PL.RIVER_POINTS.map((r) => r.id), gauge: gaugeIds ?? [] }
      write('openapi.json', JSON.stringify(S.openApi(site, ids), null, 1))
      write('index.json', env('index.json', {
        base_url: `${site}${P.API_BASE_PATH}`,
        refresh_minutes: P.API_REFRESH_MINUTES,
        docs: `${site}/developers`,
        openapi: `${site}${P.API_BASE_PATH}/openapi.json`,
        endpoints: S.ENDPOINTS.map((e) => ({
          id: e.id, group: e.group, summary: e.summary, description: e.description,
          formats: Object.fromEntries(e.formats.map((f) => [f, S.urlFor(site, e, f)])),
          ...(e.param ? { ids: ids[e.param] } : {}),
        })),
      }, []))
      write('status.json', json({
        api: { name: 'LankaTwin API', version: P.API_VERSION, docs: `${site}/developers` },
        generated_at: now.toISOString(),
        next_update: new Date(now.getTime() + P.API_REFRESH_MINUTES * 60_000).toISOString(),
        ok: missing.length === 0,
        feeds: (Object.keys(feeds) as Feed[]).map((f) => ({ id: f, name: P.FEEDS[f].name, ok: feeds[f].ok, ms: feeds[f].ms, ...(feeds[f].error ? { error: feeds[f].error } : {}) })),
        files: written.length + 1,
        carried_over: carried,
      }))
      console.log(`[api] wrote ${written.length + 1} files to /api/v1/${missing.length ? ` (failed feeds: ${missing.join(', ')}; carried over ${carried.length} files)` : ''}`)
    },
  }
}
