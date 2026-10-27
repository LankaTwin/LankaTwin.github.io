import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { MetricId } from '../lib/metrics'

export type Overlay = 'none' | 'truecolor' | 'ndvi' | 'imerg' | 'lst'
export type Theme = 'light' | 'dark'

interface Settings {
  theme: Theme
  metric: MetricId
  overlay: Overlay
  overlayOpacity: number
  overlayDate: string // YYYY-MM-DD for daily satellite imagery
  showRivers: boolean
  showStations: boolean
  refreshMinutes: number
  compare: string[]
  setTheme: (t: Theme) => void
  setMetric: (m: MetricId) => void
  setOverlay: (o: Overlay) => void
  setOverlayOpacity: (n: number) => void
  setOverlayDate: (d: string) => void
  toggleRivers: () => void
  toggleStations: () => void
  setRefresh: (n: number) => void
  setCompare: (ids: string[]) => void
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
      metric: 'temp',
      overlay: 'none',
      overlayOpacity: 0.75,
      overlayDate: yesterday(),
      showRivers: true,
      showStations: true,
      refreshMinutes: 10,
      compare: ['colombo', 'kandy', 'jaffna'],
      setTheme: (theme) => {
        document.documentElement.classList.toggle('dark', theme === 'dark')
        try { localStorage.setItem('lt-theme', theme) } catch { /* storage blocked */ }
        set({ theme })
      },
      setMetric: (metric) => set({ metric }),
      setOverlay: (overlay) => set({ overlay }),
      setOverlayOpacity: (overlayOpacity) => set({ overlayOpacity }),
      setOverlayDate: (overlayDate) => set({ overlayDate }),
      toggleRivers: () => set((s) => ({ showRivers: !s.showRivers })),
      toggleStations: () => set((s) => ({ showStations: !s.showStations })),
      setRefresh: (refreshMinutes) => set({ refreshMinutes }),
      setCompare: (compare) => set({ compare }),
    }),
    {
      name: 'lt-settings',
      version: 1,
      partialize: ({ metric, overlay, overlayOpacity, showRivers, showStations, refreshMinutes, compare }) =>
        ({ metric, overlay, overlayOpacity, showRivers, showStations, refreshMinutes, compare }),
    },
  ),
)
