# Architecture

```
Browser
 └─ Static SPA on GitHub Pages (Vite build, real paths, PWA service worker, strict CSP)
     ├─ TanStack Query  ── polls and caches every source (default 10 min)
     ├─ Zustand         ── UI settings persisted to localStorage
     ├─ MapLibre GL     ── CARTO vector basemap + NASA GIBS WMS raster overlays + HTML value chips
     └─ ECharts         ── time series, anomaly and solar charts
          │
          ▼  direct fetch(), CORS-enabled, no keys
     Open-Meteo Forecast · Air Quality (CAMS) · Flood (GloFAS) · Historical (ERA5)
     NASA POWER · NASA GIBS · CARTO basemaps · Irrigation Department gauges (ArcGIS)

Build (GitHub Actions, on every push and hourly)
 └─ vite build
     ├─ scripts/seo-pages.ts   ── one HTML file per page, sitemap.xml, robots.txt, 404.html
     ├─ scripts/static-api.ts  ── reads each feed once, writes the public API to /api/v1/
     └─ scripts/csp.ts         ── Content Security Policy <meta> (hashed inline scripts), security.txt
```

The app and the API share their data shaping: `src/lib/readings.ts` (towns and rivers), `src/lib/gauges.ts`,
`src/lib/flood.ts` and `src/lib/alerts.ts` run in the browser and, through Vite's SSR loader, in the build.

## Folders

| Path | What lives there |
|---|---|
| `src/lib/api.ts` | One function per upstream request. Open-Meteo calls batch all 26 towns into one request. |
| `src/lib/places.ts` | The 26 towns and 14 river points. Add a place here and it appears everywhere. |
| `src/lib/metrics.ts` | Map variables, colour scales, river levels, weather-code text. |
| `src/lib/alerts.ts` | Screening thresholds and the rules that produce "signals". |
| `src/lib/sources.ts` | The data catalogue shown on the Sources page. |
| `src/lib/readings.ts` | Turns raw responses into `StationReading` / `RiverReading` objects (pure, shared with the API build). |
| `src/hooks/useLiveData.ts` | The TanStack Query hooks that poll the sources and call `readings.ts`. |
| `src/lib/publicApi.ts` | The public API's shapes, envelope, CSV, GeoJSON and Atom writers. |
| `src/lib/apiSpec.ts` | The list of API endpoints: drives the files, `openapi.json`, `index.json` and the `/developers` page. |
| `src/components/` | Map, chart, layout, alert list, small UI primitives. |
| `src/pages/` | Route screens; all except the map are lazy-loaded. |

## Request budget

A visitor with the map open makes 3 requests per refresh (weather, air, rivers), each covering every location.
Open-Meteo counts multi-location calls per location, so the default 10-minute refresh uses about 52 weight per refresh
per visitor. Station pages add 4 requests on open. This sits comfortably within Open-Meteo's free non-commercial limits for
a public-interest site; if traffic grows, raise `refreshMinutes` or point heavy users at the public API, which costs each
upstream one request per feed per hour however many clients read it.

## Time

All API timestamps are requested in `Asia/Colombo` and kept as wall-clock strings, so charts show Sri Lankan time on any device.

## Offline

`vite-plugin-pwa` precaches the app shell and uses network-first caching for API responses (3 days) and cache-first for
basemap tiles (30 days). If the network drops, the last good data stays visible with its "Updated … ago" label.
