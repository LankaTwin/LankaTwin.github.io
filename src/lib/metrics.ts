// Map variables, colour scales, thresholds and weather-code text.

export type MetricId = 'temp' | 'feels' | 'rain24' | 'rainNext24' | 'humidity' | 'gust' | 'aqi' | 'pm25'

export interface Metric {
  id: MetricId
  label: string
  short: string
  unit: string
  decimals: number
  /** Ascending [upper bound, colour, legend label] steps. The last bound is Infinity. */
  steps: [number, string, string][]
  help: string
}

export const METRICS: Record<MetricId, Metric> = {
  temp: {
    id: 'temp', label: 'Air temperature', short: 'Temp', unit: '°', decimals: 0,
    steps: [[20, '#3b78c9', '<20'], [24, '#3fa3ad', '20–24'], [27, '#5f9e4a', '24–27'], [30, '#c99a1c', '27–30'], [33, '#d9692a', '30–33'], [Infinity, '#c23a2e', '33+']],
    help: 'Temperature 2 m above ground, °C, latest 15-minute model step.',
  },
  feels: {
    id: 'feels', label: 'Feels like', short: 'Feels', unit: '°', decimals: 0,
    steps: [[27, '#5f9e4a', '<27'], [33, '#c99a1c', '27–32'], [39, '#d9692a', '33–38'], [42, '#c23a2e', '39–41'], [Infinity, '#7d1f3f', '42+']],
    help: 'Apparent temperature combining heat, humidity and wind, °C. Bands loosely follow the Department of Meteorology heat index advisory.',
  },
  rain24: {
    id: 'rain24', label: 'Rain, last 24 h', short: 'Rain 24h', unit: 'mm', decimals: 0,
    steps: [[0.5, '#8a9ca1', 'dry'], [5, '#5aa6cf', '<5'], [25, '#2f86c0', '5–25'], [50, '#2156a3', '25–50'], [100, '#5a3ca5', '50–100'], [150, '#a3339b', '100–150'], [Infinity, '#c23a2e', '150+']],
    help: 'Accumulated precipitation over the past 24 hours, mm (model analysis, not rain-gauge totals).',
  },
  rainNext24: {
    id: 'rainNext24', label: 'Rain, next 24 h', short: 'Next 24h', unit: 'mm', decimals: 0,
    steps: [[0.5, '#8a9ca1', 'dry'], [5, '#5aa6cf', '<5'], [25, '#2f86c0', '5–25'], [50, '#2156a3', '25–50'], [100, '#5a3ca5', '50–100'], [150, '#a3339b', '100–150'], [Infinity, '#c23a2e', '150+']],
    help: 'Forecast precipitation for the coming 24 hours, mm.',
  },
  humidity: {
    id: 'humidity', label: 'Relative humidity', short: 'Humidity', unit: '%', decimals: 0,
    steps: [[50, '#b5893a', '<50'], [65, '#8f9b4a', '50–65'], [80, '#3fa3ad', '65–80'], [90, '#2f86c0', '80–90'], [Infinity, '#2156a3', '90+']],
    help: 'Relative humidity at 2 m, %.',
  },
  gust: {
    id: 'gust', label: 'Wind gusts', short: 'Gusts', unit: 'km/h', decimals: 0,
    steps: [[20, '#6f9aa0', '<20'], [35, '#3fa3ad', '20–35'], [50, '#c99a1c', '35–50'], [70, '#d9692a', '50–70'], [Infinity, '#c23a2e', '70+']],
    help: 'Maximum wind gust at 10 m, km/h.',
  },
  aqi: {
    id: 'aqi', label: 'Air quality (US AQI)', short: 'AQI', unit: '', decimals: 0,
    steps: [[51, '#3f9a3c', 'Good'], [101, '#c9a21c', 'Moderate'], [151, '#e07b2e', 'Sensitive'], [201, '#c23a2e', 'Unhealthy'], [301, '#7d3c98', 'Very unhealthy'], [Infinity, '#7e0023', 'Hazardous']],
    help: 'US EPA Air Quality Index from the CAMS atmospheric model. Modelled, not measured at a monitor.',
  },
  pm25: {
    id: 'pm25', label: 'PM2.5', short: 'PM2.5', unit: 'µg', decimals: 0,
    steps: [[15, '#3f9a3c', '<15'], [25, '#8f9b4a', '15–25'], [37.5, '#c9a21c', '25–37'], [50, '#e07b2e', '37–50'], [75, '#c23a2e', '50–75'], [Infinity, '#7d3c98', '75+']],
    help: 'Fine particulate matter, µg/m³. Bands follow WHO interim targets for 24-hour exposure.',
  },
}

export const METRIC_ORDER: MetricId[] = ['temp', 'feels', 'rain24', 'rainNext24', 'humidity', 'gust', 'aqi', 'pm25']

export function colorFor(metric: Metric, v: number | null | undefined) {
  if (v == null || Number.isNaN(v)) return '#9aa7aa'
  for (const [max, c] of metric.steps) if (v < max) return c
  return metric.steps[metric.steps.length - 1][1]
}

export function bandFor(metric: Metric, v: number | null | undefined) {
  if (v == null || Number.isNaN(v)) return '—'
  for (const [max, , label] of metric.steps) if (v < max) return label
  return metric.steps[metric.steps.length - 1][2]
}

export function fmt(v: number | null | undefined, decimals = 0) {
  if (v == null || Number.isNaN(v)) return '—'
  return v.toLocaleString('en-LK', { maximumFractionDigits: decimals, minimumFractionDigits: decimals })
}

// ---------- Rivers ----------

export type RiverLevel = 'normal' | 'elevated' | 'high' | 'very-high'

export const RIVER_LEVELS: Record<RiverLevel, { label: string; color: string }> = {
  normal: { label: 'Normal', color: '#3fa3ad' },
  elevated: { label: 'Elevated', color: '#c99a1c' },
  high: { label: 'High', color: '#d9692a' },
  'very-high': { label: 'Very high', color: '#c23a2e' },
}

/** Forecast peak divided by the recent median gives a crude, unitless rise indicator. */
export function riverLevel(ratio: number | null): RiverLevel {
  if (ratio == null) return 'normal'
  if (ratio >= 5) return 'very-high'
  if (ratio >= 3) return 'high'
  if (ratio >= 1.8) return 'elevated'
  return 'normal'
}

// ---------- WMO weather codes ----------

const WMO: Record<number, string> = {
  0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Fog', 48: 'Rime fog',
  51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle', 56: 'Freezing drizzle', 57: 'Freezing drizzle',
  61: 'Light rain', 63: 'Rain', 65: 'Heavy rain', 66: 'Freezing rain', 67: 'Freezing rain',
  71: 'Light snow', 73: 'Snow', 75: 'Heavy snow', 77: 'Snow grains',
  80: 'Light showers', 81: 'Showers', 82: 'Violent showers', 85: 'Snow showers', 86: 'Snow showers',
  95: 'Thunderstorm', 96: 'Thunderstorm, hail', 99: 'Severe thunderstorm, hail',
}
export const weatherText = (code: number | null | undefined) => (code == null ? '—' : WMO[code] ?? `Code ${code}`)

export function compass(deg: number | null | undefined) {
  if (deg == null) return ''
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
  return dirs[Math.round(deg / 22.5) % 16]
}

/** Readable text colour on top of a fill. */
export function inkOn(hex: string) {
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  return 0.299 * r + 0.587 * g + 0.114 * b > 165 ? '#12262e' : '#ffffff'
}
