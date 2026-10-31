// One list of the public API's endpoints. It drives the build (which files to write), the
// OpenAPI document, the index.json catalogue and the documentation page, so they can't drift.
import { API_BASE_PATH, API_REFRESH_MINUTES, API_VERSION, API_DISCLAIMER, type Feed } from './publicApi'

export type Format = 'json' | 'csv' | 'geojson' | 'atom'
export const FORMAT_TYPES: Record<Format, string> = {
  json: 'application/json', csv: 'text/csv', geojson: 'application/geo+json', atom: 'application/atom+xml',
}

export type ParamKind = 'place' | 'river' | 'gauge'
export type FieldType = 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array'
/** [name, type, description, nullable?] */
export type Field = [string, FieldType, string, boolean?]

export interface Endpoint {
  id: string
  group: 'Catalogue' | 'Weather and air' | 'Floods and rivers' | 'Signals' | 'Reference'
  /** Path under /api/v1/ without the extension; `{id}` for one item. */
  path: string
  formats: Format[]
  summary: string
  description: string
  feeds: Feed[]
  param?: ParamKind
  /** Shape of `data` (or of each item when `list`). */
  list?: boolean
  fields?: Field[]
}

const PLACE: Field[] = [
  ['id', 'string', 'Stable id, e.g. `colombo`.'],
  ['name', 'string', 'English name.'],
  ['names', 'object', 'Names in English (`en`), Sinhala (`si`) and Tamil (`ta`).'],
  ['district', 'string', 'District.'],
  ['province', 'string', 'Province.'],
  ['lat', 'number', 'Latitude, WGS84.'],
  ['lon', 'number', 'Longitude, WGS84.'],
  ['zone', 'string', '`coast`, `hills` or `plains`.'],
  ['url', 'string', 'Path of the place’s page on the site.'],
]

const WEATHER: Field[] = [
  ['time', 'string', 'Model time step, ISO 8601 with the +05:30 offset.', true],
  ['elevation_m', 'number', 'Ground elevation, metres (Copernicus DEM).', true],
  ['temperature_c', 'number', 'Air temperature at 2 m, °C.', true],
  ['feels_like_c', 'number', 'Apparent temperature, °C.', true],
  ['humidity_pct', 'number', 'Relative humidity, %.', true],
  ['rain_past_24h_mm', 'number', 'Rain in the 24 hours up to now, mm (model analysis).', true],
  ['rain_next_24h_mm', 'number', 'Forecast rain in the next 24 hours, mm.', true],
  ['rain_probability_next_24h_pct', 'number', 'Highest hourly chance of rain in the next 24 hours, %.', true],
  ['weather_code', 'integer', 'WMO weather code.', true],
  ['weather', 'string', 'The weather code in words.', true],
  ['is_day', 'boolean', 'Daylight at the time step.', true],
  ['wind_speed_kmh', 'number', 'Wind at 10 m, km/h.', true],
  ['wind_direction_deg', 'number', 'Direction the wind blows from, degrees.', true],
  ['wind_gust_kmh', 'number', 'Gusts at 10 m, km/h.', true],
  ['cloud_cover_pct', 'number', 'Cloud cover, %.', true],
  ['pressure_hpa', 'number', 'Surface pressure, hPa.', true],
  ['today', 'object', 'Today’s max/min temperature, highest feels-like today and tomorrow, strongest gust and UV index max.'],
]

const AIR: Field[] = [
  ['time', 'string', 'Model hour, ISO 8601.', true],
  ['us_aqi', 'integer', 'US EPA Air Quality Index.', true],
  ['category', 'string', '`Good`, `Moderate`, `Sensitive`, `Unhealthy`, `Very unhealthy` or `Hazardous`.', true],
  ['pm2_5_ugm3', 'number', 'PM2.5, µg/m³.', true],
  ['pm10_ugm3', 'number', 'PM10, µg/m³.', true],
  ['ozone_ugm3', 'number', 'Ozone, µg/m³.', true],
  ['no2_ugm3', 'number', 'Nitrogen dioxide, µg/m³.', true],
  ['dust_ugm3', 'number', 'Dust, µg/m³.', true],
  ['uv_index', 'number', 'UV index.', true],
]

const FLOOD: Field[] = [
  ['score', 'integer', 'Flood-risk screening score, 0–100.'],
  ['level', 'string', '`low`, `moderate`, `high` or `very-high`.'],
  ['parts', 'object', 'Points from `rain`, `river` and `terrain`.'],
  ['inputs', 'object', 'Rain past/next 24 h, the nearest river point and its ratio, and elevation.'],
]

