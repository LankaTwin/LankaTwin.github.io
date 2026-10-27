import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Alert, AlertLevel } from '../lib/alerts'

export interface LoggedAlert extends Alert {
  firstSeen: number
  lastSeen: number
  /** When a watch became a warning. */
  escalatedAt?: number
  /** When the signal stopped appearing. */
  clearedAt?: number
}

interface AlertLog {
  /** When this browser session started watching, to mark signals that are new since. */
  openedAt: number
  entries: Record<string, LoggedAlert>
  update: (alerts: Alert[], now?: number) => { added: LoggedAlert[]; escalated: LoggedAlert[] }
}

/** Cleared signals stay in the feed this long. */
const KEEP_CLEARED_MS = 12 * 3600_000
const rank = (l: AlertLevel) => (l === 'warning' ? 2 : 1)

/**
 * A running record of signals for this session: when each first appeared, escalated and
 * cleared. Kept in sessionStorage so a reload doesn't mark everything as new again.
 */
export const useAlertLog = create<AlertLog>()(
  persist(
    (set, get) => ({
      openedAt: Date.now(),
      entries: {},
      update: (alerts, now = Date.now()) => {
        const prev = get().entries
        const next: Record<string, LoggedAlert> = {}
        const added: LoggedAlert[] = []
        const escalated: LoggedAlert[] = []
        const active = new Set(alerts.map((a) => a.id))
        for (const a of alerts) {
          const old = prev[a.id]
          if (!old || old.clearedAt) {
            const e = { ...a, firstSeen: now, lastSeen: now }
            next[a.id] = e
            added.push(e)
          } else {
            const up = rank(a.level) > rank(old.level)
            const e = { ...old, ...a, lastSeen: now, escalatedAt: up ? now : old.escalatedAt }
            next[a.id] = e
            if (up) escalated.push(e)
          }
        }
        for (const [id, e] of Object.entries(prev)) {
          if (active.has(id)) continue
          const clearedAt = e.clearedAt ?? now
          if (now - clearedAt < KEEP_CLEARED_MS) next[id] = { ...e, clearedAt }
        }
        set({ entries: next })
        return { added, escalated }
      },
    }),
    { name: 'lt-alert-log', storage: createJSONStorage(() => sessionStorage), partialize: ({ openedAt, entries }) => ({ openedAt, entries }) },
  ),
)

/** Active first (warnings, then watches, newest first), then cleared, most recently cleared first. */
export function sortLog(entries: LoggedAlert[]) {
  return [...entries].sort((a, b) => {
    if (!!a.clearedAt !== !!b.clearedAt) return a.clearedAt ? 1 : -1
    if (a.clearedAt && b.clearedAt) return b.clearedAt - a.clearedAt
    if (a.level !== b.level) return a.level === 'warning' ? -1 : 1
    return (b.escalatedAt ?? b.firstSeen) - (a.escalatedAt ?? a.firstSeen)
  })
}
