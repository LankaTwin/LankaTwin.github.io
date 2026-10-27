import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Activity, AlertTriangle, Bell, Download, Droplets, Ellipsis, Languages, Map as MapIcon, Moon, Search, Sun, WifiOff, X } from 'lucide-react'
import { useSettings } from '../stores/settings'
import { useEffect, useState } from 'react'
import CommandPalette from './CommandPalette'
import { useActiveSignals, useAlertTracker, useInstallPrompt, useOnline, useSignalNotifications } from '../hooks/useApp'
import { LANGS, type Key, type Lang } from '../i18n/core'
import { useT } from '../i18n/useT'

export const REPO_URL = 'https://github.com/LankaTwin/LankaTwin.github.io'

const NAV: { to: string; label: Key; end?: boolean }[] = [
  { to: '/', label: 'nav.map', end: true },
  { to: '/live', label: 'nav.live' },
  { to: '/stations', label: 'nav.places' },
  { to: '/floods', label: 'nav.floods' },
  { to: '/gauges', label: 'nav.gauges' },
  { to: '/rivers', label: 'nav.rivers' },
  { to: '/air', label: 'nav.air' },
  { to: '/compare', label: 'nav.compare' },
  { to: '/alerts', label: 'nav.signals' },
  { to: '/sources', label: 'nav.sources' },
  { to: '/about', label: 'nav.about' },
]

// Phones get a bottom tab bar with the four screens people reach for in bad weather.
const TABS: { to: string; label: Key; icon: typeof MapIcon; end?: boolean }[] = [
  { to: '/', label: 'nav.map', icon: MapIcon, end: true },
  { to: '/live', label: 'nav.live', icon: Activity },
  { to: '/floods', label: 'nav.floods', icon: Droplets },
  { to: '/alerts', label: 'nav.signals', icon: Bell },
]
const MORE = NAV.filter((n) => !TABS.some((t) => t.to === n.to))

function AlertBell() {
  const { t } = useT()
  const { warnings, watches } = useActiveSignals()
  const n = warnings.length || watches.length
  return (
    <Link
      to="/alerts"
      className="relative rounded-md p-2 text-muted hover:bg-sunken hover:text-ink"
      aria-label={t('layout.alertsBadge', { w: warnings.length, v: watches.length })}
      title={t('layout.alertsBadge', { w: warnings.length, v: watches.length })}
    >
      <Bell className="size-4" aria-hidden />
      {n > 0 && (
        <span className={`absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-bold text-white ${warnings.length ? 'bg-rambutan' : 'bg-thambili'}`}>
          {n > 99 ? '99+' : n}
        </span>
      )}
    </Link>
  )
}

const BANNER_KEY = 'lt-banner-dismissed'

/** A strip under the header while any warning is active; dismissing it hides it until a new warning appears. */
function WarningBanner() {
  const { t } = useT()
  const { warnings } = useActiveSignals()
  const ids = warnings.map((w) => w.id).sort().join(',')
  const [dismissed, setDismissed] = useState(() => { try { return sessionStorage.getItem(BANNER_KEY) ?? '' } catch { return '' } })
  if (!warnings.length || ids === dismissed) return null
  const first = warnings[0]
  return (
    <div role="alert" className="flex shrink-0 items-center gap-2 bg-rambutan px-3 py-1.5 text-xs font-medium text-white sm:text-sm">
      <AlertTriangle className="size-4 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1 truncate">
        <b>{warnings.length === 1 ? t('banner.one') : t('banner.many', { n: warnings.length })}</b> · {first.title}, {first.place}
      </span>
      <Link to="/live" className="shrink-0 rounded bg-white/20 px-2 py-0.5 font-semibold hover:bg-white/30">{t('banner.view')}</Link>
      <button onClick={() => { setDismissed(ids); try { sessionStorage.setItem(BANNER_KEY, ids) } catch { /* storage blocked */ } }} aria-label={t('common.dismiss')} className="shrink-0 rounded p-0.5 hover:bg-white/20"><X className="size-4" /></button>
    </div>
  )
}

