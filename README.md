# LankaTwin — Lankan Technical Weather Information Network

![LankaTwin — live weather, rivers, floods and air for Sri Lanka](public/og/home.jpg)

**Live at [lankatwin.github.io](https://lankatwin.github.io/)**

**A free, open-source window onto Sri Lanka's weather, rivers, air and land — running entirely in your browser.**

LankaTwin stands for **Lankan Technical Weather Information Network**: TWIN is short for Technical Weather Information Network.
It pulls live, open data (forecast models, satellite imagery, Irrigation Department river gauges and air quality) straight from
the publishers into an interactive map and charts, with no server and no running cost on GitHub Pages.

## What it does

- **Live map** of all 25 district capitals plus Negombo: temperature, feels-like, rain in the last and next 24 h, humidity, gusts, US AQI and PM2.5, colour-coded on the map.
- **Official river gauges** (`/gauges`): live hourly water levels and rainfall from the Irrigation Department's hydrometric stations (the data behind its [Realtime Water Level in Major River](https://www.arcgis.com/apps/dashboards/2cffe83c9ff5497d97375498bdf3ff38) dashboard): station and alert/minor/major flood counts, basin → station picker, current level with trend, 3-day level chart against the gauge's flood levels, daily rainfall, hourly-update and flood-level lists for the last 4 days, last-hour and 24-hour rainfall rankings, CSV export. Gauges also appear on the main map, raise signals, and feed the live and floods pages; river basins, rivers and mapped flood areas can be shown as map layers.
- **Rivers**: modelled discharge at 14 points on the Kelani, Kalu, Gin, Nilwala, Walawe, Mahaweli, Deduru, Malwathu and other rivers, with a rise indicator comparing the 10-day forecast peak with the past 30 days.
- **Satellite overlays** from NASA GIBS: MODIS true colour (any date), 8-day NDVI, IMERG rain rate, land surface temperature.
- **Place pages**: 24 h / 7 d / 30 d charts for temperature, rain, humidity, wind, air quality and soil moisture; a 7-day forecast; this month's rain against the past decade (ERA5); and solar energy received (NASA POWER).
- **Compare** up to five places on one chart; **signals** for heavy rain, heat stress, strong gusts, poor air and rising rivers.
- **Search** (press `/` or `Ctrl K`) in English, Sinhala or Tamil; **Near me** finds your closest town; **star** places to keep them on top.
- **Images**: a photo of every town from Wikipedia (credited to its Commons author), real landscape photos from Wikimedia Commons served as small WebP files (`public/photos`, built by `scripts/photos.py`), drawn landscapes when offline, weather icons, and a daily MODIS satellite image of the whole island.
- **Forecast detail**: next-24-hour strip, 7-day outlook with UV and gusts, the current monsoon season, and the rivers near each town.
- **Share and embed**: a share menu on every key screen (WhatsApp, Facebook, X, Telegram, Viber, LinkedIn, email, SMS, copy link or copy a ready-made summary; the system share sheet on phones), and a live `<iframe>` widget for other sites (`/embed/<place>`).
- **Search-friendly**: real URLs, with an HTML file per page (12 sections, 26 towns, 14 river points and every river gauge) carrying its own title, description, canonical link, Open Graph and Twitter tags, share image and schema.org data (WebSite, Organization, WebApplication, Place, Dataset, BreadcrumbList); `sitemap.xml` and `robots.txt` are generated with the build.
- **Logo and loading**: a mark drawn from Sri Lanka's real coastline (Natural Earth), app icons for every platform, a branded splash while the app loads, and blur-up placeholders for images.
- **Safety**: emergency numbers (117, 119, 110, 1990) and opt-in browser notifications for new warnings while the app is open.
- **Live dashboard** (`/live`): KPI tiles, a running alert feed (new, escalated and cleared signals with times), town and river boards, a refresh countdown, full screen, keep-screen-on and an optional chime for new warnings. A warning banner and a signal badge in the header show on every page.
- **Phones first**: bottom tab bar (Map, Live, Floods, Signals, More), card layouts in place of wide tables, safe-area padding for notched screens.
- **Floods**: a screening flood-risk score for every town (rain, nearest river, elevation), a flood-risk overlay and the NASA MODIS near-real-time flood-water layer on the map, rivers running high, and before/during/after flood guidance with emergency numbers (117, 119, 110, 1990, 1919).
- **Any spot**: tap anywhere on the map for its elevation (Copernicus 90 m DEM), weather, air quality, modelled river flow and flood risk; the spot is kept in the URL so it can be shared.
- **Air quality page**: US AQI, PM2.5, PM10, ozone, NO₂, dust and UV for every town, with health advice for each AQI band.
- **Three languages**: the whole interface in English, Sinhala and Tamil, including place and river names, weather descriptions, dates and chart axes. See [`docs/TRANSLATIONS.md`](docs/TRANSLATIONS.md) to help review the translations.
- **Public API** (`/api/v1/`, documented at `/developers`): weather, air, flood risk, rivers, official gauges and signals as JSON, CSV, GeoJSON and Atom, rebuilt hourly, no key. See [API](#api) below.
- CSV and PNG export, dark mode, mobile layout, offline banner, installable and readable offline (PWA).

> LankaTwin is unofficial. For warnings follow the Department of Meteorology and the Disaster Management Centre (hotline 117).

## Run it

```bash
npm install
npm run dev
npm test          # unit tests
npm run brand     # redraw the logo, icons and share images in public/ (needs Playwright)
```

## API

A free, read-only API built from the same code as the app, documented with live "Try it" panels at **[lankatwin.github.io/developers](https://lankatwin.github.io/developers)**.

```bash
curl -s https://lankatwin.github.io/api/v1/snapshot.json
```

| File | What |
|---|---|
| `index.json`, `openapi.json`, `status.json` | Catalogue, OpenAPI 3.1 document, build status of each upstream feed |
| `snapshot.json` | Island headline: extremes, flood-risk and river levels, gauge and signal counts |
| `places.json` / `.geojson`, `places/{id}.json` | The 26 towns; everything about one town in one call |
| `weather.json` / `.csv`, `air.json` / `.csv` | Current weather and air quality for every town |
| `flood-risk.json` / `.csv` | The 0–100 flood-risk screening score and its parts |
| `rivers.json` / `.csv` / `.geojson`, `rivers/{id}.json` | GloFAS discharge, forecast peak and rise indicator; full daily series |
| `gauges.json` / `.csv` / `.geojson`, `gauges/{id}.json` | Irrigation Department gauge levels, status and flood levels; 4 days of readings |
| `alerts.json` / `.csv`, `alerts.atom`, `alerts.si.atom`, `alerts.ta.atom` | Signals in English, Sinhala and Tamil |
| `methodology.json`, `sources.json` | Thresholds behind every signal; sources and licences |

**How it works:** GitHub Pages can't run code, so the API is static files. `scripts/static-api.ts` runs at the end of every build: it reads each upstream feed once, shapes the data with the app's own modules (`src/lib/readings.ts`, `src/lib/publicApi.ts`) and writes `dist/api/v1/`. The deploy workflow rebuilds every hour, so however many clients there are, each upstream service gets one request per feed per hour. The endpoint list in `src/lib/apiSpec.ts` drives the files, the OpenAPI document and the docs page. If a feed fails, its files are carried over from the live site and marked `"stale": true`; `status.json` says which feed failed. Set `LT_API_OFFLINE=1` to build without network.

## Deploy to GitHub Pages

1. In **Settings → Pages**, set **Source** to **GitHub Actions**.
2. Push to `main`. `.github/workflows/deploy.yml` tests, builds and publishes to `https://lankatwin.github.io/`, and runs again every hour (at :23) to refresh the API. GitHub pauses scheduled workflows after 60 days without repository activity; re-enable it in the **Actions** tab if that happens.

Pull requests run `.github/workflows/ci.yml`: typecheck, unit tests (`npm test`), a production build with checks on the API and security policy, `npm audit` and dependency review. CodeQL scans every change.

## Security

Every page carries a strict Content Security Policy, workflows are pinned to commit SHAs with least-privilege permissions, and dependencies are audited on each change. See [`SECURITY.md`](SECURITY.md) for what is protected and how, and to report a vulnerability privately.

The site is served from the domain root with real paths (`/station/kandy`). The build writes an HTML file for every page with its own title, description, share image and schema.org data, plus `sitemap.xml`, `robots.txt` and a `404.html` that boots the app for any other path (see `scripts/seo-pages.ts`). Old `#/` links are redirected. To serve from a sub-path or another domain, change `base` in `vite.config.ts` and `SITE.url` in `src/lib/seo.ts`.

## Stack

Vite · React 19 · TypeScript · Tailwind CSS 4 · MapLibre GL · Apache ECharts · TanStack Query · Zustand · vite-plugin-pwa

## Data

| Source | Used for |
|---|---|
| [Open-Meteo](https://open-meteo.com) Forecast, Air Quality, Flood, Historical | Weather, CAMS air quality, GloFAS river discharge, ERA5 baseline |
| [NASA POWER](https://power.larc.nasa.gov) | Daily solar irradiance |
| [NASA GIBS](https://nasa-gibs.github.io/gibs-api-docs/) | Satellite overlays |
| [CARTO](https://carto.com/basemaps) / OpenStreetMap | Basemap |
| [Wikipedia](https://en.wikipedia.org) / [Wikimedia Commons](https://commons.wikimedia.org) | Place and landscape photos, credited per image |
| [Open-Meteo Elevation](https://open-meteo.com/en/docs/elevation-api) (Copernicus DEM GLO-90) | Elevation of towns and tapped spots |
| [Cloudinary](https://cloudinary.com) | Hosting of the link-preview image and fetch delivery of town photos (`src/lib/cloudinary.ts`) |

Full licences and attribution are on the in-app **Sources** page. National sources (Meteorology, Irrigation, DMC, data.gov.lk) are
planned through scheduled snapshots — see [`docs/DATA_CONNECTORS.md`](docs/DATA_CONNECTORS.md).

## Docs

- [Architecture](docs/ARCHITECTURE.md)
- [Adding a data connector](docs/DATA_CONNECTORS.md)
- [Translations](docs/TRANSLATIONS.md)
- [Contributing](CONTRIBUTING.md)

## Licence

Code: MIT. Data remains under its publishers' licences (mostly CC BY 4.0 and NASA public domain).
