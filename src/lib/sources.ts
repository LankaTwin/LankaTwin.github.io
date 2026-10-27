export type SourceStatus = 'live' | 'imagery' | 'planned'

export interface DataSource {
  /** Key prefix for the translated provides/refresh/note text: src.<id>.* */
  id: string
  name: string
  provider: string
  status: SourceStatus
  provides: string
  refresh: string
  resolution: string
  license: string
  url: string
  note?: string
}

export const SOURCES: DataSource[] = [
  {
    id: 'forecast', name: 'Weather Forecast API', provider: 'Open-Meteo', status: 'live',
    provides: 'Temperature, feels-like, humidity, rain, wind, cloud, pressure, soil moisture; 92 days of history plus 7-day forecast',
    refresh: 'Every 15 min (current), hourly models', resolution: 'Best-available model blend, ~1–11 km',
    license: 'CC BY 4.0', url: 'https://open-meteo.com/en/docs',
  },
  {
    id: 'air', name: 'Air Quality API', provider: 'Open-Meteo / Copernicus CAMS', status: 'live',
    provides: 'US AQI, PM2.5, PM10, ozone, NO₂, dust', refresh: 'Hourly', resolution: '~11 km (CAMS Global ~40 km)',
    license: 'CC BY 4.0, contains modified Copernicus Atmosphere Monitoring Service information', url: 'https://open-meteo.com/en/docs/air-quality-api',
  },
  {
    id: 'flood', name: 'Flood API', provider: 'Open-Meteo / Copernicus GloFAS', status: 'live',
    provides: 'Daily river discharge, 45 days back and 14 days ahead, with ensemble max', refresh: 'Daily',
    resolution: '0.05° (~5 km)', license: 'CC BY 4.0, Copernicus Emergency Management Service',
    url: 'https://open-meteo.com/en/docs/flood-api',
    note: 'Modelled discharge for small Sri Lankan basins can differ a lot from Irrigation Department gauge readings. Treat it as a trend signal.',
  },
  {
    id: 'elevation', name: 'Elevation API', provider: 'Open-Meteo / Copernicus DEM', status: 'live',
    provides: 'Ground elevation for towns and any tapped spot, from the Copernicus GLO-90 digital elevation model', refresh: 'Static',
    resolution: '90 m', license: 'CC BY 4.0; Copernicus DEM © DLR e.V. 2010–2014 and © Airbus Defence and Space GmbH 2014–2018, provided under COPERNICUS by the European Union and ESA', url: 'https://open-meteo.com/en/docs/elevation-api',
  },
  {
    id: 'archive', name: 'Historical Weather API', provider: 'Open-Meteo / ECMWF ERA5', status: 'live',
    provides: '10-year rainfall baseline for the climate-context anomaly', refresh: 'Daily, ~5-day lag', resolution: '~9–25 km',
    license: 'CC BY 4.0', url: 'https://open-meteo.com/en/docs/historical-weather-api',
  },
  {
    id: 'power', name: 'POWER Daily API', provider: 'NASA Langley', status: 'live',
    provides: 'All-sky and clear-sky solar irradiance (kWh/m²/day) for energy context', refresh: 'Daily, a few days of lag',
    resolution: '0.5° × 0.625°', license: 'Public domain (NASA)', url: 'https://power.larc.nasa.gov/docs/services/api/',
  },
  {
    id: 'gibs', name: 'GIBS WMS imagery', provider: 'NASA EOSDIS', status: 'imagery',
    provides: 'MODIS true colour, near-real-time flood water (3-day), 8-day NDVI, IMERG precipitation rate, land surface temperature', refresh: '30 min to 8 days by layer',
    resolution: '250 m – 10 km', license: 'Public domain (NASA); cite NASA EOSDIS GIBS', url: 'https://nasa-gibs.github.io/gibs-api-docs/',
  },
  {
    id: 'cloudinary', name: 'Image hosting', provider: 'Cloudinary', status: 'imagery',
    provides: 'Hosting and on-the-fly resizing and compression of the app’s images (AVIF/WebP where supported)', refresh: 'Global CDN',
    resolution: 'Sized per screen', license: 'Landscape scenes are AI-generated for LankaTwin', url: 'https://cloudinary.com',
  },
  {
    id: 'basemap', name: 'Basemap', provider: 'CARTO / OpenStreetMap contributors', status: 'imagery',
    provides: 'Vector basemap (Positron and Dark Matter styles)', refresh: 'Continuous', resolution: 'Vector',
    license: 'ODbL (OSM data), CARTO basemap terms', url: 'https://carto.com/basemaps',
  },
  {
    id: 'photos', name: 'Place photos', provider: 'Wikipedia / Wikimedia Commons', status: 'imagery',
    provides: 'The lead photo of each town’s Wikipedia article, with author and licence from Commons', refresh: 'Cached for a week',
    resolution: 'Up to 1280 px', license: 'Per image, mostly CC BY-SA; credited on each photo', url: 'https://commons.wikimedia.org',
  },
  {
    id: 'dom', name: 'Observations and warnings', provider: 'Department of Meteorology, Sri Lanka', status: 'planned',
    provides: 'Station observations, official forecasts, warnings', refresh: '—', resolution: 'Station network',
    license: 'Check with publisher', url: 'https://www.meteo.gov.lk',
    note: 'No public CORS-enabled API. Planned through the scheduled snapshot workflow described in docs/DATA_CONNECTORS.md.',
  },
  {
    id: 'irrigation', name: 'River water levels', provider: 'Irrigation Department, Sri Lanka', status: 'planned',
    provides: 'Gauge water levels and flood alert thresholds', refresh: '—', resolution: 'Gauge network',
    license: 'Check with publisher', url: 'https://www.irrigation.gov.lk',
    note: 'Requires a scheduled snapshot or a proxy; the browser cannot call it directly.',
  },
  {
    id: 'datagov', name: 'Open data portal', provider: 'data.gov.lk (CKAN)', status: 'planned',
    provides: 'Administrative and sector datasets', refresh: '—', resolution: 'Varies',
    license: 'Per dataset', url: 'https://data.gov.lk',
  },
  {
    id: 'dmc', name: 'Situation reports', provider: 'Disaster Management Centre', status: 'planned',
    provides: 'Landslide early warnings, situation reports', refresh: '—', resolution: 'District / DS division',
    license: 'Check with publisher', url: 'https://www.dmc.gov.lk',
  },
]
