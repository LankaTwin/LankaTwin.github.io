import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { METRIC_ORDER, type MetricId } from '../lib/metrics'
import { detectLang, LANGS, type Lang } from '../i18n/core'

export type Overlay = 'none' | 'truecolor' | 'flood' | 'ndvi' | 'imerg' | 'lst'
export type Theme = 'light' | 'dark'

interface Settings {
  theme: Theme
  lang: Lang
  metric: MetricId
  overlay: Overlay
  overlayOpacity: number
  overlayDate: string // YYYY-MM-DD for daily satellite imagery
  showRivers: boolean
  showStations: boolean
  showFlood: boolean
  showGauges: boolean
  showBasins: boolean
  showFloodAreas: boolean
  refreshMinutes: number
  compare: string[]
  favorites: string[]
  notify: boolean
  alertSound: boolean
  setTheme: (t: Theme) => void
  setLang: (l: Lang) => void
  setMetric: (m: MetricId) => void
  setOverlay: (o: Overlay) => void
  setOverlayOpacity: (n: number) => void
  setOverlayDate: (d: string) => void
  toggleRivers: () => void
  toggleStations: () => void
  setShowFlood: (on: boolean) => void
  setShowGauges: (on: boolean) => void
  setShowBasins: (on: boolean) => void
  setShowFloodAreas: (on: boolean) => void
  setRefresh: (n: number) => void
  setCompare: (ids: string[]) => void
  toggleFavorite: (id: string) => void
  setNotify: (on: boolean) => void
  setAlertSound: (on: boolean) => void
}

const initialTheme = (): Theme =>
  typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light'

export const yesterday = () => {
  const d = new Date(Date.now() - 864e5)
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' })
}

const OVERLAYS: Overlay[] = ['none', 'truecolor', 'flood', 'ndvi', 'imerg', 'lst']
const REFRESH = [5, 10, 15, 30, 60]
const ID = /^[a-z0-9-]{1,40}$/

/**
 * Saved settings come back from localStorage, which anything on the device can edit. Keep only
 * values of the right type and range, so a corrupt or tampered entry can't break the app or
 * make it poll the sources in a tight loop.
 */
export function sanitizeSettings(raw: unknown): Partial<Settings> {
  if (!raw || typeof raw !== 'object') return {}
  const p = raw as Record<string, unknown>
  const out: Partial<Settings> = {}
  const bool = (k: keyof Settings) => { if (typeof p[k] === 'boolean') (out as Record<string, unknown>)[k] = p[k] }
  if (LANGS.some((l) => l.id === p.lang)) out.lang = p.lang as Lang
  if (METRIC_ORDER.includes(p.metric as MetricId)) out.metric = p.metric as MetricId
  if (OVERLAYS.includes(p.overlay as Overlay)) out.overlay = p.overlay as Overlay
  if (typeof p.overlayOpacity === 'number' && p.overlayOpacity >= 0.1 && p.overlayOpacity <= 1) out.overlayOpacity = p.overlayOpacity
  if (typeof p.refreshMinutes === 'number' && REFRESH.includes(p.refreshMinutes)) out.refreshMinutes = p.refreshMinutes
  const ids = (x: unknown, max: number) => (Array.isArray(x) ? [...new Set(x.filter((v): v is string => typeof v === 'string' && ID.test(v)))].slice(0, max) : undefined)
  const compare = ids(p.compare, 5)
  if (compare?.length) out.compare = compare
  const favorites = ids(p.favorites, 60)
  if (favorites) out.favorites = favorites
  for (const k of ['showRivers', 'showStations', 'showFlood', 'showGauges', 'showBasins', 'showFloodAreas', 'notify', 'alertSound'] as const) bool(k)
  return out
}

export const useSettings = create<Settings>()(
  persist(
    (set) => ({
      theme: initialTheme(),
      lang: detectLang(),
      metric: 'temp',
      overlay: 'none',
      overlayOpacity: 0.75,
      overlayDate: yesterday(),
      showRivers: true,
      showStations: true,
      showFlood: false,
      showGauges: true,
      showBasins: false,
      showFloodAreas: false,
      refreshMinutes: 10,
      compare: ['colombo', 'kandy', 'jaffna'],
      favorites: [],
      notify: false,
      alertSound: false,
      setTheme: (theme) => {
        document.documentElement.classList.toggle('dark', theme === 'dark')
        try { localStorage.setItem('lt-theme', theme) } catch { /* storage blocked */ }
        set({ theme })
      },
      setLang: (lang) => set({ lang }),
      setMetric: (metric) => set({ metric }),
      setOverlay: (overlay) => set({ overlay }),
      setOverlayOpacity: (overlayOpacity) => set({ overlayOpacity }),
      setOverlayDate: (overlayDate) => set({ overlayDate }),
      toggleRivers: () => set((s) => ({ showRivers: !s.showRivers })),
      toggleStations: () => set((s) => ({ showStations: !s.showStations })),
      setShowFlood: (showFlood) => set({ showFlood }),
      setShowGauges: (showGauges) => set({ showGauges }),
      setShowBasins: (showBasins) => set({ showBasins }),
      setShowFloodAreas: (showFloodAreas) => set({ showFloodAreas }),
      setRefresh: (refreshMinutes) => set({ refreshMinutes }),
      setCompare: (compare) => set({ compare }),
      toggleFavorite: (id) => set((s) => ({ favorites: s.favorites.includes(id) ? s.favorites.filter((x) => x !== id) : [...s.favorites, id] })),
      setNotify: (notify) => set({ notify }),
      setAlertSound: (alertSound) => set({ alertSound }),
    }),
    {
      name: 'lt-settings',
      version: 1,
      merge: (persisted, current) => ({ ...current, ...sanitizeSettings(persisted) }),
      partialize: ({ lang, metric, overlay, overlayOpacity, showRivers, showStations, showFlood, showGauges, showBasins, showFloodAreas, refreshMinutes, compare, favorites, notify, alertSound }) =>
        ({ lang, metric, overlay, overlayOpacity, showRivers, showStations, showFlood, showGauges, showBasins, showFloodAreas, refreshMinutes, compare, favorites, notify, alertSound }),
    },
  ),
)
