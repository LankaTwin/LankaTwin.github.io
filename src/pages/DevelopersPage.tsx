import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Check, Copy, ExternalLink, Play } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { ENDPOINTS, FORMAT_TYPES, fileFor, type Endpoint, type Format, type ParamKind } from '../lib/apiSpec'
import { API_BASE_PATH, API_DISCLAIMER, API_REFRESH_MINUTES, API_VERSION } from '../lib/publicApi'
import { RIVER_POINTS, STATIONS } from '../lib/places'
import { SITE } from '../lib/seo'
import { useTitle } from '../hooks/useApp'
import { useT } from '../i18n/useT'

const BASE = `${SITE.url}${API_BASE_PATH}`
/** Files are fetched from the same origin the page runs on, so previews of a branch try their own build. */
const local = (file: string) => `${API_BASE_PATH}/${file}`

/** `code` spans in the catalogue text, as React nodes (never as HTML). */
function Md({ text }: { text: string }) {
  return <>{text.split(/(`[^`]+`)/g).map((p, i) => (p.startsWith('`') ? <code key={i}>{p.slice(1, -1)}</code> : p))}</>
}

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      onClick={() => { navigator.clipboard?.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 1500) }, () => {}) }}
      className="inline-flex shrink-0 items-center gap-1 rounded-md border border-line bg-surface px-2 py-1 text-xs font-medium hover:bg-sunken"
      aria-label={`${label}: ${text.length > 60 ? text.slice(0, 60) + '…' : text}`}
    >
      {done ? <Check className="size-3.5 text-paddy" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
      {done ? 'Copied' : label}
    </button>
  )
}

function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-lg border border-line bg-[#0f1f24] p-3 pr-20 text-[12.5px] leading-relaxed text-[#d7e6e3]" data-lang={lang}><code className="!bg-transparent !p-0 !text-inherit">{code}</code></pre>
      <div className="absolute right-2 top-2"><CopyButton text={code} /></div>
    </div>
  )
}

const SAMPLES = (url: string): Record<string, string> => ({
  curl: `curl -s ${url}`,
  JavaScript: `const res = await fetch('${url}')
if (!res.ok) throw new Error(\`LankaTwin API: \${res.status}\`)
const { data, generated_at, stale } = await res.json()
console.log(generated_at, stale, data)`,
  Python: `import requests

r = requests.get("${url}", timeout=20)
r.raise_for_status()
body = r.json()
print(body["generated_at"], body["stale"])
data = body["data"]`,
})

function Samples({ url }: { url: string }) {
  const samples = SAMPLES(url)
  const [tab, setTab] = useState('curl')
  return (
    <div>
      <div role="tablist" aria-label="Code sample language" className="mb-2 flex gap-1">
        {Object.keys(samples).map((k) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`rounded-md px-2.5 py-1 text-xs font-semibold ${tab === k ? 'bg-lagoon text-white' : 'bg-sunken hover:bg-line'}`}>{k}</button>
        ))}
      </div>
      <CodeBlock code={samples[tab]} lang={tab} />
    </div>
  )
}

// ---------- Live status of the published API ----------

interface Status { generated_at: string; next_update: string; ok: boolean; feeds: { id: string; name: string; ok: boolean; ms: number; error?: string }[]; files: number; carried_over: string[] }

const ago = (iso: string) => {
  const m = Math.round((Date.now() - Date.parse(iso)) / 60_000)
  return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : `${Math.floor(m / 60)} h ${m % 60} min ago`
}

