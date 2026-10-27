import { Link } from 'react-router-dom'
import { GaugeTrend } from './GaugeLevelTile'
import { GAUGE_LEVELS, gaugeSummary, type GaugeStation } from '../lib/gauges'
import { fmt, inkOn } from '../lib/metrics'
import type { Key } from '../i18n/core'
import { useT } from '../i18n/useT'

/** Official gauge counts, as on the department's dashboard, with the worst gauges one tap away. */
export default function GaugeStrip({ gauges, limit = 4 }: { gauges?: GaugeStation[]; limit?: number }) {
  const { t } = useT()
  if (!gauges) return null
  const sum = gaugeSummary(gauges)
  const up = gauges.filter((g) => !g.stale && g.level !== 'normal').slice(0, limit)
  return (
    <section className="rounded-xl border border-line bg-surface p-3">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h2 className="text-[15px] font-semibold">{t('gauges.stripTitle')}</h2>
        <Link to="/gauges" className="text-xs font-medium text-lagoon hover:underline">{t('gauges.open')}</Link>
      </div>
      <div className="grid grid-cols-3 gap-1.5 text-center">
        {(['alert', 'minor', 'major'] as const).map((l) => (
          <div key={l} className="rounded-lg px-1 py-1.5" style={{ background: sum[l] ? GAUGE_LEVELS[l].color : undefined, color: sum[l] ? inkOn(GAUGE_LEVELS[l].color) : undefined }}>
            <div className="text-xl font-extrabold leading-none">{sum[l]}</div>
            <div className={`text-[11px] ${sum[l] ? '' : 'text-muted'}`}>{t(`gaugeLevel.${l}` as Key)}</div>
          </div>
        ))}
      </div>
      {up.length > 0 && (
        <ul className="mt-2 space-y-1">
          {up.map((g) => (
            <li key={g.id}>
              <Link to={`/gauges/${g.id}`} className="flex items-center justify-between gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-sunken">
                <span className="min-w-0 truncate font-medium">{g.name} <span className="text-xs text-muted">· {g.basin}</span></span>
                <span className="flex shrink-0 items-center gap-1 text-xs font-semibold">{fmt(g.latest?.level, 2)} {g.unit}<GaugeTrend g={g} /></span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-1.5 text-[11px] text-muted">{t('gauges.stripNote', { n: sum.reporting, total: sum.stations })}</p>
    </section>
  )
}
