import { Link } from 'react-router-dom'
import { CloudRain, Thermometer, Wind, Factory, Waves, ShieldCheck } from 'lucide-react'
import type { Alert, AlertKind } from '../lib/alerts'

const ICON: Record<AlertKind, typeof CloudRain> = { rain: CloudRain, heat: Thermometer, wind: Wind, air: Factory, river: Waves }

export default function AlertList({ alerts, limit, compact }: { alerts: Alert[]; limit?: number; compact?: boolean }) {
  if (!alerts.length) {
    return (
      <div className="flex items-center gap-2.5 rounded-lg bg-paddy-soft px-3 py-2.5 text-sm">
        <ShieldCheck className="size-4 text-paddy" aria-hidden />
        No rain, heat, wind, air or river signals above screening thresholds right now.
      </div>
    )
  }
  const shown = limit ? alerts.slice(0, limit) : alerts
  return (
    <ul className="space-y-1.5">
      {shown.map((a) => {
        const Icon = ICON[a.kind]
        const warn = a.level === 'warning'
        return (
          <li key={a.id}>
            <Link
              to={a.href}
              className={`flex items-start gap-2.5 rounded-lg border-l-[3px] px-3 py-2 hover:brightness-[.97] ${
                warn ? 'border-rambutan bg-rambutan-soft' : 'border-thambili bg-thambili-soft'
              }`}
            >
              <Icon className={`mt-0.5 size-4 shrink-0 ${warn ? 'text-rambutan' : 'text-thambili'}`} aria-hidden />
              <div className="min-w-0 text-sm">
                <div className="font-semibold">
                  {a.title} <span className="font-normal text-muted">· {a.place}</span>
                </div>
                {!compact && <div className="text-muted">{a.detail}</div>}
              </div>
              <span className="sr-only">{warn ? 'Warning level' : 'Watch level'}</span>
            </Link>
          </li>
        )
      })}
      {limit && alerts.length > limit && (
        <li className="px-1 pt-1 text-sm">
          <Link to="/alerts" className="font-medium text-lagoon hover:underline">See all {alerts.length} signals</Link>
        </li>
      )}
    </ul>
  )
}