function StatusPanel() {
  const q = useQuery({
    queryKey: ['api-status'],
    queryFn: async ({ signal }) => {
      const res = await fetch(local('status.json'), { signal, cache: 'no-cache' })
      if (!res.ok) throw new Error(String(res.status))
      return (await res.json()) as Status
    },
    refetchInterval: 5 * 60_000,
    retry: 1,
  })
  const s = q.data
  return (
    <section aria-labelledby="status-h" className="rounded-xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="status-h" className="!m-0 text-lg font-bold">Status</h2>
        {s && (
          <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${s.ok ? 'bg-paddy-soft text-paddy' : 'bg-thambili-soft text-thambili'}`}>
            {s.ok ? 'All feeds OK' : 'Some feeds failed, previous data served'}
          </span>
        )}
      </div>
      {q.isLoading && <p className="mt-2 text-sm text-muted">Checking the published API…</p>}
      {q.isError && <p className="mt-2 text-sm text-muted">The API files aren’t on this server yet. They are written by <code>npm run build</code>; try <code>npm run preview</code>, or the live site.</p>}
      {s && (
        <>
          <p className="mt-2 text-sm">Built <b>{ago(s.generated_at)}</b> ({new Date(s.generated_at).toLocaleString('en-LK', { timeZone: 'Asia/Colombo', dateStyle: 'medium', timeStyle: 'short' })} Sri Lanka time), {s.files} files. Next rebuild due around {new Date(s.next_update).toLocaleTimeString('en-LK', { timeZone: 'Asia/Colombo', timeStyle: 'short' })}.</p>
          <ul className="!ml-0 !mb-0 mt-3 grid !max-w-none !list-none gap-2 !p-0 sm:grid-cols-2" aria-label="Upstream feeds">
            {s.feeds.map((f) => (
              <li key={f.id} className="!m-0 flex items-start gap-2 rounded-lg bg-sunken px-3 py-2 text-sm">
                <span aria-hidden className={`mt-1.5 size-2 shrink-0 rounded-full ${f.ok ? 'bg-paddy' : 'bg-thambili'}`} />
                <span className="min-w-0">
                  <span className="font-medium">{f.name}</span>
                  <span className="block text-xs text-muted">{f.ok ? `answered in ${(f.ms / 1000).toFixed(1)} s` : `failed: ${f.error ?? 'no answer'}`}</span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

// ---------- One endpoint ----------

function useIds(kind?: ParamKind) {
  const gauges = useQuery({
    queryKey: ['api-gauge-ids'],
    enabled: kind === 'gauge',
    queryFn: async ({ signal }) => {
      const res = await fetch(local('gauges.json'), { signal })
      if (!res.ok) throw new Error(String(res.status))
      const body = (await res.json()) as { data?: { gauges?: { id: string; name: string }[] } }
      return body.data?.gauges?.map((g) => ({ id: g.id, label: g.name })) ?? []
    },
    staleTime: 10 * 60_000,
  })
  return useMemo(() => {
    if (kind === 'place') return STATIONS.map((s) => ({ id: s.id, label: s.name }))
    if (kind === 'river') return RIVER_POINTS.map((r) => ({ id: r.id, label: `${r.river} at ${r.near}` }))
    if (kind === 'gauge') return (gauges.data ?? []).slice().sort((a, b) => a.label.localeCompare(b.label))
    return []
  }, [kind, gauges.data])
}

const MAX_PREVIEW = 6000

function EndpointCard({ e }: { e: Endpoint }) {
  const ids = useIds(e.param)
  const [id, setId] = useState<string>()
  const [format, setFormat] = useState<Format>(e.formats[0])
  const [res, setRes] = useState<{ status: number; ms: number; size: number; body: string; type: string } | { error: string }>()
  const [busy, setBusy] = useState(false)
  const chosen = e.param ? (id ?? ids[0]?.id) : undefined
  const file = fileFor(e, format, chosen)
  const url = `${BASE}/${file}`

  useEffect(() => setRes(undefined), [file])

  async function run() {
    setBusy(true)
    const t0 = performance.now()
    try {
      const r = await fetch(local(file), { cache: 'no-cache' })
      const text = await r.text()
      let body = text
      if (format === 'json' || format === 'geojson') { try { body = JSON.stringify(JSON.parse(text), null, 2) } catch { /* show as is */ } }
      setRes({ status: r.status, ms: Math.round(performance.now() - t0), size: text.length, type: r.headers.get('content-type') ?? '', body: body.length > MAX_PREVIEW ? `${body.slice(0, MAX_PREVIEW)}\n… (${(text.length / 1024).toFixed(1)} KB in all; open the URL for the rest)` : body })
    } catch (err) {
      setRes({ error: (err as Error).message || 'Network error' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <article id={`ep-${e.id}`} className="scroll-mt-20 rounded-xl border border-line bg-surface p-4">
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="!m-0 text-base font-bold">{e.summary}</h3>
        <code className="!bg-transparent !p-0 text-sm"><span className="mr-1.5 rounded bg-paddy-soft px-1.5 py-0.5 text-[11px] font-bold text-paddy">GET</span>{API_BASE_PATH}/{e.path}.{e.formats.length > 1 ? `{${e.formats.join(',')}}` : e.formats[0]}</code>
      </header>
      <p className="!mb-3 mt-1.5 text-sm text-muted"><Md text={e.description} /></p>

      <div className="flex flex-wrap items-center gap-2">
        {e.param && (
          <label className="flex items-center gap-1.5 text-sm">
            <span className="text-muted">{'{id}'}</span>
            <select value={chosen ?? ''} onChange={(ev) => setId(ev.target.value)} className="max-w-[16rem] rounded-md border border-line bg-surface px-2 py-1 text-sm" disabled={!ids.length}>
              {!ids.length && <option value="">Loading ids…</option>}
              {ids.map((x) => <option key={x.id} value={x.id}>{x.label} ({x.id})</option>)}
            </select>
          </label>
        )}
        {e.formats.length > 1 && (
          <div role="radiogroup" aria-label="Format" className="flex gap-1">
            {e.formats.map((f) => (
              <button key={f} role="radio" aria-checked={format === f} onClick={() => setFormat(f)} className={`rounded-md px-2 py-1 text-xs font-semibold uppercase ${format === f ? 'bg-lagoon text-white' : 'bg-sunken hover:bg-line'}`}>{f}</button>
            ))}
          </div>
        )}
        <button type="button" onClick={run} disabled={busy || (!!e.param && !chosen)} className="inline-flex items-center gap-1 rounded-md bg-lagoon px-3 py-1 text-xs font-semibold text-white hover:brightness-110 disabled:opacity-50">
          <Play className="size-3.5" aria-hidden />{busy ? 'Loading…' : 'Try it'}
        </button>
      </div>

      <div className="mt-2 flex min-w-0 items-center gap-2 rounded-lg bg-sunken px-2 py-1.5">
        <code className="min-w-0 flex-1 truncate !bg-transparent text-xs" title={url}>{url}</code>
        <CopyButton text={url} label="Copy URL" />
        <a href={local(file)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md border border-line bg-surface px-2 py-1 text-xs font-medium hover:bg-sunken" aria-label={`Open ${file} in a new tab`}>
          <ExternalLink className="size-3.5" aria-hidden />Open
        </a>
      </div>

      {res && (
        <div className="mt-2" aria-live="polite">
          {'error' in res ? (
            <p className="rounded-lg bg-rambutan-soft px-3 py-2 text-sm text-rambutan">Request failed: {res.error}</p>
          ) : (
            <>
              <p className="mb-1 text-xs text-muted">
                <b className={res.status === 200 ? 'text-paddy' : 'text-rambutan'}>{res.status}</b> · {res.ms} ms · {(res.size / 1024).toFixed(1)} KB · {res.type || FORMAT_TYPES[format]}
              </p>
              <pre className="max-h-96 overflow-auto rounded-lg border border-line bg-[#0f1f24] p-3 text-[12px] leading-relaxed text-[#d7e6e3]"><code className="!bg-transparent !p-0 !text-inherit">{res.body}</code></pre>
            </>
          )}
        </div>
      )}

      {e.fields && (
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-semibold text-lagoon">Fields{e.list ? ' (each item in data)' : ' (data)'}</summary>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead className="text-xs text-muted"><tr><th className="py-1 pr-3 font-medium">Field</th><th className="py-1 pr-3 font-medium">Type</th><th className="py-1 font-medium">Description</th></tr></thead>
              <tbody>
                {e.fields.map(([n, t, d, nullable]) => (
                  <tr key={n} className="border-t border-line align-top">
                    <td className="py-1.5 pr-3"><code>{n}</code></td>
                    <td className="whitespace-nowrap py-1.5 pr-3 text-muted">{t}{nullable ? ' | null' : ''}</td>
                    <td className="py-1.5"><Md text={d} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </article>
  )
}

// ---------- Page ----------

const GROUPS = [...new Set(ENDPOINTS.map((e) => e.group))]
const slugOf = (s: string) => s.toLowerCase().replace(/[^a-z]+/g, '-')

function H2({ id, children }: { id: string; children: ReactNode }) {
  return <h2 id={id} className="scroll-mt-20"><a href={`#${id}`} className="!text-inherit !no-underline hover:!underline">{children}</a></h2>
}

const TOC: [string, string][] = [
  ['quick-start', 'Quick start'], ['status', 'Status'], ...GROUPS.map((g) => [slugOf(g), g] as [string, string]),
  ['envelope', 'Response envelope'], ['conventions', 'Units, times and ids'], ['caching', 'Caching and fair use'],
  ['errors', 'Errors and outages'], ['versioning', 'Versioning'], ['security', 'Security and privacy'], ['licence', 'Licence and attribution'],
]

export default function DevelopersPage() {
  const { t } = useT()
  useTitle(t('dev.title'))
  const snapshot = `${BASE}/snapshot.json`
  // The page loads lazily, after the browser looked for #ep-…; scroll there once it exists.
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1))
    if (id) document.getElementById(id)?.scrollIntoView()
  }, [])
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-8">
      <nav aria-label="On this page" className="hidden lg:block">
        <ul className="sticky top-20 space-y-1 text-sm">
          {TOC.map(([id, label]) => <li key={id}><a href={`#${id}`} className="block rounded px-2 py-1 text-muted hover:bg-sunken hover:text-ink">{label}</a></li>)}
        </ul>
      </nav>

      <div className="prose-lt min-w-0">
        <p className="!mb-1 text-sm font-semibold uppercase tracking-wide text-lagoon">Developers · v{API_VERSION}</p>
        <h1 className="mb-2 text-3xl font-extrabold tracking-tight">{t('dev.title')}</h1>
        <p className="text-lg">{t('dev.lead')}</p>
        <ul className="!ml-0 !list-none !p-0 flex flex-wrap gap-2" aria-label="At a glance">
          {['No key or sign-up', 'CORS: any origin', `Rebuilt every ${API_REFRESH_MINUTES} min`, 'JSON · CSV · GeoJSON · Atom', 'OpenAPI 3.1', 'English · සිංහල · தமிழ்'].map((x) => (
            <li key={x} className="!m-0 rounded-full bg-lagoon-soft px-3 py-1 text-xs font-semibold text-lagoon">{x}</li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-muted">{t('dev.langNote')}</p>

        <H2 id="quick-start">Quick start</H2>
        <p>Base URL:</p>
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2">
          <code className="min-w-0 flex-1 truncate !bg-transparent">{BASE}/</code>
          <CopyButton text={`${BASE}/`} />
        </div>
        <p>Every endpoint is a file: send a <code>GET</code>, read the JSON. The island snapshot is a good first call:</p>
        <Samples url={snapshot} />
        <p className="mt-4">Then <a href={local('index.json')}>index.json</a> lists every endpoint and id, and <a href={local('openapi.json')}>openapi.json</a> describes them all for code generators, Postman, Insomnia or <a href={`https://editor.swagger.io/?url=${encodeURIComponent(`${BASE}/openapi.json`)}`} rel="noopener noreferrer">Swagger Editor</a>.</p>

        <div id="status" className="scroll-mt-20 mt-8"><StatusPanel /></div>

        {GROUPS.map((g) => (
          <section key={g} aria-labelledby={slugOf(g)}>
            <H2 id={slugOf(g)}>{g}</H2>
            <div className="space-y-3">{ENDPOINTS.filter((e) => e.group === g).map((e) => <EndpointCard key={e.id} e={e} />)}</div>
          </section>
        ))}

        <H2 id="envelope">Response envelope</H2>
        <p>Every JSON data file wraps its payload the same way, so one client handles them all. GeoJSON files carry the same fields under <code>metadata</code>.</p>
        <CodeBlock lang="json" code={`{
  "api": { "name": "LankaTwin API", "version": "${API_VERSION}", "docs": "${SITE.url}/developers", "self": "${BASE}/weather.json" },
  "generated_at": "2026-10-31T10:07:12.000Z",   // when this file was built (UTC)
  "next_update": "2026-10-31T11:07:12.000Z",    // don't expect new data before this
  "stale": false,        // true: a feed failed and this is the previous build's data
  "missing": [],         // feeds that failed: "weather" | "air" | "rivers" | "gauges"
  "sources": [ { "id": "forecast", "name": "Weather Forecast API", "provider": "Open-Meteo", "license": "CC BY 4.0", "url": "…" } ],
  "license": "…",
  "disclaimer": "…",
  "data": [ … ]
}`} />

        <H2 id="conventions">Units, times and ids</H2>
        <ul>
          <li><b>Units are in the field name</b>: <code>_c</code> °C, <code>_mm</code> millimetres, <code>_kmh</code> km/h, <code>_pct</code> %, <code>_hpa</code> hPa, <code>_m3s</code> m³/s, <code>_ugm3</code> µg/m³. Gauge levels use the gauge’s <code>unit</code> (metres, or feet at Nagalagam Street).</li>
          <li><b>Times</b> are ISO 8601. Model times carry Sri Lanka’s offset (<code>+05:30</code>); gauge readings and build times are UTC (<code>Z</code>). Dates are <code>YYYY-MM-DD</code> in Sri Lanka.</li>
          <li><b>Missing values are <code>null</code></b>, never 0 or an empty string. A field is never dropped from a shape.</li>
          <li><b>Ids</b> are lowercase slugs (<code>^[a-z0-9-]+$</code>) and stay stable across versions: places by town (<code>nuwara-eliya</code>), rivers by river and town (<code>kelani-hanwella</code>), gauges by their official name (<code>nagalagam-street</code>).</li>
          <li><b>Coordinates</b> are WGS84 decimal degrees; GeoJSON uses <code>[lon, lat]</code> as the spec requires.</li>
          <li><b>Languages</b>: names, places and signal text come in <code>en</code>, <code>si</code> and <code>ta</code>. CSV files carry English text.</li>
          <li><b>CSV</b> follows RFC 4180, UTF-8, CRLF line ends, header row first. Text that a spreadsheet would run as a formula starts with an apostrophe.</li>
        </ul>

        <H2 id="caching">Caching and fair use</H2>
        <ul>
          <li>Files are served by GitHub Pages’ CDN with <code>Cache-Control: max-age=600</code>, an <code>ETag</code> and <code>Last-Modified</code>. Send <code>If-None-Match</code> and you get a cheap <code>304</code> when nothing changed.</li>
          <li>Data changes at most once an hour. Poll no faster than every 10 minutes, or schedule your next call for <code>next_update</code>.</li>
          <li>There is no key and no hard rate limit, but GitHub Pages has a soft bandwidth limit for the whole site. For heavy use (many requests a minute, or serving your own users), fetch once on your server and serve from there.</li>
          <li>The upstream services are spared: however many clients there are, the API asks each feed once an hour. Please use this API rather than scraping the website.</li>
        </ul>

        <H2 id="errors">Errors and outages</H2>
        <ul>
          <li><b>404</b>: an unknown path or id. GitHub Pages answers with an HTML page, so check <code>res.ok</code> before parsing.</li>
          <li><b>An upstream feed failed</b>: files that need it keep the previous build’s data with <code>"stale": true</code>, and <code>missing</code> names the feed. <code>status.json</code> shows which feed failed and why. If there was no previous data, <code>data</code> is <code>null</code>.</li>
          <li><b>Partial data</b>: signals and the snapshot are still built when only the weather or only the gauges answered; check <code>missing</code> before treating “no signals” as “all clear”.</li>
          <li>Gauges that haven’t reported for 3 hours are marked <code>"stale": true</code> and never raise a signal.</li>
        </ul>

        <H2 id="versioning">Versioning</H2>
        <ul>
          <li>The version is in the path: <code>/api/v1/</code>. Within v1, changes are additive only: new endpoints, new fields, new ids. Write clients that ignore fields they don’t know.</li>
          <li>Renaming or removing a field, or changing its meaning or unit, means <code>/api/v2/</code>. v1 then keeps running for at least 6 months, announced here and in the repository.</li>
          <li><b>Changelog</b>: 1.0.0 (October 2026), first release: snapshot, places, weather, air, flood risk, rivers, gauges, signals with Atom feeds, methodology, sources, status, OpenAPI.</li>
        </ul>

        <H2 id="security">Security and privacy</H2>
        <ul>
          <li>Read-only static files over HTTPS (HSTS). No accounts, keys, cookies or tracking, and nothing you send is stored.</li>
          <li>Text from upstream feeds is cleaned at build time (no control characters or angle brackets, bounded length), but treat it as untrusted: escape it before putting it in HTML.</li>
          <li>The site sends a strict Content Security Policy, pins its build tools and checks dependencies on every change. Found a problem? See the <a href="https://github.com/LankaTwin/LankaTwin.github.io/security/policy" rel="noopener noreferrer">security policy</a> to report it privately.</li>
        </ul>

        <H2 id="licence">Licence and attribution</H2>
        <p>Each response lists its <code>sources</code> with their licences. Most are CC BY 4.0: credit <b>LankaTwin</b> and the sources, e.g. “Data: LankaTwin (lankatwin.github.io), Open-Meteo, Copernicus, Irrigation Department of Sri Lanka”. The code is MIT; see <Link to="/sources">Data sources</Link> for the full list.</p>
        <p className="rounded-lg bg-sunken px-3 py-2 text-sm">{API_DISCLAIMER}</p>
        <p className="text-sm text-muted">Want a widget rather than data? Every town has an embeddable card: open a place, such as <Link to="/station/colombo">Colombo</Link>, and choose “{t('place.embed')}”.</p>
      </div>
    </div>
  )
}
