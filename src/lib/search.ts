import { RIVER_POINTS, STATIONS } from './places'

export interface SearchItem {
  id: string
  kind: 'place' | 'river' | 'page'
  title: string
  sub: string
  href: string
  /** Lower-cased text the query is matched against. */
  haystack: string
}

const PAGES: [string, string, string][] = [
  ['Map', '/', 'live map home'],
  ['Places', '/stations', 'all towns table districts'],
  ['Rivers', '/rivers', 'discharge flood glofas'],
  ['Compare', '/compare', 'chart side by side'],
  ['Signals', '/alerts', 'alerts warnings emergency numbers notifications'],
  ['Sources', '/sources', 'data licences attribution'],
  ['About', '/about', 'settings roadmap help'],
]

export const SEARCH_INDEX: SearchItem[] = [
  ...STATIONS.map((s) => ({
    id: s.id, kind: 'place' as const, title: s.name, sub: `${s.district} District · ${s.province} · ${s.si} · ${s.ta}`, href: `/station/${s.id}`,
    haystack: [s.name, s.si, s.ta, s.district, s.province].join(' ').toLowerCase(),
  })),
  ...RIVER_POINTS.map((r) => ({
    id: r.id, kind: 'river' as const, title: `${r.river} at ${r.near}`, sub: `${r.basin} basin`, href: `/rivers/${r.id}`,
    haystack: [r.river, r.near, r.basin, 'river'].join(' ').toLowerCase(),
  })),
  ...PAGES.map(([title, href, words]) => ({ id: `page-${href}`, kind: 'page' as const, title, sub: 'Page', href, haystack: `${title} ${words}`.toLowerCase() })),
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
