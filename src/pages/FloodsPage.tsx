import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ExternalLink, Layers, Map as MapIcon, ShieldAlert } from 'lucide-react'
import EmergencyContacts from '../components/EmergencyContacts'
import Scene from '../components/Scene'
import { Freshness, SourceProblem, Skeleton } from '../components/ui'
import { useTitle } from '../hooks/useApp'
import { useNowcast, useRivers } from '../hooks/useLiveData'
import { FLOOD_LEVELS, FLOOD_RAIN_CAP, FLOOD_RIVER_KM, FLOOD_WEIGHTS, nearestRiver } from '../lib/flood'
import { fmt, inkOn, RIVER_LEVELS, riverLevelText } from '../lib/metrics'
import { placeName, riverNames } from '../lib/places'
import { DICTS, rich, type Key } from '../i18n/core'
import { useT } from '../i18n/useT'
import { useSettings, yesterday } from '../stores/settings'

const LINKS: [Key, string][] = [
  ['floods.link.dmc', 'https://www.dmc.gov.lk'],
  ['floods.link.dom', 'https://www.meteo.gov.lk'],
  ['floods.link.irr', 'https://www.irrigation.gov.lk'],
  ['floods.link.nbro', 'https://www.nbro.gov.lk'],
]

export default function FloodsPage() {
  const { t, lang } = useT()
  useTitle(t('floods.title'))
  const nav = useNavigate()
  const { readings, weather, updatedAt } = useNowcast()
  const { rivers } = useRivers()
  const s = useSettings()

  const ranked = useMemo(() => [...(readings ?? [])].sort((a, b) => (b.flood?.score ?? 0) - (a.flood?.score ?? 0)), [readings])
  const high = useMemo(() => [...(rivers ?? [])].filter((r) => r.level !== 'normal').sort((a, b) => (b.ratio ?? 0) - (a.ratio ?? 0)), [rivers])

  const showRisk = () => { s.setShowFlood(true); s.setMetric('flood'); nav('/') }
  const showWater = () => { s.setOverlayDate(yesterday()); s.setOverlay('flood'); nav('/') }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-6">
      <Scene id="flood" className="h-48 rounded-2xl sm:h-64">
        <h1 className="absolute bottom-4 left-4 text-4xl font-extrabold tracking-tight text-white drop-shadow sm:bottom-6 sm:left-6 sm:text-5xl">{t('floods.title')}</h1>
      </Scene>

      <section>
        <p className="max-w-3xl text-muted">
          {rich(t('floods.intro'), {
            dmc: <a className="text-lagoon underline" href="https://www.dmc.gov.lk">{t('common.dmc')}</a>,
            irr: <a className="text-lagoon underline" href="https://www.irrigation.gov.lk">{t('floods.irr')}</a>,
          })}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={showRisk} className="flex items-center gap-2 rounded-lg bg-lagoon px-4 py-2 text-sm font-semibold text-canvas hover:brightness-110"><MapIcon className="size-4" aria-hidden /> {t('floods.showMap')}</button>
          <button onClick={showWater} className="flex items-center gap-2 rounded-lg border border-line bg-surface px-4 py-2 text-sm font-semibold hover:bg-sunken"><Layers className="size-4" aria-hidden /> {t('floods.showWater')}</button>
        </div>
      </section>

      {weather.error && <SourceProblem error={weather.error} onRetry={() => weather.refetch()} />}

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section>
          <h2 className="text-xl font-bold">{t('floods.riskTitle')}</h2>
          <p className="mb-3 text-sm text-muted">{t('floods.riskIntro')}</p>
          {!readings ? <Skeleton className="h-96" /> : (
            <div className="overflow-x-auto rounded-xl border border-line bg-surface">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-muted">
                    <th className="p-3 font-medium">{t('floods.town')}</th>
                    <th className="p-3 font-medium">{t('floods.score')}</th>
                    <th className="p-3 text-right font-medium">{t('floods.rain')}</th>
                    <th className="p-3 font-medium">{t('floods.river')}</th>
                    <th className="p-3 text-right font-medium">{t('floods.elevation')}</th>
                  </tr>
                </thead>
                <tbody>
                  {ranked.map((r) => {
                    const f = r.flood!
                    const c = FLOOD_LEVELS[f.level].color
                    const near = nearestRiver(r.station, rivers)
                    return (
                      <tr key={r.station.id} className="border-b border-line last:border-0 hover:bg-sunken/60">
                        <td className="p-3"><Link to={`/station/${r.station.id}`} className="font-semibold hover:text-lagoon">{placeName(r.station, lang)}</Link></td>
                        <td className="p-2">
                          <span className="inline-flex min-w-28 items-center justify-between gap-2 rounded-md px-2 py-0.5 text-xs font-semibold" style={{ background: c, color: inkOn(c) }}>
                            {t(`floodLevel.${f.level}` as Key)} <span>{f.score}</span>
                          </span>
                        </td>
                        <td className="p-3 text-right">{fmt(Math.max(r.values.rain24 ?? 0, r.values.rainNext24 ?? 0))} mm</td>
                        <td className="p-3 text-xs">
                          {near ? <>{riverNames(near.point, lang).river} <span className="text-muted">· {near.reading ? riverLevelText(near.reading.level, t) : '…'}</span></> : <span className="text-muted">—</span>}
                        </td>
                        <td className="p-3 text-right">{fmt(r.elevation)} m</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-2 text-xs text-muted"><Freshness at={updatedAt} fetching={weather.isFetching} /></p>
        </section>

        <section>
          <h2 className="text-xl font-bold">{t('floods.riversTitle')}</h2>
          <div className="mt-3 space-y-1.5">
            {!rivers ? <Skeleton className="h-40" /> : high.length === 0 ? (
              <p className="rounded-lg bg-paddy-soft px-3 py-2.5 text-sm">{t('floods.riversNone')}</p>
            ) : high.map((r) => {
              const lv = RIVER_LEVELS[r.level]
              return (
                <Link key={r.point.id} to={`/rivers/${r.point.id}`} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface px-3 py-2 text-sm hover:border-lagoon">
                  <span className="min-w-0 font-semibold">{t('river.at', riverNames(r.point, lang))}</span>
                  <span className="shrink-0 rounded-md px-1.5 py-0.5 text-xs font-semibold" style={{ background: lv.color, color: inkOn(lv.color) }}>{fmt(r.ratio, 1)}× · {riverLevelText(r.level, t)}</span>
                </Link>
              )
            })}
            <Link to="/rivers" className="inline-block pt-1 text-sm font-medium text-lagoon hover:underline">{t('floods.allRivers')}</Link>
          </div>

          <h2 className="mt-8 text-xl font-bold">{t('floods.officialTitle')}</h2>
          <ul className="mt-3 space-y-1.5">
            {LINKS.map(([k, href]) => (
              <li key={k}><a href={href} className="flex items-start gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-sunken"><ExternalLink className="mt-0.5 size-3.5 shrink-0 text-lagoon" aria-hidden />{t(k)}</a></li>
            ))}
          </ul>
        </section>
      </div>

      <section>
        <h2 className="flex items-center gap-2 text-xl font-bold"><ShieldAlert className="size-5 text-rambutan" aria-hidden /> {t('floods.supportTitle')}</h2>
        <div className="mt-3 grid gap-4 md:grid-cols-3">
          {(['before', 'during', 'after'] as const).map((phase) => (
            <div key={phase} className="rounded-xl border border-line bg-surface p-4">
              <h3 className="mb-2 font-semibold">{t(`floods.${phase}`)}</h3>
              <ul className="list-disc space-y-1.5 pl-5 text-sm">
                {[1, 2, 3, 4, 5].map((i) => `floods.${phase}.${i}`).filter((k) => k in DICTS.en).map((k) => <li key={k}>{t(k as Key)}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold">{t('emergency.title')}</h2>
        <EmergencyContacts />
      </section>

      <section className="rounded-xl bg-sunken p-4 text-sm">
        <h2 className="mb-1 font-semibold">{t('floods.howTitle')}</h2>
        <p className="text-muted">{t('floods.how', { rain: FLOOD_WEIGHTS.rain, cap: FLOOD_RAIN_CAP, river: FLOOD_WEIGHTS.river, km: FLOOD_RIVER_KM, terrain: FLOOD_WEIGHTS.terrain, m: FLOOD_LEVELS.moderate.min, h: FLOOD_LEVELS.high.min, v: FLOOD_LEVELS['very-high'].min })}</p>
      </section>
    </div>
  )
}