const RIVER: Field[] = [
  ['id', 'string', 'River point id, e.g. `kelani-hanwella`.'],
  ['river', 'string', 'River name.'],
  ['near', 'string', 'Nearby town.'],
  ['basin', 'string', 'Basin.'],
  ['names', 'object', 'River, town and basin in `en`, `si` and `ta`.'],
  ['lat', 'number', 'Latitude.'],
  ['lon', 'number', 'Longitude.'],
  ['date', 'string', 'Today’s date in the series (YYYY-MM-DD).', true],
  ['discharge_today_m3s', 'number', 'Modelled discharge today, m³/s.', true],
  ['median_30d_m3s', 'number', 'Median discharge over the past 30 days, m³/s.', true],
  ['peak_10d_m3s', 'number', 'Highest forecast discharge in the next 10 days, m³/s.', true],
  ['peak_date', 'string', 'Date of that peak.', true],
  ['ensemble_max_peak_m3s', 'number', 'Highest ensemble-maximum discharge in the next 10 days, m³/s.', true],
  ['ratio', 'number', 'Peak ÷ median: the rise indicator.', true],
  ['level', 'string', '`normal`, `elevated` (≥1.8), `high` (≥3) or `very-high` (≥5).'],
]

const GAUGE: Field[] = [
  ['id', 'string', 'Gauge id from its name, e.g. `nagalagam-street`.'],
  ['name', 'string', 'Gauge name as the Irrigation Department publishes it.'],
  ['basin', 'string', 'River basin.'],
  ['lat', 'number', 'Latitude.', true],
  ['lon', 'number', 'Longitude.', true],
  ['unit', 'string', 'Unit of `level` and `thresholds`: `m`, or `ft` at Nagalagam Street.'],
  ['rain_only', 'boolean', 'Reports rainfall only.'],
  ['thresholds', 'object', '`alert`, `minor` and `major` flood levels in `unit`.'],
  ['status', 'string', '`normal`, `alert`, `minor` (minor flood) or `major` (major flood), from the latest water level.'],
  ['stale', 'boolean', 'No reading in the last 3 hours.'],
  ['latest', 'object', 'Latest reading: `time`, water `level` in `unit`, `rain_mm`.', true],
  ['change', 'number', 'Change since the previous reading, in `unit`.', true],
  ['trend', 'string', '`up`, `down` or `steady`.', true],
  ['rain_1h_mm', 'number', 'Rain in the past hour, mm.', true],
  ['rain_24h_mm', 'number', 'Rain in the past 24 hours, mm.', true],
  ['peak', 'object', 'Highest status and water level reached in the 4-day window: `status`, `time`, `level`, `rain_mm`.', true],
]

const ALERT: Field[] = [
  ['id', 'string', 'Stable for as long as the condition lasts, e.g. `rain-colombo`.'],
  ['level', 'string', '`warning` or `watch`.'],
  ['kind', 'string', '`rain`, `flood`, `storm`, `heat`, `wind`, `air` or `river`.'],
  ['place_id', 'string', 'Place id when the signal is for a town.', true],
  ['place', 'object', 'Where, in `en`, `si` and `ta`.'],
  ['title', 'object', 'Headline in `en`, `si` and `ta`.'],
  ['detail', 'object', 'One-line detail in `en`, `si` and `ta`.'],
  ['url', 'string', 'Path of the related page on the site.'],
]

