// Renders LankaTwin's icons and link-preview images from src/brand/logo.ts and src/lib/seo.ts:
//
//   public/favicon.svg, favicon.ico, logo.svg, apple-touch-icon.png,
//   public/icon-192.png, icon-512.png, icon-maskable-512.png,
//   public/og/<page>.jpg (1200×630, one per section and one per town)
//
//   node scripts/brand.mjs [path/to/font-dir]
//
// Needs Playwright with Chromium. The optional font directory holds
// schibsted-grotesk-latin-{400,700,800}-normal.woff2 (from @fontsource/schibsted-grotesk);
// without it the system sans-serif is used. The gauge share image plots the Irrigation
// Department's stations when its service is reachable, else the river points.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { createServer } from 'vite'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const fontDir = process.argv[2]
const require = createRequire(import.meta.url)
const { chromium } = require('playwright')

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const brand = await vite.ssrLoadModule('/src/brand/logo.ts')
const seo = await vite.ssrLoadModule('/src/lib/seo.ts')
const { STATIONS, RIVER_POINTS } = await vite.ssrLoadModule('/src/lib/places.ts')
const { default: Landscape } = await vite.ssrLoadModule('/src/components/Landscape.tsx')
await vite.close()

const { markSvg, ISLAND_DETAIL, ISLAND_W, ISLAND_BBOX, BRAND } = brand
mkdirSync('public/og', { recursive: true })

// ---------- Icons ----------

writeFileSync('public/favicon.svg', markSvg({ id: 'f' }))
writeFileSync('public/logo.svg', markSvg({ id: 'l', detail: true }))

const browser = await chromium.launch()
const page = await browser.newPage()

async function png(svg, size, path) {
  await page.setViewportSize({ width: size, height: size })
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`)
  const buf = await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } })
  if (path) writeFileSync(path, buf)
  return buf
}

await png(markSvg({ id: 'a' }), 192, 'public/icon-192.png')
await png(markSvg({ id: 'b', detail: true }), 512, 'public/icon-512.png')
// Maskable: full-bleed tile, artwork inside the 80% safe circle.
await png(markSvg({ id: 'c', rx: 0, safe: 0.78, detail: true }), 512, 'public/icon-maskable-512.png')
// iOS rounds the corners itself and shows transparency as black.
await png(markSvg({ id: 'd', rx: 0, safe: 0.9 }), 180, 'public/apple-touch-icon.png')

// favicon.ico holding 16, 32 and 48 px PNGs (PNG-in-ICO is valid since Windows Vista).
const sizes = [16, 32, 48]
const imgs = []
for (const s of sizes) imgs.push(await png(markSvg({ id: `i${s}`, rx: 12 }), s))
const head = Buffer.alloc(6 + 16 * sizes.length)
head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(sizes.length, 4)
let offset = head.length
sizes.forEach((s, i) => {
  const o = 6 + 16 * i
  head.writeUInt8(s, o); head.writeUInt8(s, o + 1); head.writeUInt8(0, o + 2); head.writeUInt8(0, o + 3)
  head.writeUInt16LE(1, o + 4); head.writeUInt16LE(32, o + 6)
  head.writeUInt32LE(imgs[i].length, o + 8); head.writeUInt32LE(offset, o + 12)
  offset += imgs[i].length
})
writeFileSync('public/favicon.ico', Buffer.concat([head, ...imgs]))

// ---------- Share images ----------

const font = (w) => {
  const f = fontDir && `${fontDir}/schibsted-grotesk-latin-${w}-normal.woff2`
  return f && existsSync(f) ? `@font-face{font-family:SG;font-weight:${w};src:url(data:font/woff2;base64,${readFileSync(f).toString('base64')})}` : ''
}
// Sinhala and Tamil names on the town images (noto-sans-{sinhala,tamil}-*-700-normal.woff2).
const script = (name, file) => {
  const f = fontDir && `${fontDir}/${file}`
  return f && existsSync(f) ? `@font-face{font-family:SG;font-weight:700 800;unicode-range:${name === 'si' ? 'U+0D80-0DFF' : 'U+0B80-0BFF'};src:url(data:font/woff2;base64,${readFileSync(f).toString('base64')})}` : ''
}
const fonts = font(400) + font(700) + font(800) + script('si', 'noto-sans-sinhala-sinhala-700-normal.woff2') + script('ta', 'noto-sans-tamil-tamil-700-normal.woff2')
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')

// The island in the right-hand panel: 420 px high, same projection as the mark.
const IH = 420
const sc = IH / 100
const [w, s, , n] = ISLAND_BBOX
const k = Math.cos((7.8 * Math.PI) / 180)
const u = 100 / (n - s)
const xy = (lon, lat) => [(lon - w) * k * u * sc, (n - lat) * u * sc]

let gauges = []
try {
  const ctrl = AbortSignal.timeout(15000)
  const r = await fetch("https://services3.arcgis.com/J7ZFXmR8rSmQ3FGf/arcgis/rest/services/hydrostations/FeatureServer/0/query?f=json&where=station%20%3C%3E%20'Calidonia'%20AND%20basin%20%3C%3E%20'Kala%20Oya'&outFields=station,latitude,longitude&returnGeometry=false", { signal: ctrl })
  gauges = (await r.json()).features.map((f) => [f.attributes.longitude, f.attributes.latitude]).filter(([a, b]) => a && b)
} catch { /* offline: fall back to river points */ }
console.log(`gauge stations for the share image: ${gauges.length || 'none (using river points)'}`)

function island(dots, { highlight, label } = {}) {
  const ds = dots.map(([lon, lat, c, r = 7]) => { const [x, y] = xy(lon, lat); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${c}" stroke="#fff" stroke-width="2.5"/>` }).join('')
  let hl = ''
  if (highlight) {
    const [x, y] = xy(highlight.lon, highlight.lat)
    const left = x > (ISLAND_W * sc) / 2
    hl = `<circle cx="${x}" cy="${y}" r="26" fill="${BRAND.gold}" opacity=".28"/><circle cx="${x}" cy="${y}" r="13" fill="${BRAND.gold}" stroke="#fff" stroke-width="4"/>` +
      `<text x="${left ? x - 24 : x + 24}" y="${y + 9}" text-anchor="${left ? 'end' : 'start'}" font-size="28" font-weight="800" fill="#fff" stroke="${BRAND.deep}" stroke-width="7" paint-order="stroke" font-family="SG,sans-serif">${esc(label)}</text>`
  }
  return `<svg class="isl" viewBox="-40 -20 ${ISLAND_W * sc + 80} ${IH + 40}" width="${ISLAND_W * sc + 80}" height="${IH + 40}">
    <path d="${ISLAND_DETAIL}" transform="translate(10 9) scale(${sc})" fill="none" stroke="${BRAND.mint}" stroke-width="${(3 / sc).toFixed(2)}" stroke-linejoin="round" opacity=".85"/>
    <path d="${ISLAND_DETAIL}" transform="scale(${sc})" fill="${BRAND.canvas}"/>${ds}${hl}</svg>`
}

