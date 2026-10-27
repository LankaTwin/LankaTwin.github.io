// Renders public/og-image.png, the 1200×630 preview shown when a LankaTwin link is shared.
// Uses the app's own Landscape and WeatherIcon components so the artwork stays in step.
//
//   node scripts/og-image.mjs [path/to/font-dir]
//
// Needs Playwright with Chromium (`npx playwright install chromium`). The optional font
// directory holds schibsted-grotesk-latin-{400,800}-normal.woff2 (from @fontsource/schibsted-grotesk);
// without it the system sans-serif is used.
import { readFileSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { createServer } from 'vite'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const fontDir = process.argv[2]
const require = createRequire(import.meta.url)
const { chromium } = require('playwright')

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const { default: Landscape } = await vite.ssrLoadModule('/src/components/Landscape.tsx')
const { default: WeatherIcon } = await vite.ssrLoadModule('/src/components/WeatherIcon.tsx')
await vite.close()

const art = (zone) => renderToStaticMarkup(h(Landscape, { zone, className: 'scene' }))
const icon = (code) => renderToStaticMarkup(h(WeatherIcon, { code, className: 'ico' }))
const font = (w) => {
  const f = fontDir && `${fontDir}/schibsted-grotesk-latin-${w}-normal.woff2`
  return f && existsSync(f) ? `@font-face{font-family:SG;font-weight:${w};src:url(data:font/woff2;base64,${readFileSync(f).toString('base64')})}` : ''
}

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
${font(400)}${font(800)}
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;font-family:SG,'DejaVu Sans',sans-serif;background:#f2f5f4;color:#12262e;overflow:hidden}
.top{display:flex;height:400px;padding:56px 64px 0;gap:40px}
.brand{display:flex;align-items:center;gap:18px}
.mark{width:72px;height:72px}
h1{font-size:76px;font-weight:800;letter-spacing:-2px}
p{font-size:30px;line-height:1.3;margin-top:22px;max-width:640px;color:#33494f}
.tags{display:flex;gap:10px;margin-top:26px;flex-wrap:wrap}
.tag{font-size:21px;font-weight:800;padding:8px 14px;border-radius:999px;color:#fff}
.icons{display:grid;grid-template-columns:repeat(2,120px);gap:14px;margin-left:auto;align-content:start}
.icons div{background:#fff;border-radius:22px;display:grid;place-items:center;height:120px;box-shadow:0 2px 10px rgba(18,38,46,.08)}
.ico{width:84px;height:84px}
.band{display:flex;height:230px}
.scene{width:400px;height:230px;display:block}
</style></head><body>
<div class="top"><div>
  <div class="brand"><svg class="mark" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#0E6E78"/><path d="M30 11c5 1 9 5 12 10 4 7 8 12 9 19 1 8-4 14-11 15-6 1-11-2-14-7-3-6-6-10-6-17 0-8 3-15 10-20z" fill="#f2f5f4"/><circle cx="34" cy="38" r="5" fill="#E2A11B"/></svg><h1>LankaTwin</h1></div>
  <p>Live weather, rain, rivers, air quality and satellite views for Sri Lanka — free and open source.</p>
  <div class="tags"><span class="tag" style="background:#0e6e78">26 towns</span><span class="tag" style="background:#2156a3">14 rivers</span><span class="tag" style="background:#c99a1c">air quality</span><span class="tag" style="background:#4d7a2c">NASA imagery</span></div>
</div>
<div class="icons"><div>${icon(0)}</div><div>${icon(2)}</div><div>${icon(63)}</div><div>${icon(95)}</div></div></div>
<div class="band">${art('coast')}${art('hills')}${art('plains')}</div>
</body></html>`

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } })
await page.setContent(html)
await page.screenshot({ path: 'public/og-image.png' })
await browser.close()
console.log('wrote public/og-image.png')