export const ENDPOINTS: Endpoint[] = [
  {
    id: 'index', group: 'Catalogue', path: 'index', formats: ['json'], feeds: [],
    summary: 'Catalogue', description: 'Every endpoint with its URL, formats and the ids you can use in item paths. Start here.',
  },
  {
    id: 'status', group: 'Catalogue', path: 'status', formats: ['json'], feeds: [],
    summary: 'Build status', description: 'When the API was built, and whether each upstream feed answered (with timing). Check it before trusting `stale` data.',
  },
  {
    id: 'openapi', group: 'Catalogue', path: 'openapi', formats: ['json'], feeds: [],
    summary: 'OpenAPI 3.1 document', description: 'Machine-readable description of this API for code generators, Postman, Insomnia or Swagger UI.',
  },
  {
    id: 'snapshot', group: 'Weather and air', path: 'snapshot', formats: ['json'], feeds: ['weather', 'air', 'rivers', 'gauges'],
    summary: 'Island snapshot', description: 'The headline numbers for the whole island: hottest and wettest towns, worst air, flood-risk and river levels, gauge counts and signal counts.',
  },
  {
    id: 'places', group: 'Weather and air', path: 'places', formats: ['json', 'geojson'], feeds: ['weather', 'air', 'rivers'], list: true, fields: PLACE,
    summary: 'Places', description: 'The 25 district capitals and Negombo. The GeoJSON adds current temperature, rain, AQI and flood risk to each point, ready for a map.',
  },
  {
    id: 'place', group: 'Weather and air', path: 'places/{id}', formats: ['json'], feeds: ['weather', 'air', 'rivers', 'gauges'], param: 'place',
    fields: [['place', 'object', 'The place (see Places).'], ['weather', 'object', 'Current weather (see Weather).'], ['air', 'object', 'Air quality (see Air).', true], ['flood_risk', 'object', 'Flood-risk score (see Flood risk).', true], ['rivers_nearby', 'array', 'River points within 45 km with their level.'], ['alerts', 'array', 'Signals for this place.']],
    summary: 'One place', description: 'Everything for one town in one call: current weather, air quality, flood risk, nearby rivers and active signals.',
  },
  {
    id: 'weather', group: 'Weather and air', path: 'weather', formats: ['json', 'csv'], feeds: ['weather'], list: true,
    fields: [['place', 'object', 'id, name, names, district, lat, lon.'], ...WEATHER],
    summary: 'Weather now', description: 'Current conditions and today’s extremes for every place, from the best-available model blend.',
  },
  {
    id: 'air', group: 'Weather and air', path: 'air', formats: ['json', 'csv'], feeds: ['air'], list: true,
    fields: [['place', 'object', 'id, name, names, district, lat, lon.'], ...AIR],
    summary: 'Air quality now', description: 'US AQI, particulates, gases, dust and UV for every place, from Copernicus CAMS.',
  },
  {
    id: 'flood-risk', group: 'Floods and rivers', path: 'flood-risk', formats: ['json', 'csv'], feeds: ['weather', 'rivers'], list: true,
    fields: [['place', 'object', 'id, name, names, district, lat, lon.'], ...FLOOD],
    summary: 'Flood risk by town', description: 'LankaTwin’s 0–100 screening score from rain, the nearest river and how low-lying the town is. A heads-up, not a forecast.',
  },
  {
    id: 'rivers', group: 'Floods and rivers', path: 'rivers', formats: ['json', 'csv', 'geojson'], feeds: ['rivers'], list: true, fields: RIVER,
    summary: 'Rivers', description: 'Modelled daily discharge at 14 points on major rivers, with the 10-day Copernicus GloFAS forecast peak and a rise indicator.',
  },
  {
    id: 'river', group: 'Floods and rivers', path: 'rivers/{id}', formats: ['json'], feeds: ['rivers'], param: 'river',
    fields: [...RIVER, ['series', 'array', 'Daily `date`, `discharge_m3s`, `ensemble_max_m3s` and `forecast` (true after today), 45 days back and 14 ahead.']],
    summary: 'One river point', description: 'One river point with its full daily discharge series.',
  },
  {
    id: 'gauges', group: 'Floods and rivers', path: 'gauges', formats: ['json', 'csv', 'geojson'], feeds: ['gauges'], fields: GAUGE,
    summary: 'River gauges', description: 'Official hourly water levels and rainfall from the Irrigation Department’s hydrometric stations, with each gauge’s alert and flood levels. `data` holds `summary` and `gauges`.',
  },
  {
    id: 'gauge', group: 'Floods and rivers', path: 'gauges/{id}', formats: ['json'], feeds: ['gauges'], param: 'gauge',
    fields: [...GAUGE, ['series', 'array', 'Readings over the past 4 days: `time`, `level`, `rain_mm`.']],
    summary: 'One gauge', description: 'One gauge with its readings over the past four days.',
  },
  {
    id: 'alerts', group: 'Signals', path: 'alerts', formats: ['json', 'csv', 'atom'], feeds: ['weather', 'air', 'rivers', 'gauges'], list: true, fields: ALERT,
    summary: 'Signals', description: 'Heavy rain, flood risk, storms, heat, gusts, poor air, rising rivers and gauges at flood levels, in English, Sinhala and Tamil. Atom feeds: `alerts.atom`, `alerts.si.atom`, `alerts.ta.atom`.',
  },
  {
    id: 'methodology', group: 'Reference', path: 'methodology', formats: ['json'], feeds: [],
    summary: 'Thresholds and method', description: 'The thresholds behind every signal, the flood-risk weights and the river, gauge and AQI levels.',
  },
  {
    id: 'sources', group: 'Reference', path: 'sources', formats: ['json'], feeds: [],
    summary: 'Data sources', description: 'Every upstream source with its provider, refresh rate, resolution and licence.',
  },
]

export const endpointById = (id: string) => ENDPOINTS.find((e) => e.id === id)!
export const ext = (f: Format) => (f === 'atom' ? 'atom' : f)
export const fileFor = (e: Endpoint, f: Format, id?: string) => `${e.path.replace('{id}', id ?? '{id}')}.${ext(f)}`
export const urlFor = (site: string, e: Endpoint, f: Format = e.formats[0], id?: string) => `${site}${API_BASE_PATH}/${fileFor(e, f, id)}`

