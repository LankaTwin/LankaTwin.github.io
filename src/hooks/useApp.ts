import { useEffect, useMemo, useState } from 'react'
import { buildAlerts } from '../lib/alerts'
import { tFor } from '../i18n/core'
import { STATIONS } from '../lib/places'
import { useSettings } from '../stores/settings'
import { useNowcast, useRivers } from './useLiveData'
import { useAlertLog } from '../stores/alertLog'

/** Pass an already-translated title; with none, the app's own name in the interface language. */
export function useTitle(title?: string) {
  const lang = useSettings((s) => s.lang)
  useEffect(() => {
    document.title = title ? `${title} · LankaTwin` : tFor(lang)('title.default')
  }, [title, lang])
}

export function useOnline() {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    addEventListener('online', on)
    addEventListener('offline', off)
    return () => { removeEventListener('online', on); removeEventListener('offline', off) }
  }, [])
  return online
}

interface InstallEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

/** The browser's "install this app" prompt, when it offers one. */
export function useInstallPrompt() {
  const [evt, setEvt] = useState<InstallEvent | null>(null)
  useEffect(() => {
    const h = (e: Event) => { e.preventDefault(); setEvt(e as InstallEvent) }
    const done = () => setEvt(null)
    addEventListener('beforeinstallprompt', h)
    addEventListener('appinstalled', done)
    return () => { removeEventListener('beforeinstallprompt', h); removeEventListener('appinstalled', done) }
  }, [])
  if (!evt) return null
  return async () => { await evt.prompt(); await evt.userChoice; setEvt(null) }
}

export const notificationsSupported = () => typeof window !== 'undefined' && 'Notification' in window

const SEEN_KEY = 'lt-notified'

/**
 * While the app is open, shows a system notification the first time a signal
 * appears: every warning, plus watch-level signals for starred places.
 * Without a server there is no background push, so nothing arrives when the tab is closed.
 */
export function useSignalNotifications() {
  const { notify, favorites, lang } = useSettings()
  const { readings } = useNowcast()
  const { rivers } = useRivers()
  const alerts = useMemo(() => buildAlerts(readings, rivers, lang), [readings, rivers, lang])

  useEffect(() => {
    if (!notify || !notificationsSupported() || Notification.permission !== 'granted' || !readings) return
    let seen: string[] = []
    try { seen = JSON.parse(sessionStorage.getItem(SEEN_KEY) ?? '[]') } catch { /* storage blocked */ }
    // Alert ids are `<kind>-<station id>`, so starred places are matched by id, not by (translated) name.
    const favIds = new Set(STATIONS.filter((s) => favorites.includes(s.id)).map((s) => s.id))
    const fresh = alerts.filter((a) => !seen.includes(`${a.id}:${a.level}`) && (a.level === 'warning' || favIds.has(a.id.slice(a.id.indexOf('-') + 1))))
    for (const a of fresh.slice(0, 3)) {
      try {
        const n = new Notification(`${a.title} · ${a.place}`, { body: a.detail, icon: './icon-192.png', tag: a.id })
        n.onclick = () => { window.focus(); location.hash = `#${a.href}` }
      } catch { /* some mobile browsers only allow notifications from a service worker */ }
    }
    if (fresh.length) {
      try { sessionStorage.setItem(SEEN_KEY, JSON.stringify([...seen, ...fresh.map((a) => `${a.id}:${a.level}`)])) } catch { /* storage blocked */ }
    }
  }, [alerts, notify, favorites, readings])
}

/** A short two-tone chime, made in the browser so there is no audio file to load. */
export function chime() {
  try {
    const ctx = new AudioContext()
    ;[880, 660].forEach((f, i) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.frequency.value = f
      g.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.22)
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + i * 0.22 + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.22 + 0.2)
      o.connect(g).connect(ctx.destination)
      o.start(ctx.currentTime + i * 0.22)
      o.stop(ctx.currentTime + i * 0.22 + 0.22)
    })
    setTimeout(() => ctx.close(), 800)
  } catch { /* audio unavailable or blocked until the user interacts */ }
}

/**
 * Keeps the session's alert log in step with the live data on every page, and chimes
 * (if switched on) when a new warning appears or a watch escalates to one.
 */
export function useAlertTracker() {
  const { lang, alertSound } = useSettings()
  const { readings } = useNowcast()
  const { rivers } = useRivers()
  const update = useAlertLog((s) => s.update)
  const alerts = useMemo(() => buildAlerts(readings, rivers, lang), [readings, rivers, lang])
  useEffect(() => {
    if (!readings) return
    const { added, escalated } = update(alerts)
    if (alertSound && [...added, ...escalated].some((a) => a.level === 'warning')) chime()
  }, [alerts]) // eslint-disable-line react-hooks/exhaustive-deps
}

/** Active signals from the log, for the header badge and banner. */
export function useActiveSignals() {
  const entries = useAlertLog((s) => s.entries)
  return useMemo(() => {
    const active = Object.values(entries).filter((e) => !e.clearedAt)
    return { active, warnings: active.filter((e) => e.level === 'warning'), watches: active.filter((e) => e.level === 'watch') }
  }, [entries])
}
