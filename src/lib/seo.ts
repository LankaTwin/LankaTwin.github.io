// Search and link-preview metadata for every page: titles, descriptions, share images and
// schema.org structured data. Used at build time to write a real HTML file per page (so
// crawlers and chat apps see the right title and image without running JavaScript) and at
// run time to keep the head in step as people move around the app.
import { RIVER_POINTS, STATIONS, stationById, riverById, type RiverPoint, type Station } from './places'

export const SITE = {
  url: 'https://lankatwin.github.io',
  name: 'LankaTwin',
  tagline: 'Live weather, rivers, floods and air quality for Sri Lanka',
  repo: 'https://github.com/LankaTwin/LankaTwin.github.io',
  locale: 'en_LK',
  themeColor: '#0E6E78',
}

export interface PageMeta {
  /** App path without a trailing slash, e.g. /station/kandy. */
  path: string
  title: string
  description: string
  /** Headline for the pre-rendered page body. */
  h1: string
  /** Share image path under public/, 1200×630. */
  image: string
  imageAlt: string
  /** Other pages worth linking from the pre-rendered body. */
  links: [string, string][]
  breadcrumbs: [string, string][]
  jsonLd: Record<string, unknown>[]
  /** How often the page's data changes, for the sitemap. */
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly'
  priority: number
}

export const abs = (path: string) => `${SITE.url}${path === '/' ? '/' : path}`

const ORG = {
  '@type': 'Organization',
  '@id': `${SITE.url}/#org`,
  name: SITE.name,
  url: `${SITE.url}/`,
  logo: { '@type': 'ImageObject', url: `${SITE.url}/icon-512.png`, width: 512, height: 512 },
  sameAs: [SITE.repo],
}

const WEBSITE = {
  '@type': 'WebSite',
  '@id': `${SITE.url}/#website`,
  name: SITE.name,
  url: `${SITE.url}/`,
  description: SITE.tagline,
  inLanguage: ['en', 'si', 'ta'],
  publisher: { '@id': `${SITE.url}/#org` },
}

const LK = { '@type': 'Country', name: 'Sri Lanka', identifier: 'LK' }

function crumbs(list: [string, string][]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: list.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: abs(path) })),
  }
}

function webPage(path: string, name: string, description: string, extra: Record<string, unknown> = {}) {
  return {
    '@type': 'WebPage',
    '@id': `${abs(path)}#page`,
    url: abs(path),
    name,
    description,
    isPartOf: { '@id': `${SITE.url}/#website` },
    inLanguage: 'en',
    ...extra,
  }
}

const SECTIONS: [string, string][] = [
  ['Live map', '/'],
  ['Live dashboard', '/live'],
  ['Floods', '/floods'],
  ['River gauges', '/gauges'],
  ['Rivers', '/rivers'],
  ['Air quality', '/air'],
  ['All places', '/stations'],
  ['Compare places', '/compare'],
  ['Signals and alerts', '/alerts'],
  ['Data sources', '/sources'],
  ['About', '/about'],
]

const townLinks = (): [string, string][] => STATIONS.map((s) => [`${s.name} weather`, `/station/${s.id}`])
const riverLinks = (): [string, string][] => RIVER_POINTS.map((r) => [`${r.river} at ${r.near}`, `/rivers/${r.id}`])

interface Section { title: string; h1: string; description: string; image: string; changefreq: PageMeta['changefreq']; priority: number; links?: () => [string, string][]; ld?: () => Record<string, unknown>[] }

