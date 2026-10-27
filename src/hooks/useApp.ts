import { useEffect, useMemo, useState } from 'react'
import { buildAlerts } from '../lib/alerts'
import { STATIONS } from '../lib/places'
import { useSettings } from '../stores/settings'
import { useNowcast, useRivers } from './useLiveData'

/** Sets the browser tab title for the current screen. */
export function useTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · LankaTwin` : 'LankaTwin — live weather, rivers and air for Sri Lanka'
  }, [title])
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
  const { notify, favorites } = useSettings()
  const { readings } = useNowcast()
  const { rivers } = useRivers()
  const alerts = useMemo(() => buildAlerts(readings, rivers), [readings, rivers])

  useEffect(() => {
    if (!notify || !notificationsSupported() || Notification.permission !== 'granted' || !readings) return
    let seen: string[] = []
    try { seen = JSON.parse(sessionStorage.getItem(SEEN_KEY) ?? '[]') } catch { /* storage blocked */ }
    const favNames = new Set(STATIONS.filter((s) => favorites.includes(s.id)).map((s) => s.name))
    const fresh = alerts.filter((a) => !seen.includes(`${a.id}:${a.level}`) && (a.level === 'warning' || favNames.has(a.place)))
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
