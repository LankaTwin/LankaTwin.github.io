import { RIVER_POINTS, STATIONS } from './places'
import { DICTS } from '../i18n/core'
import type { Key } from '../i18n/en'

export interface SearchItem {
  id: string
  kind: 'place' | 'river' | 'page'
  title: string
  sub: string
  href: string
  /** Lower-cased text the query is matched against. */
  haystack: string
  /** Pages: the nav label to show in the interface language. */
  navKey?: Key
}

// Pages are found by their name in any language plus a few English keywords.
const PAGES: [Key, string, string][] = [
  ['nav.map', '/', 'live map home'],
  ['nav.places', '/stations', 'all towns table districts'],
  ['nav.live', '/live', 'live dashboard real-time realtime kiosk wall screen alerts feed'],
  ['nav.floods', '/floods', 'flood risk water map support evacuation safety help 117 elevation'],
  ['nav.gauges', '/gauges', 'river gauges water level irrigation department hydrometric station alert minor major flood level rainfall basin arcgis'],
  ['nav.rivers', '/rivers', 'discharge flood glofas'],
  ['nav.air', '/air', 'air quality aqi pm2.5 pollution smog dust ozone'],
  ['nav.compare', '/compare', 'chart side by side'],
  ['nav.signals', '/alerts', 'alerts warnings emergency numbers notifications'],
  ['nav.sources', '/sources', 'data licences attribution'],
  ['nav.about', '/about', 'settings roadmap help language'],
  ['nav.developers', '/developers', 'api developers docs documentation json csv geojson atom feed openapi data download endpoint'],
]

export const SEARCH_INDEX: SearchItem[] = [
  ...STATIONS.map((s) => ({
    id: s.id, kind: 'place' as const, title: s.name, sub: `${s.district} District · ${s.province} · ${s.si} · ${s.ta}`, href: `/station/${s.id}`,
    haystack: [s.name, s.si, s.ta, s.district, s.province].join(' ').toLowerCase(),
  })),
  ...RIVER_POINTS.map((r) => ({
    id: r.id, kind: 'river' as const, title: `${r.river} at ${r.near}`, sub: `${r.basin} basin`, href: `/rivers/${r.id}`,
    haystack: [r.river, r.near, r.basin, ...r.si, ...r.ta, 'river'].join(' ').toLowerCase(),
  })),
  ...PAGES.map(([key, href, words]) => ({
    id: `page-${href}`, kind: 'page' as const, title: DICTS.en[key], sub: 'Page', href, navKey: key,
    haystack: [DICTS.en[key], DICTS.si[key], DICTS.ta[key], words].join(' ').toLowerCase(),
  })),
]

/** Rank: name starts with the query, then a word starts with it, then it appears anywhere. */
export function search(query: string, items = SEARCH_INDEX, limit = 8): SearchItem[] {
  const q = query.trim().toLowerCase()
  if (!q) return items.filter((i) => i.kind === 'place').slice(0, limit)
  const scored: [number, SearchItem][] = []
  for (const it of items) {
    const title = it.title.toLowerCase()
    let score = -1
    if (title.startsWith(q)) score = 3
    else if (it.haystack.split(/[\s,·-]+/).some((w) => w.startsWith(q))) score = 2
    else if (it.haystack.includes(q)) score = 1
    if (score >= 0) scored.push([score + (it.kind === 'place' ? 0.5 : it.kind === 'river' ? 0.25 : 0), it])
  }
  return scored.sort((a, b) => b[0] - a[0] || a[1].title.localeCompare(b[1].title)).slice(0, limit).map(([, it]) => it)
}