const town = (c, r) => STATIONS.map((st) => [st.lon, st.lat, c, r])
const DOTS = {
  default: () => town(BRAND.lagoon),
  '/rivers': () => RIVER_POINTS.map((p) => [p.lon, p.lat, '#2156a3']),
  // Positions only: a static image must not suggest any gauge's current status.
  '/gauges': () => (gauges.length ? gauges : RIVER_POINTS.map((p) => [p.lon, p.lat])).map(([lon, lat]) => [lon, lat, '#2156a3', 6]),
  '/floods': () => town('#2156a3'),
  '/air': () => town('#c99a1c'),
  '/alerts': () => town('#c0392b', 6),
}
const ZONE = { '/floods': 'plains', '/rivers': 'plains', '/gauges': 'plains', '/air': 'plains' }

const CHIPS = {
  '/': ['26 towns', '40 river gauges', 'Flood risk', 'Air quality'],
  '/live': ['Warnings', 'Watches', 'Auto-refresh'],
  '/floods': ['Flood risk', 'NASA flood map', 'Emergency 117'],
  '/gauges': ['Irrigation Department', 'Hourly', 'Flood levels'],
  '/rivers': ['14 river points', 'GloFAS forecast'],
  '/air': ['US AQI', 'PM2.5', 'PM10', 'UV'],
  '/stations': ['26 towns', 'Sortable'],
  '/compare': ['Up to 5 towns', 'Charts'],
  '/alerts': ['Rain', 'Floods', 'Storms', 'Heat', 'Air'],
  '/sources': ['Open data', 'Licences'],
  '/developers': ['No key', 'JSON · CSV · GeoJSON', 'Hourly', 'OpenAPI'],
  '/about': ['Open source', 'English · සිංහල · தமிழ்'],
}
// Shorter copy where a page description is too long for three lines on the image.
const OG_TEXT = {
  '/': 'Rain, river levels, flood risk, official river gauges, air quality and NASA satellite views for every district.',
  '/floods': 'Flood risk for every town, official river levels, the NASA flood map and what to do before, during and after a flood.',
  '/gauges': 'Hourly water levels and rainfall from the Irrigation Department’s hydrometric stations, against each gauge’s flood levels.',
  '/alerts': 'Heavy rain, floods, storms, heat, gusts, poor air and rivers at flood level, with Sri Lanka’s emergency numbers.',
}
const CHIP_COLORS = ['#0e6e78', '#2156a3', '#c99a1c', '#4d7a2c', '#7a4d9c']

