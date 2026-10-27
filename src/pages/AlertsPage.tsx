import { useMemo, useState } from 'react'
import { Bell, BellOff, Phone } from 'lucide-react'
import AlertList from '../components/AlertList'
import { Freshness, Skeleton } from '../components/ui'
import { useNowcast, useRivers } from '../hooks/useLiveData'
import { buildAlerts, RULES } from '../lib/alerts'
import { notificationsSupported, useTitle } from '../hooks/useApp'
import { useSettings } from '../stores/settings'

// National emergency numbers, free from any phone in Sri Lanka.
const EMERGENCY = [
  { n: '117', who: 'Disaster Management Centre', what: 'Floods, landslides, cyclones, evacuation' },
  { n: '119', who: 'Police emergency', what: 'Immediate danger, crime, accidents' },
  { n: '110', who: 'Fire and rescue', what: 'Fire, trapped people' },
  { n: '1990', who: 'Suwa Seriya ambulance', what: 'Free emergency ambulance' },
]

export default function AlertsPage() {
  const { readings, updatedAt, weather } = useNowcast()
  const { rivers } = useRivers()
  const alerts = useMemo(() => buildAlerts(readings, rivers), [readings, rivers])
  useTitle('Signals')
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-3xl font-extrabold tracking-tight">Signals</h1>
      <p className="mb-5 mt-1 text-muted">
        Places where model data crosses a screening threshold. These are early heads-ups, not official warnings — for those, follow the
        {' '}<a className="text-lagoon underline" href="https://www.meteo.gov.lk">Department of Meteorology</a> and the
        {' '}<a className="text-lagoon underline" href="https://www.dmc.gov.lk">Disaster Management Centre</a> (hotline 117).
      </p>
      {readings ? <AlertList alerts={alerts} /> : <Skeleton className="h-40" />}
      <p className="mt-3 text-xs text-muted"><Freshness at={updatedAt} fetching={weather.isFetching} /></p>

      <NotifyToggle />

      <h2 className="mb-2 mt-8 text-lg font-bold">Emergency numbers</h2>
      <ul className="grid gap-2 sm:grid-cols-2">
        {EMERGENCY.map((e) => (
          <li key={e.n}>
            <a href={`tel:${e.n}`} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3 hover:border-rambutan">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-rambutan-soft text-rambutan"><Phone className="size-4" aria-hidden /></span>
              <span className="min-w-0">
                <span className="block text-xl font-extrabold leading-tight">{e.n}</span>
                <span className="block text-sm font-semibold">{e.who}</span>
                <span className="block text-xs text-muted">{e.what}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>

      <h2 className="mb-2 mt-8 text-lg font-bold">Thresholds</h2>
      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-line text-left text-muted"><th className="p-3 font-medium">Signal</th><th className="p-3 font-medium">Watch</th><th className="p-3 font-medium">Warning</th><th className="p-3 font-medium">Based on</th></tr></thead>
          <tbody className="[&_td]:p-3 [&_tr]:border-b [&_tr]:border-line [&_tr:last-child]:border-0">
            <tr><td>Rain</td><td>{RULES.rain.watch} mm / 24 h</td><td>{RULES.rain.warning} mm / 24 h</td><td className="text-muted">Past or next 24 h, whichever is higher</td></tr>
            <tr><td>Heat</td><td>Feels like {RULES.heat.watch}°C</td><td>{RULES.heat.warning}°C</td><td className="text-muted">Apparent temperature, today and tomorrow</td></tr>
            <tr><td>Wind</td><td>Gusts {RULES.gust.watch} km/h</td><td>{RULES.gust.warning} km/h</td><td className="text-muted">Current and today’s max gust</td></tr>
            <tr><td>Air</td><td>US AQI {RULES.aqi.watch}</td><td>{RULES.aqi.warning}</td><td className="text-muted">CAMS model, current hour</td></tr>
            <tr><td>Rivers</td><td>Peak 1.8× median</td><td>3× median</td><td className="text-muted">GloFAS 10-day peak vs 30-day median</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function NotifyToggle() {
  const { notify, setNotify } = useSettings()
  const [perm, setPerm] = useState(() => (notificationsSupported() ? Notification.permission : 'denied'))
  if (!notificationsSupported()) return null
  const on = notify && perm === 'granted'
  const toggle = async () => {
    if (on) { setNotify(false); return }
    const p = perm === 'granted' ? perm : await Notification.requestPermission()
    setPerm(p)
    setNotify(p === 'granted')
  }
  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface p-4">
      <div className="min-w-0 flex-1">
        <h2 className="flex items-center gap-1.5 font-semibold">{on ? <Bell className="size-4 text-lagoon" aria-hidden /> : <BellOff className="size-4 text-muted" aria-hidden />} Notify me</h2>
        <p className="text-sm text-muted">
          {perm === 'denied'
            ? 'Notifications are blocked for this site in your browser settings.'
            : 'While LankaTwin is open, get a notification for each new warning anywhere, and for any signal at your starred places.'}
        </p>
      </div>
      <button
        onClick={toggle}
        disabled={perm === 'denied'}
        aria-pressed={on}
        className={`rounded-lg px-3 py-1.5 text-sm font-semibold disabled:opacity-50 ${on ? 'border border-line bg-surface hover:bg-sunken' : 'bg-lagoon text-canvas hover:brightness-110'}`}
      >
        {on ? 'Turn off' : 'Turn on'}
      </button>
    </div>
  )
}
