import { SOURCES, type SourceStatus } from '../lib/sources'

const STATUS: Record<SourceStatus, { label: string; cls: string }> = {
  live: { label: 'Live in app', cls: 'bg-paddy-soft text-paddy' },
  imagery: { label: 'Map layer', cls: 'bg-lagoon-soft text-lagoon' },
  planned: { label: 'Planned', cls: 'bg-sunken text-muted' },
}

export default function SourcesPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="text-3xl font-extrabold tracking-tight">Data sources</h1>
      <p className="mb-6 mt-1 max-w-3xl text-muted">
        Everything is fetched by your browser straight from the publisher. LankaTwin has no server and stores nothing about you.
        National sources are listed as planned until they offer an endpoint a browser is allowed to call.
      </p>
      <div className="space-y-3">
        {SOURCES.map((s) => (
          <article key={s.name + s.provider} className="rounded-xl border border-line bg-surface p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="font-semibold"><a href={s.url} className="hover:text-lagoon hover:underline">{s.name}</a></h2>
                <p className="text-sm text-muted">{s.provider}</p>
              </div>
              <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${STATUS[s.status].cls}`}>{STATUS[s.status].label}</span>
            </div>
            <p className="mt-2 text-sm">{s.provides}</p>
            <dl className="mt-2 grid gap-x-6 gap-y-1 text-xs sm:grid-cols-3">
              <div><dt className="inline text-muted">Refresh: </dt><dd className="inline">{s.refresh}</dd></div>
              <div><dt className="inline text-muted">Resolution: </dt><dd className="inline">{s.resolution}</dd></div>
              <div><dt className="inline text-muted">Licence: </dt><dd className="inline">{s.license}</dd></div>
            </dl>
            {s.note && <p className="mt-2 rounded-lg bg-sunken px-3 py-2 text-xs text-muted">{s.note}</p>}
          </article>
        ))}
      </div>
    </div>
  )
}
