import { useMemo } from 'react'
import AlertList from '../components/AlertList'
import { Freshness, Skeleton } from '../components/ui'
import { useNowcast, useRivers } from '../hooks/useLiveData'
import { buildAlerts, RULES } from '../lib/alerts'

export default function AlertsPage() {
  const { readings, updatedAt, weather } = useNowcast()
  const { rivers } = useRivers()
  const alerts = useMemo(() => buildAlerts(readings, rivers), [readings, rivers])
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