// ---------- OpenAPI 3.1 ----------

const schemaOf = (fields: Field[]) => ({
  type: 'object',
  properties: Object.fromEntries(fields.map(([n, t, d, nullable]) => [n, { type: nullable ? [t, 'null'] : t, description: d }])),
  required: fields.filter((f) => !f[3]).map((f) => f[0]),
})

const PARAM_DESC: Record<ParamKind, string> = {
  place: 'Place id, from `places.json` (e.g. `colombo`, `kandy`, `nuwara-eliya`).',
  river: 'River point id, from `rivers.json` (e.g. `kelani-hanwella`).',
  gauge: 'Gauge id, from `gauges.json` (e.g. `nagalagam-street`).',
}

export function openApi(site: string, ids: Partial<Record<ParamKind, string[]>> = {}) {
  const paths: Record<string, unknown> = {}
  for (const e of ENDPOINTS) {
    for (const f of e.formats) {
      const p = `/${fileFor(e, f)}`
      const data = e.fields ? (e.list ? { type: 'array', items: schemaOf(e.fields) } : schemaOf(e.fields)) : {}
      paths[p] = {
        get: {
          operationId: `${e.id}${f === 'json' ? '' : `-${f}`}`.replace(/-(\w)/g, (_m, c: string) => c.toUpperCase()),
          summary: f === 'json' ? e.summary : `${e.summary} (${f.toUpperCase()})`,
          description: e.description + (e.feeds.length ? `\n\nUpstream feeds: ${e.feeds.join(', ')}.` : ''),
          tags: [e.group],
          ...(e.param ? { parameters: [{ name: 'id', in: 'path', required: true, description: PARAM_DESC[e.param], schema: { type: 'string', pattern: '^[a-z0-9-]+$', ...(ids[e.param]?.length ? { enum: ids[e.param] } : {}) } }] } : {}),
          responses: {
            200: {
              description: 'OK',
              content: { [FORMAT_TYPES[f]]: f === 'json' && e.feeds.length ? { schema: { allOf: [{ $ref: '#/components/schemas/Envelope' }, { type: 'object', properties: { data } }] } } : { schema: f === 'json' ? { type: 'object' } : { type: 'string' } } },
            },
            404: { description: 'Unknown id or path. GitHub Pages answers with an HTML page.' },
          },
        },
      }
    }
  }
  return {
    openapi: '3.1.0',
    info: {
      title: 'LankaTwin API',
      version: API_VERSION,
      summary: 'Open weather, river, flood and air-quality data for Sri Lanka.',
      description: `Static JSON, CSV, GeoJSON and Atom files rebuilt every ${API_REFRESH_MINUTES} minutes from public sources. No key, no sign-up, CORS open to every origin. Read-only: every operation is a GET on a file.\n\n${API_DISCLAIMER}`,
      license: { name: 'Data CC BY 4.0 (see each response’s sources); code MIT', url: 'https://creativecommons.org/licenses/by/4.0/' },
      contact: { name: 'LankaTwin on GitHub', url: 'https://github.com/LankaTwin/LankaTwin.github.io/issues' },
    },
    externalDocs: { description: 'Documentation', url: `${site}/developers` },
    servers: [{ url: `${site}${API_BASE_PATH}`, description: 'GitHub Pages (CDN)' }],
    tags: [...new Set(ENDPOINTS.map((e) => e.group))].map((name) => ({ name })),
    paths,
    components: {
      schemas: {
        Envelope: {
          type: 'object',
          description: 'Every JSON data file wraps its `data` in this envelope.',
          properties: {
            api: { type: 'object', properties: { name: { type: 'string' }, version: { type: 'string' }, docs: { type: 'string', format: 'uri' }, self: { type: 'string', format: 'uri' } } },
            generated_at: { type: 'string', format: 'date-time', description: 'When this file was built.' },
            next_update: { type: 'string', format: 'date-time', description: 'When the next rebuild is due.' },
            stale: { type: 'boolean', description: 'An upstream feed failed; `data` is from the previous build.' },
            missing: { type: 'array', items: { type: 'string', enum: ['weather', 'air', 'rivers', 'gauges'] }, description: 'Feeds that failed; parts that depend on them are absent.' },
            sources: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' }, provider: { type: 'string' }, license: { type: 'string' }, url: { type: 'string', format: 'uri' } } } },
            license: { type: 'string' },
            disclaimer: { type: 'string' },
            data: {},
          },
          required: ['api', 'generated_at', 'next_update', 'stale', 'missing', 'sources', 'license', 'disclaimer', 'data'],
        },
      },
    },
  }
}
