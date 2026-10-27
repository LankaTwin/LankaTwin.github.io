import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Moon, Sun } from 'lucide-react'
import { useSettings } from '../stores/settings'
import { useEffect } from 'react'

const NAV = [
  { to: '/', label: 'Map', end: true },
  { to: '/stations', label: 'Places' },
  { to: '/rivers', label: 'Rivers' },
  { to: '/compare', label: 'Compare' },
  { to: '/alerts', label: 'Signals' },
  { to: '/sources', label: 'Sources' },
  { to: '/about', label: 'About' },
]

function Mark() {
  return (
    <svg viewBox="0 0 64 64" className="size-7" aria-hidden>
      <rect width="64" height="64" rx="14" fill="var(--c-lagoon)" />
      <path d="M30 11c5 1 9 5 12 10 4 7 8 12 9 19 1 8-4 14-11 15-6 1-11-2-14-7-3-6-6-10-6-17 0-8 3-15 10-20z" fill="var(--c-canvas)" />
      <circle cx="34" cy="38" r="5" fill="#E2A11B" />
    </svg>
  )
}

export default function Layout() {
  const { theme, setTheme } = useSettings()
  const loc = useLocation()
  const isMap = loc.pathname === '/'
  useEffect(() => { if (!isMap) window.scrollTo(0, 0) }, [loc.pathname, isMap])

  return (
    <div className={`flex flex-col ${isMap ? 'h-dvh' : 'min-h-dvh'}`}>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-surface focus:p-2">Skip to content</a>
      <header className="z-20 flex shrink-0 items-center gap-3 border-b border-line bg-surface px-3 py-2 sm:px-4">
        <NavLink to="/" className="flex items-center gap-2 pr-2" aria-label="LankaTwin home">
          <Mark />
          <span className="text-[17px] font-extrabold tracking-tight">LankaTwin</span>
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
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="rounded-md p-2 text-muted hover:bg-sunken hover:text-ink"
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>
      </header>
      <main id="main" className={isMap ? 'min-h-0 flex-1' : 'flex-1'}>
        <Outlet />
      </main>
      {!isMap && (
        <footer className="border-t border-line px-4 py-5 text-xs text-muted">
          <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-2">
            <span>LankaTwin is an open-source, unofficial tool. For official warnings follow the Department of Meteorology and the Disaster Management Centre (hotline 117).</span>
            <a className="underline" href="https://github.com/AshenWijesingha/LankaTwin">Source on GitHub</a>
          </div>
        </footer>
      )}
    </div>
  )
}
