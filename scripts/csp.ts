// Vite plugin: a Content Security Policy for the built site. GitHub Pages can't send response
// headers, so the policy goes in a <meta http-equiv> tag (which browsers apply to everything but
// frame-ancestors, report-uri and sandbox). Inline scripts are allowed by their SHA-256 hash,
// computed here from the final HTML, so script-src needs no 'unsafe-inline'.
//
// Every page the build writes (scripts/seo-pages.ts) copies this index.html, tag included.
import { createHash } from 'node:crypto'
import type { Plugin } from 'vite'

/** Hosts the app talks to, by purpose. Keep in step with src/lib/api.ts, gauges.ts and MapView. */
export const CSP_HOSTS = {
  // fetch() targets: weather/air/flood/archive/elevation models, solar, gauges, place photos, basemap style and tiles.
  connect: [
    'https://api.open-meteo.com', 'https://air-quality-api.open-meteo.com', 'https://flood-api.open-meteo.com',
    'https://archive-api.open-meteo.com', 'https://power.larc.nasa.gov', 'https://services3.arcgis.com',
    'https://en.wikipedia.org', 'https://basemaps.cartocdn.com', 'https://tiles.basemaps.cartocdn.com',
    'https://gibs.earthdata.nasa.gov', 'https://upload.wikimedia.org', 'https://res.cloudinary.com',
  ],
  // <img> and map raster tiles: photos, satellite imagery, the basemap.
  img: [
    'https://upload.wikimedia.org', 'https://res.cloudinary.com', 'https://gibs.earthdata.nasa.gov',
    'https://basemaps.cartocdn.com', 'https://tiles.basemaps.cartocdn.com',
  ],
  style: ['https://fonts.googleapis.com'],
  font: ['https://fonts.gstatic.com'],
}

export function cspFor(inlineScripts: string[]) {
  const hashes = inlineScripts.map((s) => `'sha256-${createHash('sha256').update(s, 'utf8').digest('base64')}'`)
  return [
    "default-src 'self'",
    `script-src 'self' ${hashes.join(' ')}`.trim(),
    // React, ECharts and MapLibre set inline style attributes; styles can't run code.
    `style-src 'self' 'unsafe-inline' ${CSP_HOSTS.style.join(' ')}`,
    `font-src 'self' data: ${CSP_HOSTS.font.join(' ')}`,
    `img-src 'self' data: blob: ${CSP_HOSTS.img.join(' ')}`,
    `connect-src 'self' ${CSP_HOSTS.connect.join(' ')}`,
    // MapLibre runs its tile workers from blob: URLs; the service worker is same-origin.
    "worker-src 'self' blob:",
    "child-src 'self' blob:",
    "frame-src 'none'",
    "manifest-src 'self'",
    "media-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    'upgrade-insecure-requests',
  ].join('; ')
}

/**
 * The page's only inline scripts. They live here, not in index.html, so the policy hashes these
 * exact strings and the build never has to parse HTML to find them. index.html marks where each
 * goes with <!--inline:name-->.
 */
export const INLINE_SCRIPTS = {
  head: `
      // Old links used the hash (#/station/kandy): move them to the real path before anything renders.
      if (location.hash.indexOf('#/') === 0) history.replaceState(null, '', location.hash.slice(1))
      try { var t = localStorage.getItem('lt-theme'); if (t === 'dark' || (!t && matchMedia('(prefers-color-scheme: dark)').matches)) document.documentElement.classList.add('dark') } catch (e) {}
      // Widgets embedded on other sites skip the splash.
      if (location.pathname.indexOf('/embed/') === 0) document.documentElement.classList.add('lt-embed')
    `,
  // The splash goes away after 10 s whatever happens (src/main.tsx removes it sooner).
  splash: `setTimeout(function () { var s = document.getElementById('lt-splash'); if (s) s.classList.add('lt-done') }, 10000)`,
}

/** Puts the inline scripts in place; fails if a marker is missing or another bare <script> appeared. */
export function withInlineScripts(html: string) {
  let out = html
  for (const [name, code] of Object.entries(INLINE_SCRIPTS)) {
    const marker = `<!--inline:${name}-->`
    if (!out.includes(marker)) throw new Error(`[csp] index.html lost ${marker}`)
    out = out.replace(marker, () => `<script>${code}</script>`)
  }
  const bare = out.split('<script>').length - 1
  if (bare !== Object.keys(INLINE_SCRIPTS).length) throw new Error('[csp] index.html has an inline <script> the policy doesn\'t know; add it to INLINE_SCRIPTS')
  return out
}

/** RFC 9116 security.txt; rebuilt hourly, so its Expires date never lapses. */
export function securityTxt(site: string, now = new Date()) {
  const expires = new Date(now.getTime() + 180 * 864e5).toISOString()
  return [
    'Contact: https://github.com/LankaTwin/LankaTwin.github.io/security/advisories/new',
    `Expires: ${expires}`,
    'Preferred-Languages: en, si, ta',
    `Canonical: ${site}/.well-known/security.txt`,
    'Policy: https://github.com/LankaTwin/LankaTwin.github.io/security/policy',
    '',
  ].join('\n')
}

export default function csp(site = 'https://lankatwin.github.io'): Plugin {
  return {
    name: 'lankatwin-csp',
    enforce: 'post',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: '.well-known/security.txt', source: securityTxt(site) })
    },
    transformIndexHtml: {
      order: 'post',
      handler(source, ctx) {
        const html = withInlineScripts(source)
        // The dev server injects its own scripts; the policy is for the built site only.
        if (ctx.server) return html
        const policy = cspFor(Object.values(INLINE_SCRIPTS))
        const tags = `<meta http-equiv="Content-Security-Policy" content="${policy}" />\n    <meta name="referrer" content="strict-origin-when-cross-origin" />`
        // Right after <meta charset>, so the policy covers everything that follows.
        if (!/<meta charset="UTF-8" \/>/.test(html)) throw new Error('[csp] index.html lost its <meta charset>')
        return html.replace(/<meta charset="UTF-8" \/>/, (m) => `${m}\n    ${tags}`)
      },
    },
  }
}
