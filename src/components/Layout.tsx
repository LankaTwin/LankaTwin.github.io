import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Activity, AlertTriangle, ChevronDown, Bell, Download, Droplets, Ellipsis, Languages, Map as MapIcon, Moon, Search, Sun, WifiOff, X } from 'lucide-react'
import { useSettings } from '../stores/settings'
import { useEffect, useRef, useState } from 'react'
import CommandPalette from './CommandPalette'
import { Mark, Wordmark } from './Logo'
import { applyHead, pageMeta } from '../lib/seo'
import { useGauges } from '../hooks/useGauges'
import { useActiveSignals, useAlertTracker, useInstallPrompt, useOnline, useSignalNotifications } from '../hooks/useApp'
import { LANGS, type Key, type Lang } from '../i18n/core'
import { useT } from '../i18n/useT'

export const REPO_URL = 'https://github.com/LankaTwin/LankaTwin.github.io'

// `extra` items fold into a More menu on small laptops (1024–1279 px), where all eleven don't fit.
const NAV: { to: string; label: Key; end?: boolean; extra?: boolean }[] = [
  { to: '/', label: 'nav.map', end: true },
  { to: '/live', label: 'nav.live' },
  { to: '/stations', label: 'nav.places' },
  { to: '/floods', label: 'nav.floods' },
  { to: '/gauges', label: 'nav.gauges' },
  { to: '/rivers', label: 'nav.rivers' },
  { to: '/air', label: 'nav.air' },
  { to: '/compare', label: 'nav.compare', extra: true },
  { to: '/alerts', label: 'nav.signals', extra: true },
  { to: '/sources', label: 'nav.sources', extra: true },
  { to: '/about', label: 'nav.about', extra: true },
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
      <Link to="/live" className="inline-flex min-h-6 shrink-0 items-center rounded bg-white/20 px-2 py-0.5 font-semibold hover:bg-white/30">{t('banner.view')}</Link>
      <button onClick={() => { setDismissed(ids); try { sessionStorage.setItem(BANNER_KEY, ids) } catch { /* storage blocked */ } }} aria-label={t('common.dismiss')} className="grid size-7 shrink-0 place-items-center rounded hover:bg-white/20"><X className="size-4" /></button>
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

/** The folded nav items on small laptops. */
function DesktopMore() {
  const { t } = useT()
  const loc = useLocation()
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const items = NAV.filter((n) => n.extra)
  const active = items.some((n) => loc.pathname.startsWith(n.to))
  useEffect(() => setOpen(false), [loc.pathname])
  useEffect(() => {
    if (!open) return
    const off = (e: Event) => { if (!box.current?.contains(e.target as Node)) setOpen(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', off)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('pointerdown', off); document.removeEventListener('keydown', esc) }
  }, [open])
  return (
    <div ref={box} className="relative hidden shrink-0 lg:block xl:hidden">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="true"
        className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm font-medium ${open || active ? 'bg-lagoon-soft text-lagoon' : 'text-muted hover:text-ink'}`}>
        {t('mobile.more')} <ChevronDown className={`size-3.5 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      {open && (
        <div className="absolute left-0 z-50 mt-1.5 w-48 rounded-xl border border-line bg-surface p-1.5 shadow-xl">
          {items.map((n) => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => `block rounded-md px-3 py-2 text-sm font-medium ${isActive ? 'bg-lagoon-soft text-lagoon' : 'hover:bg-sunken'}`}>{t(n.label)}</NavLink>
          ))}
        </div>
      )}
    </div>
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

/** Description, canonical link, share tags and structured data follow the current page. */
function useSeoHead(pathname: string) {
  const { gauges } = useGauges()
  useEffect(() => {
    const m = pageMeta(pathname, gauges?.map((g) => ({ id: g.id, name: g.name, basin: g.basin, lat: g.lat, lon: g.lon })))
    if (m) applyHead(m, m.title)
  }, [pathname, gauges])
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
  useSeoHead(loc.pathname)

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
          <Mark className="size-8" />
          <Wordmark className="hidden text-[18px] min-[400px]:inline" />
        </NavLink>
        <div className="flex-1 lg:hidden" />
        <nav aria-label={t('layout.mainNav')} className="-mx-1 hidden min-w-0 flex-1 gap-0.5 overflow-x-auto [scrollbar-width:none] lg:flex">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `shrink-0 rounded-md px-2.5 py-1.5 text-sm font-medium ${n.extra ? 'hidden xl:block' : ''} ${isActive ? 'bg-lagoon-soft text-lagoon' : 'text-muted hover:text-ink'}`
              }
            >
              {t(n.label)}
            </NavLink>
          ))}
        </nav>
        <DesktopMore />
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
            <a className="inline-block py-1 underline" href={REPO_URL}>{t('layout.source')}</a>
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
