import { SOURCES, type SourceStatus } from '../lib/sources'
import { useTitle } from '../hooks/useApp'
import { DICTS, type Key } from '../i18n/core'
import { useT } from '../i18n/useT'

const STATUS: Record<SourceStatus, { label: Key; cls: string }> = {
  live: { label: 'sources.live', cls: 'bg-paddy-soft text-paddy' },
  imagery: { label: 'sources.imagery', cls: 'bg-lagoon-soft text-lagoon' },
  planned: { label: 'sources.planned', cls: 'bg-sunken text-muted' },
}

/** Translated catalogue text where a key exists, else the English in sources.ts. */
const has = (k: string): k is Key => k in DICTS.en

export default function SourcesPage() {
  const { t } = useT()
  useTitle(t('sources.title'))
  const tx = (id: string, field: string, fallback: string) => { const k = `src.${id}.${field}`; return has(k) ? t(k) : fallback }
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="text-3xl font-extrabold tracking-tight">{t('sources.title')}</h1>
      <p className="mb-6 mt-1 max-w-3xl text-muted">{t('sources.intro')}</p>
      <div className="space-y-3">
        {SOURCES.map((s) => (
          <article key={s.name + s.provider} className="rounded-xl border border-line bg-surface p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="font-semibold"><a href={s.url} className="hover:text-lagoon hover:underline">{s.name}</a></h2>
                <p className="text-sm text-muted">{s.provider}</p>
              </div>
              <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${STATUS[s.status].cls}`}>{t(STATUS[s.status].label)}</span>
            </div>
            <p className="mt-2 text-sm">{tx(s.id, 'provides', s.provides)}</p>
            <dl className="mt-2 grid gap-x-6 gap-y-1 text-xs sm:grid-cols-3">
              <div><dt className="inline text-muted">{t('sources.refresh')} </dt><dd className="inline">{tx(s.id, 'refresh', s.refresh)}</dd></div>
              <div><dt className="inline text-muted">{t('sources.resolution')} </dt><dd className="inline">{tx(s.id, 'resolution', s.resolution)}</dd></div>
              <div><dt className="inline text-muted">{t('sources.licence')} </dt><dd className="inline">{tx(s.id, 'license', s.license)}</dd></div>
            </dl>
            {s.note && <p className="mt-2 rounded-lg bg-sunken px-3 py-2 text-xs text-muted">{tx(s.id, 'note', s.note)}</p>}
          </article>
        ))}
      </div>
    </div>
  )
}
