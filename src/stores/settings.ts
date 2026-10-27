import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { MetricId } from '../lib/metrics'
import { detectLang, type Lang } from '../i18n/core'

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
      setRefresh: (refreshMinutes) => set({ refreshMinutes }),
      setCompare: (compare) => set({ compare }),
      toggleFavorite: (id) => set((s) => ({ favorites: s.favorites.includes(id) ? s.favorites.filter((x) => x !== id) : [...s.favorites, id] })),
      setNotify: (notify) => set({ notify }),
      setAlertSound: (alertSound) => set({ alertSound }),
    }),
    {
      name: 'lt-settings',
      version: 1,
      partialize: ({ lang, metric, overlay, overlayOpacity, showRivers, showStations, showFlood, refreshMinutes, compare, favorites, notify, alertSound }) =>
        ({ lang, metric, overlay, overlayOpacity, showRivers, showStations, showFlood, refreshMinutes, compare, favorites, notify, alertSound }),
    },
  ),
)
