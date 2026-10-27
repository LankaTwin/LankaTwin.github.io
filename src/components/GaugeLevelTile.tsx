import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react'
import { GAUGE_LEVELS, type GaugeStation } from '../lib/gauges'
import { fmt, inkOn } from '../lib/metrics'
import { readingTime, timeAgo } from '../lib/time'
import type { Key } from '../i18n/core'
import { useT } from '../i18n/useT'

const STALE = '#8a9399'

export function GaugeTrend({ g, className = 'size-3.5' }: { g: GaugeStation; className?: string }) {
  const { t } = useT()
  if (!g.trend) return null
  const Icon = g.trend === 'up' ? ArrowUpRight : g.trend === 'down' ? ArrowDownRight : ArrowRight
  const label = t(`gauge.trend.${g.trend}` as Key)
  return <Icon className={className} aria-label={label}><title>{label}</title></Icon>
}

/** The current-level indicator: status colour, level, trend and reading time, like the department's dashboard. */
export default function GaugeLevelTile({ g, className = '' }: { g: GaugeStation; className?: string }) {
  const { t, locale } = useT()
  const bg = g.stale ? STALE : GAUGE_LEVELS[g.level].color
  const ink = inkOn(bg)
  const v = g.latest?.level
  return (
    <div className={`flex items-center gap-3 rounded-xl px-4 py-3 ${className}`} style={{ background: bg, color: ink }}>
      <GaugeTrend g={g} className="size-8 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-4xl font-extrabold leading-none tracking-tight">
          {g.rainOnly ? <span className="text-xl">{t('gauge.rainOnly')}</span> : <>{fmt(v, 2)}<span className="ml-1 text-base font-semibold">{g.unit}</span></>}
        </div>
        <div className="mt-1 text-sm font-semibold">{t(g.stale ? 'gauge.stale' : (`gaugeLevel.${g.level}` as Key))}</div>
      </div>
      {g.latest && (
        <div className="text-right text-xs font-medium opacity-90">
          <div>{readingTime(g.latest.time, locale)}</div>
          <div>{timeAgo(g.latest.time, locale)}</div>
        </div>
      )}
    </div>
  )
}
