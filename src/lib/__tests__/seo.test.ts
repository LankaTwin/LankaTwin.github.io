/// <reference types="node" />
import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { allPages, bodyHtml, headTags, pageMeta, SITE } from '../seo'
import { STATIONS, RIVER_POINTS } from '../places'
import { markSvg } from '../../brand/logo'

const gauges = [{ id: 'hanwella', name: 'Hanwella', basin: 'Kelani Ganga', lat: 6.91, lon: 80.08 }]
const pages = allPages(gauges)

describe('page metadata', () => {
  it('covers every section, town, river point and gauge', () => {
    expect(pages).toHaveLength(12 + STATIONS.length + RIVER_POINTS.length + gauges.length)
    for (const p of ['/', '/live', '/floods', '/gauges', '/rivers', '/air', '/stations', '/compare', '/alerts', '/sources', '/about']) expect(pageMeta(p)?.path).toBe(p)
  })

  it('keeps titles and descriptions within what search results show', () => {
    for (const p of pages) {
      expect(p.title.length, p.path).toBeLessThanOrEqual(65)
      expect(p.description.length, p.path).toBeGreaterThanOrEqual(70)
      expect(p.description.length, p.path).toBeLessThanOrEqual(160)
    }
  })

  it('gives every page its own title, description and URL', () => {
    for (const k of ['title', 'description', 'path'] as const) expect(new Set(pages.map((p) => p[k])).size, k).toBe(pages.length)
  })

  it('points at share images that exist', () => {
    for (const p of pages) expect(existsSync(`public${p.image}`), p.image).toBe(true)
  })

  it('names the site by its full name in the structured data', () => {
    const graph = pageMeta('/')!.jsonLd
    for (const t of ['Organization', 'WebSite', 'WebApplication']) {
      expect((graph.find((x) => x['@type'] === t) as Record<string, unknown>).alternateName, t).toBe('Lankan Technical Weather Information Network')
    }
    expect(pageMeta('/about')!.title).toContain('Lankan Technical Weather Information Network')
  })

  it('ignores trailing slashes and leaves unknown paths unindexed', () => {
    expect(pageMeta('/floods/')?.path).toBe('/floods')
    expect(pageMeta('/station/nowhere')).toBeUndefined()
    expect(pageMeta('/embed/kandy')).toBeUndefined()
  })

  it('describes a town as a Place with coordinates and breadcrumbs', () => {
    const m = pageMeta('/station/kandy')!
    const place = m.jsonLd.find((x) => x['@type'] === 'Place') as Record<string, unknown>
    expect(place.geo).toEqual({ '@type': 'GeoCoordinates', latitude: 7.2906, longitude: 80.6337 })
    expect(place.alternateName).toEqual(['මහනුවර', 'கண்டி'])
    expect(m.breadcrumbs.map(([, p]) => p)).toEqual(['/', '/stations', '/station/kandy'])
  })
})

describe('html', () => {
  it('writes absolute canonical, share and image URLs and valid JSON-LD', () => {
    const html = headTags(pageMeta('/gauges/hanwella', gauges)!)
    expect(html).toContain(`<link rel="canonical" href="${SITE.url}/gauges/hanwella" />`)
    expect(html).toContain(`<meta property="og:image" content="${SITE.url}/og/gauges.jpg" />`)
    const ld = JSON.parse(html.match(/<script type="application\/ld\+json">(.*)<\/script>/)![1])
    expect(ld['@context']).toBe('https://schema.org')
    expect(ld['@graph'].map((x: { '@type': string }) => x['@type'])).toContain('BreadcrumbList')
  })

  it('escapes text and keeps </script> out of the JSON-LD', () => {
    const m = { ...pageMeta('/')!, title: 'A & "B" <c>', description: 'x</script><b>' + 'y'.repeat(80), jsonLd: [{ name: '</script>' }] }
    const html = headTags(m)
    expect(html).toContain('content="A &amp; &quot;B&quot; &lt;c>"')
    expect(html.match(/<\/script>/g)).toHaveLength(1)
    expect(bodyHtml(m)).not.toContain('<b>')
  })

  it('marks the fallback page noindex without a canonical link', () => {
    const html = headTags(pageMeta('/')!, { noindex: true })
    expect(html).toContain('content="noindex, follow"')
    expect(html).not.toContain('rel="canonical"')
  })

  it('links every pre-rendered page to the rest of the site', () => {
    const body = bodyHtml(pageMeta('/stations')!)
    for (const s of STATIONS) expect(body).toContain(`href="/station/${s.id}"`)
  })
})

describe('logo', () => {
  it('is a self-contained 64×64 SVG with unique ids per copy', () => {
    const a = markSvg({ id: 'a' }), b = markSvg({ id: 'b', detail: true })
    expect(a).toMatch(/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" viewBox="0 0 64 64"/)
    expect(a).toContain('id="a-g"')
    expect(b).toContain('url(#b-g)')
    expect(b.length).toBeGreaterThan(a.length)
  })
})
