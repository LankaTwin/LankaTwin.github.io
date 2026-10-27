import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom'
import Landscape from './Landscape'
import { useT } from '../i18n/useT'

/** Shown when a screen throws, or when a new deploy has replaced the code chunk this tab was about to load. */
export default function RouteError() {
  const err = useRouteError()
  const { t } = useT()
  const stale = err instanceof Error && /dynamically imported module|Importing a module script failed|Failed to fetch/i.test(err.message)
  const msg = isRouteErrorResponse(err) ? `${err.status} ${err.statusText}` : err instanceof Error ? err.message : 'Unknown error'
  return (
    <div className="mx-auto max-w-xl px-4 py-10 text-center">
      <Landscape zone="hills" sky="rain" className="mx-auto mb-6 h-40 w-full rounded-xl" />
      <h1 className="text-2xl font-extrabold tracking-tight">{t(stale ? 'err.updatedTitle' : 'err.title')}</h1>
      <p className="mt-2 text-muted">
        {t(stale ? 'err.updatedBody' : 'err.body')}
      </p>
      {!stale && <p className="mt-2 font-mono text-xs text-muted">{msg}</p>}
      <div className="mt-5 flex justify-center gap-2">
        <button onClick={() => location.reload()} className="rounded-lg bg-lagoon px-4 py-2 text-sm font-semibold text-canvas hover:brightness-110">{t('err.reload')}</button>
        <Link to="/" reloadDocument className="rounded-lg border border-line bg-surface px-4 py-2 text-sm font-semibold hover:bg-sunken">{t('err.back')}</Link>
      </div>
    </div>
  )
}
