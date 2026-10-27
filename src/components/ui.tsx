import { useEffect, useState, type ReactNode } from 'react'
import { AlertTriangle, Check, RefreshCw, Share2, Star } from 'lucide-react'
import { SourceError } from '../lib/api'
import { useSettings } from '../stores/settings'
import { useT } from '../i18n/useT'
import { timeAgo } from '../lib/time'

export function Segmented<T extends string>({ value, options, onChange, label, size = 'md' }: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  label: string
  size?: 'sm' | 'md'
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap gap-1 rounded-lg bg-sunken p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-md font-medium transition-colors ${size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm'} ${
            value === o.value ? 'bg-surface text-ink shadow-[0_1px_2px_rgba(0,0,0,.12)]' : 'text-muted hover:text-ink'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** "Updated 3 min ago", re-rendered every 30 s. */
export function Freshness({ at, fetching }: { at: number; fetching?: boolean }) {
  const { t, locale } = useT()
  const [, tick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30_000)
    return () => clearInterval(t)
  }, [])
  if (!at) return <span className="text-muted">{t('common.loading')}</span>
  return (
    <span className="inline-flex items-center gap-1.5 text-muted" title={new Date(at).toLocaleString(locale)}>
      {fetching && <RefreshCw className="size-3 animate-spin" aria-hidden />}
      {t('common.updated', { ago: timeAgo(at, locale) })}
    </span>
  )
}

export function SourceProblem({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { t } = useT()
  const src = error instanceof SourceError ? error.source : t('problem.unknownSource')
  const msg = error instanceof SourceError && error.code ? t(error.code === 'timeout' ? 'problem.timeout' : 'problem.network') : error instanceof Error ? error.message : '?'
  return (
    <div role="alert" className="flex items-start gap-2 rounded-lg bg-thambili-soft p-3 text-sm text-ink">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-thambili" aria-hidden />
      <div className="flex-1">
        {t('problem.text', { src, msg })}
      </div>
      {onRetry && (
        <button onClick={onRetry} className="shrink-0 rounded-md px-2 py-0.5 font-semibold text-lagoon hover:bg-lagoon-soft">{t('common.retry')}</button>
      )}
    </div>
  )
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-sunken ${className}`} />
}

export function Panel({ title, action, children, className = '' }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-line bg-surface ${className}`}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-1">
          {title && <h2 className="text-[15px] font-semibold">{title}</h2>}
          {action}
        </header>
      )}
      <div className="px-4 pb-4 pt-2">{children}</div>
    </section>
  )
}

export function Stat({ label, value, unit, sub }: { label: string; value: ReactNode; unit?: string; sub?: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-xs text-muted">{label}</div>
      <div className="text-xl font-semibold leading-tight">
        {value}
        {unit && <span className="ml-0.5 text-sm font-medium text-muted">{unit}</span>}
      </div>
      {sub && <div className="truncate text-xs text-muted">{sub}</div>}
    </div>
  )
}

/** Star a place so it is listed first on the map panel and in Places. */
export function FavoriteButton({ id, name, className = '' }: { id: string; name: string; className?: string }) {
  const { favorites, toggleFavorite } = useSettings()
  const { t } = useT()
  const on = favorites.includes(id)
  return (
    <button
      type="button"
      onClick={() => toggleFavorite(id)}
      aria-pressed={on}
      aria-label={t(on ? 'fav.unstar' : 'fav.star', { name })}
      title={t(on ? 'fav.on' : 'fav.off')}
      className={`rounded-md p-1.5 hover:bg-sunken ${on ? 'text-thambili' : 'text-muted hover:text-ink'} ${className}`}
    >
      <Star className="size-4" fill={on ? 'currentColor' : 'none'} aria-hidden />
    </button>
  )
}

/** Native share sheet where available, otherwise copies the link. */
export function ShareButton({ title, text, path, className = '' }: { title: string; text?: string; path: string; className?: string }) {
  const { t } = useT()
  const [copied, setCopied] = useState(false)
  const url = `${location.origin}${location.pathname}#${path}`
  const share = async () => {
    try {
      if (navigator.share) { await navigator.share({ title, text, url }); return }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { prompt(t('share.prompt'), url) }
  }
  return (
    <button type="button" onClick={share} className={`flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink hover:bg-sunken ${className}`}>
      {copied ? <Check className="size-4 text-paddy" aria-hidden /> : <Share2 className="size-4" aria-hidden />}
      {copied ? t('share.copied') : t('share.share')}
    </button>
  )
}