const S: Record<string, Section> = {
  '/': {
    title: 'LankaTwin — Sri Lanka weather, floods, rivers and air, live',
    h1: 'Sri Lanka, live',
    description: 'Free live map of Sri Lanka: weather, rain, river gauges, flood risk, air quality and satellite views for every district, in English, Sinhala and Tamil.',
    image: '/og/home.jpg', changefreq: 'hourly', priority: 1, links: townLinks,
    ld: () => [{
      '@type': 'WebApplication',
      name: SITE.name,
      url: `${SITE.url}/`,
      applicationCategory: 'UtilitiesApplication',
      applicationSubCategory: 'Weather and flood monitoring',
      operatingSystem: 'Any (web browser)',
      browserRequirements: 'Requires JavaScript and WebGL',
      inLanguage: ['en', 'si', 'ta'],
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'LKR' },
      license: 'https://opensource.org/licenses/MIT',
      spatialCoverage: LK,
      publisher: { '@id': `${SITE.url}/#org` },
    }],
  },
  '/live': {
    title: 'Live dashboard — Sri Lanka weather, rivers and alerts',
    h1: 'Live dashboard',
    description: 'Real-time Sri Lanka dashboard: active warnings, rain, heat, river gauges, flood risk and air quality for 26 towns, refreshing on its own. Full-screen ready.',
    image: '/og/live.jpg', changefreq: 'always', priority: 0.9,
  },
  '/floods': {
    title: 'Sri Lanka flood risk, flood map and flood safety',
    h1: 'Floods in Sri Lanka',
    description: 'Flood risk for every Sri Lankan town, official river levels, the NASA flood map, and what to do before, during and after a flood. Emergency: 117, 119, 1990.',
    image: '/og/floods.jpg', changefreq: 'hourly', priority: 0.9,
  },
  '/gauges': {
    title: 'Sri Lanka river water levels — live Irrigation Dept. gauges',
    h1: 'River gauges',
    description: 'Hourly water levels and rainfall at the Irrigation Department’s river gauges across Sri Lanka, with each gauge’s alert, minor and major flood levels.',
    image: '/og/gauges.jpg', changefreq: 'hourly', priority: 0.9,
    ld: () => [{
      '@type': 'Dataset',
      name: 'Realtime water level in major rivers of Sri Lanka',
      description: 'Hourly river water level and rainfall at the Irrigation Department’s hydrometric stations, with each gauge’s alert, minor flood and major flood thresholds.',
      url: abs('/gauges'),
      creator: { '@type': 'GovernmentOrganization', name: 'Irrigation Department, Sri Lanka', url: 'https://www.irrigation.gov.lk' },
      isAccessibleForFree: true,
      spatialCoverage: LK,
      temporalCoverage: 'P4D',
      variableMeasured: ['River water level', 'Rainfall'],
      distribution: [{ '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: 'https://services3.arcgis.com/J7ZFXmR8rSmQ3FGf/arcgis/rest/services/gauges_2_view/FeatureServer/0' }],
    }],
  },
  '/rivers': {
    title: 'Sri Lanka rivers — discharge forecast and flood signals',
    h1: 'Rivers',
    description: 'Daily river flow at 14 points on the Kelani, Kalu, Gin, Nilwala, Walawe, Mahaweli and other rivers, with a 10-day Copernicus GloFAS forecast.',
    image: '/og/rivers.jpg', changefreq: 'daily', priority: 0.8, links: riverLinks,
  },
  '/air': {
    title: 'Sri Lanka air quality now — AQI, PM2.5 and PM10 by town',
    h1: 'Air quality',
    description: 'US AQI, PM2.5, PM10, ozone, nitrogen dioxide, dust and UV for 26 Sri Lankan towns, updated hourly, with health advice for each air quality band.',
    image: '/og/air.jpg', changefreq: 'hourly', priority: 0.8,
  },
  '/stations': {
    title: 'All places — weather in every Sri Lankan district capital',
    h1: 'All places',
    description: 'Current weather, rain, wind and air quality for all 25 district capitals of Sri Lanka and Negombo, side by side and sortable.',
    image: '/og/places.jpg', changefreq: 'hourly', priority: 0.8, links: townLinks,
  },
  '/compare': {
    title: 'Compare Sri Lankan towns — temperature, rain and air',
    h1: 'Compare places',
    description: 'Put up to five Sri Lankan towns on one chart and compare temperature, feels-like, rain, humidity, wind and air quality over the past days and the forecast.',
    image: '/og/compare.jpg', changefreq: 'daily', priority: 0.5,
  },
  '/alerts': {
    title: 'Sri Lanka weather and flood alerts, and emergency numbers',
    h1: 'Signals',
    description: 'Signals for heavy rain, floods, storms, heat, strong gusts, poor air and rivers at flood level across Sri Lanka, with thresholds and emergency numbers.',
    image: '/og/alerts.jpg', changefreq: 'hourly', priority: 0.7,
  },
  '/sources': {
    title: 'Data sources and licences — LankaTwin',
    h1: 'Data sources',
    description: 'Where LankaTwin’s data comes from — Open-Meteo, Copernicus, ECMWF, NASA, Sri Lanka’s Irrigation Department, OpenStreetMap — with refresh rates and licences.',
    image: '/og/sources.jpg', changefreq: 'monthly', priority: 0.4,
  },
  '/about': {
    title: 'About LankaTwin — an open-source environmental twin of Sri Lanka',
    h1: 'About LankaTwin',
    description: 'How LankaTwin works, its limits, settings and languages, and how to contribute. Free and open source; official warnings come from DoM and the DMC.',
    image: '/og/about.jpg', changefreq: 'monthly', priority: 0.4,
  },
}

function section(path: string): PageMeta | undefined {
  const s = S[path]
  if (!s) return undefined
  const name = SECTIONS.find(([, p]) => p === path)?.[0] ?? s.h1
  const bc: [string, string][] = path === '/' ? [['LankaTwin', '/']] : [['LankaTwin', '/'], [name, path]]
  return {
    path, title: s.title, description: s.description, h1: s.h1, image: s.image,
    imageAlt: `${s.h1} — LankaTwin`,
    links: [...SECTIONS.filter(([, p]) => p !== path), ...(s.links?.() ?? [])],
    breadcrumbs: bc,
    changefreq: s.changefreq, priority: s.priority,
    jsonLd: [ORG, WEBSITE, webPage(path, s.title, s.description), ...(path === '/' ? [] : [crumbs(bc)]), ...(s.ld?.() ?? [])],
  }
}

function station(st: Station): PageMeta {
  const path = `/station/${st.id}`
  const title = `${st.name} weather now — rain, air quality, forecast`
  const description = `Live weather, rain, wind, air quality and flood risk in ${st.name}, ${st.district} District, Sri Lanka, with a 7-day forecast and nearby rivers.`
  const bc: [string, string][] = [['LankaTwin', '/'], ['All places', '/stations'], [st.name, path]]
  return {
    path, title, description, h1: `${st.name} (${st.si} · ${st.ta})`, image: `/og/station-${st.id}.jpg`,
    imageAlt: `${st.name} on a map of Sri Lanka — LankaTwin`,
    links: [...STATIONS.filter((s) => s.id !== st.id && s.province === st.province).map((s) => [`${s.name} weather`, `/station/${s.id}`] as [string, string]), ...SECTIONS],
    breadcrumbs: bc, changefreq: 'hourly', priority: 0.8,
    jsonLd: [ORG, WEBSITE, webPage(path, title, description, { about: { '@id': `${abs(path)}#place` } }), crumbs(bc), {
      '@type': 'Place',
      '@id': `${abs(path)}#place`,
      name: st.name,
      alternateName: [st.si, st.ta],
      geo: { '@type': 'GeoCoordinates', latitude: st.lat, longitude: st.lon },
      address: { '@type': 'PostalAddress', addressLocality: st.name, addressRegion: `${st.province} Province`, addressCountry: 'LK' },
      containedInPlace: { '@type': 'AdministrativeArea', name: `${st.district} District` },
      sameAs: `https://en.wikipedia.org/wiki/${encodeURIComponent(st.wiki.replace(/ /g, '_'))}`,
    }],
  }
}

function river(r: RiverPoint): PageMeta {
  const path = `/rivers/${r.id}`
  const title = `${r.river} at ${r.near} — river flow forecast`
  const description = `Daily flow of the ${r.river} at ${r.near}, Sri Lanka: today, the 30-day median and the 10-day Copernicus GloFAS forecast peak.`
  const bc: [string, string][] = [['LankaTwin', '/'], ['Rivers', '/rivers'], [`${r.river} at ${r.near}`, path]]
  return {
    path, title, description, h1: `${r.river} at ${r.near}`, image: '/og/rivers.jpg',
    imageAlt: `${r.river} river flow — LankaTwin`,
    links: [...riverLinks().filter(([, p]) => p !== path), ...SECTIONS],
    breadcrumbs: bc, changefreq: 'daily', priority: 0.6,
    jsonLd: [ORG, WEBSITE, webPage(path, title, description), crumbs(bc), {
      '@type': 'Place',
      name: `${r.river} at ${r.near}`,
      geo: { '@type': 'GeoCoordinates', latitude: r.lat, longitude: r.lon },
      containedInPlace: { '@type': 'RiverBodyOfWater', name: r.river },
      address: { '@type': 'PostalAddress', addressCountry: 'LK' },
    }],
  }
}

export interface GaugeRef { id: string; name: string; basin: string; lat?: number | null; lon?: number | null }

function gauge(g: GaugeRef): PageMeta {
  const path = `/gauges/${g.id}`
  const title = `${g.name} river gauge — live water level`
  const description = `Hourly water level and rainfall at the ${g.name} gauge (${g.basin}, Sri Lanka) against its alert, minor and major flood levels.`
  const bc: [string, string][] = [['LankaTwin', '/'], ['River gauges', '/gauges'], [g.name, path]]
  return {
    path, title, description, h1: `${g.name} hydrometric station`, image: '/og/gauges.jpg',
    imageAlt: `${g.name} river gauge — LankaTwin`,
    links: SECTIONS, breadcrumbs: bc, changefreq: 'hourly', priority: 0.6,
    jsonLd: [ORG, WEBSITE, webPage(path, title, description), crumbs(bc), ...(g.lat != null && g.lon != null ? [{
      '@type': 'Place', name: `${g.name} hydrometric station`,
      geo: { '@type': 'GeoCoordinates', latitude: g.lat, longitude: g.lon },
      containedInPlace: { '@type': 'RiverBodyOfWater', name: g.basin },
      address: { '@type': 'PostalAddress', addressCountry: 'LK' },
    }] : [])],
  }
}

/** Metadata for an app path, or undefined for paths that should not be indexed. */
export function pageMeta(path: string, gauges: GaugeRef[] = []): PageMeta | undefined {
  const p = path.replace(/\/+$/, '') || '/'
  if (S[p]) return section(p)
  const m = p.match(/^\/(station|rivers|gauges)\/([^/]+)$/)
  if (!m) return undefined
  if (m[1] === 'station') { const st = stationById(m[2]); return st && station(st) }
  if (m[1] === 'rivers') { const r = riverById(m[2]); return r && river(r) }
  const g = gauges.find((x) => x.id === m[2])
  return g ? gauge(g) : { ...section('/gauges')!, path: p }
}

/** Every indexable page, for the build. */
export function allPages(gauges: GaugeRef[] = []): PageMeta[] {
  return [
    ...Object.keys(S).map((p) => section(p)!),
    ...STATIONS.map(station),
    ...RIVER_POINTS.map(river),
    ...gauges.map(gauge),
  ]
}

/** Sections that get their own share image. */
export const OG_SECTIONS = Object.entries(S).map(([path, s]) => ({ path, file: s.image, h1: s.h1, description: s.description }))

// ---------- HTML for the build and the runtime head ----------

const attr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
const text = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')

/** The <head> tags for a page (title excluded), as the build writes them. */
export function headTags(m: PageMeta, { noindex = false } = {}) {
  const url = abs(m.path)
  const img = `${SITE.url}${m.image}`
  const tags = [
    `<meta name="description" content="${attr(m.description)}" />`,
    `<meta name="robots" content="${noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large, max-snippet:-1'}" />`,
    noindex ? '' : `<link rel="canonical" href="${url}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${SITE.name}" />`,
    `<meta property="og:locale" content="${SITE.locale}" />`,
    `<meta property="og:locale:alternate" content="si_LK" />`,
    `<meta property="og:locale:alternate" content="ta_LK" />`,
    `<meta property="og:title" content="${attr(m.title)}" />`,
    `<meta property="og:description" content="${attr(m.description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${img}" />`,
    `<meta property="og:image:type" content="image/jpeg" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${attr(m.imageAlt)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${attr(m.title)}" />`,
    `<meta name="twitter:description" content="${attr(m.description)}" />`,
    `<meta name="twitter:image" content="${img}" />`,
    `<meta name="twitter:image:alt" content="${attr(m.imageAlt)}" />`,
    `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': m.jsonLd }).replace(/</g, '\\u003c')}</script>`,
  ]
  return tags.filter(Boolean).join('\n    ')
}

/**
 * The page as plain HTML inside #root: headline, summary, breadcrumbs and links. Search
 * engines and people without JavaScript read it; React replaces it when the app starts.
 */
export function bodyHtml(m: PageMeta) {
  const crumbs = m.breadcrumbs.length > 1
    ? `<nav aria-label="Breadcrumb"><ol>${m.breadcrumbs.map(([n, p]) => `<li><a href="${p}">${text(n)}</a></li>`).join('')}</ol></nav>`
    : ''
  return `<div class="lt-static">
      <header><a href="/" class="lt-static-brand">LankaTwin</a></header>
      <main>
        ${crumbs}
        <h1>${text(m.h1)}</h1>
        <p>${text(m.description)}</p>
        <p><strong>LankaTwin needs JavaScript to show live data.</strong> It is free, unofficial and open source; for official warnings follow the <a href="https://www.meteo.gov.lk">Department of Meteorology</a> and the <a href="https://www.dmc.gov.lk">Disaster Management Centre</a> (hotline 117).</p>
        <ul>${m.links.map(([n, p]) => `<li><a href="${p}">${text(n)}</a></li>`).join('')}</ul>
      </main>
      <footer><a href="${SITE.repo}">Source on GitHub</a></footer>
    </div>`
}

/** title, description, canonical, og:url/title/description/image and JSON-LD, updated in place. */
export function applyHead(m: PageMeta, title: string) {
  const set = (sel: string, name: string, value: string) => {
    let el = document.head.querySelector<HTMLElement>(sel)
    if (!el) { el = document.createElement(sel.startsWith('link') ? 'link' : 'meta'); document.head.appendChild(el) }
    el.setAttribute(name, value)
    return el
  }
  const url = abs(m.path)
  const img = `${SITE.url}${m.image}`
  set('meta[name="description"]', 'content', m.description).setAttribute('name', 'description')
  set('link[rel="canonical"]', 'href', url).setAttribute('rel', 'canonical')
  for (const [p, v] of [['og:title', title], ['og:description', m.description], ['og:url', url], ['og:image', img], ['og:image:alt', m.imageAlt]] as const) {
    set(`meta[property="${p}"]`, 'content', v).setAttribute('property', p)
  }
  for (const [p, v] of [['twitter:title', title], ['twitter:description', m.description], ['twitter:image', img]] as const) {
    set(`meta[name="${p}"]`, 'content', v).setAttribute('name', p)
  }
  let ld = document.head.querySelector<HTMLScriptElement>('script[type="application/ld+json"]')
  if (!ld) { ld = document.createElement('script'); ld.type = 'application/ld+json'; document.head.appendChild(ld) }
  ld.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': m.jsonLd })
}
