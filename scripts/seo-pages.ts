// Vite plugin: one real HTML file per page, so search engines and link previews (WhatsApp,
// Facebook, X) get the right title, description, image and structured data without running
// JavaScript. Also writes sitemap.xml, robots.txt and the SPA fallback 404.html.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { createServer, type Plugin, type ResolvedConfig } from 'vite'
import type { GaugeRef, PageMeta } from '../src/lib/seo.ts'

type Seo = typeof import('../src/lib/seo.ts')
interface Mods { seo: Seo; markSvg: typeof import('../src/brand/logo.ts').markSvg; slug: typeof import('../src/lib/gauges.ts').slug }

// The app's own modules, loaded through Vite so this config never imports from src/ directly.
let mods: Promise<Mods> | undefined
function load(): Promise<Mods> {
  mods ??= (async () => {
    const vite = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
    try {
      const seo = (await vite.ssrLoadModule('/src/lib/seo.ts')) as Seo
      const { markSvg } = await vite.ssrLoadModule('/src/brand/logo.ts')
      const { slug } = await vite.ssrLoadModule('/src/lib/gauges.ts')
      return { seo, markSvg, slug }
    } finally {
      await vite.close()
    }
  })()
  return mods
}

const HYDRO = "https://services3.arcgis.com/J7ZFXmR8rSmQ3FGf/arcgis/rest/services/hydrostations/FeatureServer/0/query?f=json&where=station%20%3C%3E%20'Calidonia'%20AND%20basin%20%3C%3E%20'Kala%20Oya'&outFields=station,basin,latitude,longitude&returnGeometry=false"

/** Gauge stations for their own pages; the build carries on without them when offline. */
async function gaugeRefs(slug: Mods['slug']): Promise<GaugeRef[]> {
  try {
    const res = await fetch(HYDRO, { signal: AbortSignal.timeout(15000) })
    const json = (await res.json()) as { features?: { attributes: { station?: string; basin?: string; latitude?: number; longitude?: number } }[] }
    const seen = new Set<string>()
    return (json.features ?? []).flatMap(({ attributes: a }) => {
      const name = a.station?.trim()
      if (!name || seen.has(slug(name))) return []
      seen.add(slug(name))
      return [{ id: slug(name), name, basin: a.basin?.trim() ?? '', lat: a.latitude, lon: a.longitude }]
    })
  } catch (e) {
    console.warn(`[seo] gauge stations unavailable (${(e as Error).message}); gauge pages fall back to the app`)
    return []
  }
}

// Filled blocks keep start/end markers so the built index.html can serve as the template.
const fill = ({ headTags, bodyHtml }: Seo, template: string, m: PageMeta, opts?: { noindex?: boolean }) =>
  template
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${m.title.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</title>`)
    .replace(/<!--seo:head-->(?:[\s\S]*?<!--\/seo:head-->)?/, `<!--seo:head-->\n    ${headTags(m, opts)}\n    <!--/seo:head-->`)
    .replace(/<!--seo:body-->(?:[\s\S]*?<!--\/seo:body-->)?/, `<!--seo:body-->${bodyHtml(m)}<!--/seo:body-->`)

export default function seoPages(): Plugin {
  let config: ResolvedConfig
  return {
    name: 'lankatwin-seo-pages',
    configResolved(c) { config = c },
    // Dev server and the built index.html: the splash mark and the home page's tags.
    async transformIndexHtml(html) {
      const { seo, markSvg } = await load()
      return fill(seo, html.replace('<!--brand:mark-->', markSvg({ id: 'sp', detail: true })), seo.pageMeta('/')!)
    },
    async closeBundle() {
      if (config.command !== 'build') return
      const out = config.build.outDir
      // index.html already carries the home page; the other pages copy it with their own tags.
      const template = readFileSync(join(out, 'index.html'), 'utf8')
      if (!template.includes('<!--/seo:head-->') || !template.includes('<!--/seo:body-->')) throw new Error('[seo] index.html lost its seo markers')
      const { seo, slug } = await load()
      const { allPages, pageMeta, SITE } = seo
      const gauges = await gaugeRefs(slug)
      const pages = allPages(gauges)
      const write = (file: string, html: string) => { mkdirSync(dirname(join(out, file)), { recursive: true }); writeFileSync(join(out, file), html) }
      for (const m of pages) {
        if (m.path === '/') continue
        const html = fill(seo, template, m)
        // GitHub Pages serves /floods from floods.html; sections with child pages also get
        // floods/index.html in case the folder wins.
        write(`${m.path.slice(1)}.html`, html)
        if (pages.some((p) => p.path.startsWith(`${m.path}/`))) write(`${m.path.slice(1)}/index.html`, html)
      }
      // Unknown paths (new gauges, embeds) still boot the app, but are not indexed.
      write('404.html', fill(seo, template, pageMeta('/')!, { noindex: true }))

      const today = new Date().toISOString().slice(0, 10)
      write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${pages.map((m) => `  <url>
    <loc>${SITE.url}${m.path === '/' ? '/' : m.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${m.changefreq}</changefreq>
    <priority>${m.priority.toFixed(1)}</priority>
    <image:image><image:loc>${SITE.url}${m.image}</image:loc></image:image>
  </url>`).join('\n')}
</urlset>
`)
      write('robots.txt', `User-agent: *
Allow: /
Disallow: /embed/

Sitemap: ${SITE.url}/sitemap.xml
`)
      console.log(`[seo] wrote ${pages.length} pages (${gauges.length} gauges), sitemap.xml, robots.txt and 404.html`)
    },
  }
}