function BottomTabs() {
  const { t } = useT()
  const [open, setOpen] = useState(false)
  const loc = useLocation()
  useEffect(() => setOpen(false), [loc.pathname])
  const moreActive = MORE.some((n) => loc.pathname.startsWith(n.to))
  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setOpen(false)}>
          <nav aria-label={t('mobile.menu')} className="absolute inset-x-2 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] grid grid-cols-2 gap-1 rounded-2xl border border-line bg-surface p-2 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {MORE.map((n) => (
              <NavLink key={n.to} to={n.to} className={({ isActive }) => `rounded-lg px-3 py-3 text-sm font-medium ${isActive ? 'bg-lagoon-soft text-lagoon' : 'hover:bg-sunken'}`}>{t(n.label)}</NavLink>
            ))}
          </nav>
        </div>
      )}
      <nav aria-label={t('layout.mainNav')} className="sticky bottom-0 z-30 grid shrink-0 grid-cols-5 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {TABS.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${isActive ? 'text-lagoon' : 'text-muted'}`}>
            <Icon className="size-5" aria-hidden />
            <span className="max-w-full truncate px-1">{t(label)}</span>
          </NavLink>
        ))}
        <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${open || moreActive ? 'text-lagoon' : 'text-muted'}`}>
          <Ellipsis className="size-5" aria-hidden />
          <span>{t('mobile.more')}</span>
        </button>
      </nav>
    </>
  )
}

function AlertTracker() {
  useAlertTracker()
  return null
}

function LanguagePicker() {
  const { lang, setLang } = useSettings()
  const { t } = useT()
  return (
    <label className="relative flex items-center rounded-md border border-line text-sm text-muted hover:bg-sunken hover:text-ink">
      <Languages className="pointer-events-none absolute left-2 size-4" aria-hidden />
      <span className="sr-only">{t('layout.language')}</span>
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value as Lang)}
        className="max-w-24 cursor-pointer appearance-none bg-transparent py-1.5 pr-2 pl-8 text-xs font-medium text-ink outline-none sm:max-w-none sm:text-sm"
      >
        {LANGS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
      </select>
    </label>
  )
}

export function Mark({ className = 'size-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <rect width="64" height="64" rx="14" fill="var(--c-lagoon)" />
      <path d="M30 11c5 1 9 5 12 10 4 7 8 12 9 19 1 8-4 14-11 15-6 1-11-2-14-7-3-6-6-10-6-17 0-8 3-15 10-20z" fill="var(--c-canvas)" />
      <circle cx="34" cy="38" r="5" fill="#E2A11B" />
    </svg>
  )
}

function SignalWatcher() {
  useSignalNotifications()
  return null
}

export default function Layout() {
  const { theme, setTheme, notify } = useSettings()
  const { t, lang } = useT()
  const loc = useLocation()
  const isMap = loc.pathname === '/'
  const online = useOnline()
  const install = useInstallPrompt()
  const [searching, setSearching] = useState(false)
  useEffect(() => { if (!isMap) window.scrollTo(0, 0) }, [loc.pathname, isMap])
  useEffect(() => { document.documentElement.lang = lang }, [lang])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable)
      if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !typing)) {
        e.preventDefault()
        setSearching(true)
      }
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className={`flex flex-col ${isMap ? 'h-dvh' : 'min-h-dvh'}`}>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-surface focus:p-2">{t('layout.skip')}</a>
      <header className="z-20 flex shrink-0 items-center gap-1.5 border-b border-line bg-surface px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] sm:gap-3 sm:px-4">
        <NavLink to="/" className="flex items-center gap-2 pr-1" aria-label={t('layout.home')}>
          <Mark />
          <span className="hidden text-[17px] font-extrabold tracking-tight min-[400px]:inline">LankaTwin</span>
        </NavLink>
        <div className="flex-1 lg:hidden" />
        <nav aria-label={t('layout.mainNav')} className="-mx-1 hidden min-w-0 flex-1 gap-0.5 overflow-x-auto [scrollbar-width:none] lg:flex">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `shrink-0 rounded-md px-2.5 py-1.5 text-sm font-medium ${isActive ? 'bg-lagoon-soft text-lagoon' : 'text-muted hover:text-ink'}`
              }
            >
              {t(n.label)}
            </NavLink>
          ))}
        </nav>
        <button
          type="button"
          onClick={() => setSearching(true)}
          className="flex items-center gap-2 rounded-md border border-line px-2 py-1.5 text-sm text-muted hover:bg-sunken hover:text-ink md:pr-1.5"
          aria-label={t('layout.searchAria')}
        >
          <Search className="size-4" aria-hidden />
          <span className="hidden md:inline">{t('layout.search')}</span>
          <kbd className="hidden rounded bg-sunken px-1 text-[11px] md:inline">/</kbd>
        </button>
        {install && (
          <button type="button" onClick={install} className="hidden items-center gap-1.5 rounded-md bg-lagoon-soft px-2.5 py-1.5 text-sm font-medium text-lagoon hover:brightness-95 sm:flex">
            <Download className="size-4" aria-hidden /> {t('layout.install')}
          </button>
        )}
        <AlertBell />
        <LanguagePicker />
        <button
          type="button"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="rounded-md p-2 text-muted hover:bg-sunken hover:text-ink"
          aria-label={t(theme === 'dark' ? 'layout.toLight' : 'layout.toDark')}
        >
          {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>
      </header>
      <WarningBanner />
      {!online && (
        <div role="status" className="flex shrink-0 items-center justify-center gap-2 bg-thambili-soft px-3 py-1.5 text-xs font-medium">
          <WifiOff className="size-3.5 text-thambili" aria-hidden /> {t('layout.offline')}
        </div>
      )}
      <main id="main" className={isMap ? 'min-h-0 flex-1' : 'flex-1'}>
        <Outlet />
      </main>
      {!isMap && (
        <footer className="border-t border-line px-4 py-5 text-xs text-muted">
          <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-2">
            <span>{t('layout.footer')}</span>
            <a className="underline" href={REPO_URL}>{t('layout.source')}</a>
          </div>
        </footer>
      )}
      <BottomTabs />
      <CommandPalette open={searching} onClose={() => setSearching(false)} />
      <AlertTracker />
      {notify && <SignalWatcher />}
    </div>
  )
}