function card({ kicker, title, text, chips, dots, highlight, label, zone = 'coast' }) {
  const art = renderToStaticMarkup(h(Landscape, { zone, className: 'land' }))
  return `<!doctype html><html><head><meta charset="utf-8"><style>
${fonts}
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;font-family:SG,'DejaVu Sans',sans-serif;background:${BRAND.canvas};color:${BRAND.ink};overflow:hidden;position:relative}
.left{position:absolute;left:64px;top:52px;width:640px;bottom:40px;display:flex;flex-direction:column}
.brand{display:flex;align-items:center;gap:16px}
.brand svg{width:64px;height:64px}
.wm{font-size:40px;font-weight:800;letter-spacing:-1px;line-height:1}.wm b{color:${BRAND.lagoon};font-weight:800}
.full{display:block;margin-top:6px;font-size:15px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#5b6f74}
.kicker{margin-top:30px;font-size:22px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:${BRAND.lagoon}}
h1{margin-top:8px;font-size:${title.length > 30 ? 54 : 66}px;line-height:1.04;font-weight:800;letter-spacing:-1.5px}
p{margin-top:18px;font-size:25px;line-height:1.35;color:#33494f;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.chips{display:flex;gap:10px;flex-wrap:wrap;margin-top:auto;margin-bottom:30px}
.chip{font-size:20px;font-weight:700;padding:8px 14px;border-radius:999px;color:#fff}
.url{position:absolute;left:64px;bottom:22px;font-size:18px;color:#5b6f74;font-weight:500}
.panel{position:absolute;right:0;top:0;bottom:0;width:430px;background:linear-gradient(160deg,${BRAND.lagoonHi},${BRAND.deep});overflow:hidden}
.panel .sun{position:absolute;right:46px;top:40px;width:70px;height:70px;border-radius:50%;background:${BRAND.gold}}
.isl{position:absolute;left:50%;top:46%;transform:translate(-50%,-50%)}
.land{position:absolute;left:0;right:0;bottom:0;width:430px;height:96px;opacity:.28;mix-blend-mode:screen}
</style></head><body>
<div class="left">
  <div class="brand">${markSvg({ id: 'og', detail: true })}<span><span class="wm">Lanka<b>Twin</b></span><span class="full">${esc(seo.SITE.fullName)}</span></span></div>
  ${kicker ? `<div class="kicker">${esc(kicker)}</div>` : ''}
  <h1>${esc(title)}</h1>
  <p>${esc(text)}</p>
  <div class="chips">${chips.map((c, i) => `<span class="chip" style="background:${CHIP_COLORS[i % CHIP_COLORS.length]}">${esc(c)}</span>`).join('')}</div>
</div>
<div class="url">lankatwin.github.io</div>
<div class="panel"><div class="sun"></div>${art}${island(dots, { highlight, label })}</div>
</body></html>`
}

await page.setViewportSize({ width: 1200, height: 630 })
async function shot(html, file) {
  await page.setContent(html)
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: `public${file}`, type: 'jpeg', quality: 86 })
}

let count = 0
for (const sec of seo.OG_SECTIONS) {
  const dots = (DOTS[sec.path] ?? DOTS.default)()
  const short = OG_TEXT[sec.path] ?? sec.description.split(/(?<=\.)\s/)[0]
  await shot(card({ kicker: sec.path === '/' ? 'Live for Sri Lanka' : 'Sri Lanka', title: sec.path === '/' ? 'Weather, rivers, floods and air — live' : sec.h1, text: short, chips: CHIPS[sec.path] ?? [], dots, zone: ZONE[sec.path] }), sec.file)
  count++
}
for (const st of STATIONS) {
  await shot(card({
    kicker: `${st.district} District · ${st.province} Province`,
    title: `${st.name} weather now`,
    text: `Temperature, rain, wind, air quality, flood risk and a 7\u2011day forecast for ${st.name}, updated live.`,
    chips: [`${st.si}`, `${st.ta}`, 'Live'],
    dots: town('rgba(14,110,120,.55)', 5),
    highlight: st, label: st.name, zone: st.zone,
  }), `/og/station-${st.id}.jpg`)
  count++
}
await browser.close()
console.log(`wrote icons and ${count} share images`)
