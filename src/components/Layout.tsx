import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Download, Moon, Search, Sun, WifiOff } from 'lucide-react'
import { useSettings } from '../stores/settings'
import { useEffect, useState } from 'react'
import CommandPalette from './CommandPalette'
import { useInstallPrompt, useOnline, useSignalNotifications } from '../hooks/useApp'

export const REPO_URL = 'https://github.com/LankaTwin/LankaTwin.github.io'

const NAV = [
  { to: '/', label: 'Map', end: true },
  { to: '/stations', label: 'Places' },
  { to: '/rivers', label: 'Rivers' },
  { to: '/compare', label: 'Compare' },
  { to: '/alerts', label: 'Signals' },
  { to: '/sources', label: 'Sources' },
  { to: '/about', label: 'About' },
]

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
  const loc = useLocation()
  const isMap = loc.pathname === '/'
  const online = useOnline()
  const install = useInstallPrompt()
  const [searching, setSearching] = useState(false)
  useEffect(() => { if (!isMap) window.scrollTo(0, 0) }, [loc.pathname, isMap])

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
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-surface focus:p-2">Skip to content</a>
      <header className="z-20 flex shrink-0 items-center gap-2 border-b border-line bg-surface px-3 py-2 sm:gap-3 sm:px-4">
        <NavLink to="/" className="flex items-center gap-2 pr-1" aria-label="LankaTwin home">
          <Mark />
          <span className="hidden text-[17px] font-extrabold tracking-tight min-[400px]:inline">LankaTwin</span>
        </NavLink>
        <nav aria-label="Main" className="-mx-1 flex min-w-0 flex-1 gap-0.5 overflow-x-auto [scrollbar-width:none]">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `shrink-0 rounded-md px-2.5 py-1.5 text-sm font-medium ${isActive ? 'bg-lagoon-soft text-lagoon' : 'text-muted hover:text-ink'}`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
        <button
          type="button"
          onClick={() => setSearching(true)}
          className="flex items-center gap-2 rounded-md border border-line px-2 py-1.5 text-sm text-muted hover:bg-sunken hover:text-ink md:pr-1.5"
          aria-label="Search places and rivers"
        >
          <Search className="size-4" aria-hidden />
          <span className="hidden md:inline">Search</span>
          <kbd className="hidden rounded bg-sunken px-1 text-[11px] md:inline">/</kbd>
        </button>
        {install && (
          <button type="button" onClick={install} className="hidden items-center gap-1.5 rounded-md bg-lagoon-soft px-2.5 py-1.5 text-sm font-medium text-lagoon hover:brightness-95 sm:flex">
            <Download className="size-4" aria-hidden /> Install
          </button>
        )}
        <button
          type="button"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="rounded-md p-2 text-muted hover:bg-sunken hover:text-ink"
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>
      </header>
      {!online && (
        <div role="status" className="flex shrink-0 items-center justify-center gap-2 bg-thambili-soft px-3 py-1.5 text-xs font-medium">
          <WifiOff className="size-3.5 text-thambili" aria-hidden /> You’re offline. Showing the last data saved on this device; it refreshes when you reconnect.
        </div>
      )}
      <main id="main" className={isMap ? 'min-h-0 flex-1' : 'flex-1'}>
        <Outlet />
      </main>
      {!isMap && (
        <footer className="border-t border-line px-4 py-5 text-xs text-muted">
          <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-2">
            <span>LankaTwin is an open-source, unofficial tool. For official warnings follow the Department of Meteorology and the Disaster Management Centre (hotline 117).</span>
            <a className="underline" href={REPO_URL}>Source on GitHub</a>
          </div>
        </footer>
      )}
      <CommandPalette open={searching} onClose={() => setSearching(false)} />
      {notify && <SignalWatcher />}
    </div>
  )
}
