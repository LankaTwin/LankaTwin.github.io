import { useQuery } from '@tanstack/react-query'
import { Anchor, Gauge, History } from 'lucide-react'
import { Panel, Skeleton } from './ui'
import { fetchMarine, fetchModelSpread, fetchPastForecasts } from '../lib/api'
import { MODELS, modelOutlook, seaState, trackRecord, type Agreement } from '../lib/forecastQuality'
import { compass, fmt } from '../lib/metrics'
import type { Station } from '../lib/places'
import { colomboToday, dayMonth, dayName } from '../lib/time'
import type { Key } from '../i18n/core'
import { useT } from '../i18n/useT'

const HOUR = 3_600_000
const AGREE: Record<Agreement, string> = {
  high: 'bg-paddy-soft text-paddy',
  medium: 'bg-thambili-soft text-thambili',
  low: 'bg-rambutan-soft text-rambutan',
}

/** Six global models side by side: where they agree the forecast is firmer. */
export function ModelAgreement({ station }: { station: Station }) {
  const { t, locale } = useT()
  const q = useQuery({
    queryKey: ['models', station.id],
    queryFn: ({ signal }) => fetchModelSpread(station, MODELS.map((m) => m.id), signal),
    staleTime: HOUR, retry: 1,
  })
  const today = colomboToday()
  const days = q.data ? modelOutlook(q.data, today) : []
  // A missing comparison shouldn't put an error on the page; the forecast above still stands.
  if (q.isError || (q.data && !days.length)) return null
  return (
    <Panel title={<span className="flex items-center gap-1.5"><Gauge className="size-4 text-lagoon" aria-hidden />{t('fq.agreeTitle')}</span>}>
      <p className="mb-3 text-sm text-muted">{t('fq.agreeIntro', { n: MODELS.length })}</p>
      {!q.data ? <Skeleton className="h-40" /> : (
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[26rem] text-left text-sm">
            <thead className="text-xs text-muted">
              <tr>
                <th className="py-1 pr-3 font-medium">{t('fq.day')}</th>
                {/* Second, so it stays in view on a phone before the table scrolls. */}
                <th className="py-1 pr-3 font-medium">{t('fq.agreement')}</th>
                <th className="py-1 pr-3 font-medium">{t('fq.rainRange')}</th>
                <th className="py-1 pr-3 font-medium">{t('fq.wetModels')}</th>
                <th className="py-1 font-medium">{t('fq.tmaxRange')}</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {days.map((d) => (
                <tr key={d.date} className="border-t border-line">
                  <td className="whitespace-nowrap py-1.5 pr-3 font-medium">{d.date === today ? t('common.today') : dayName(d.date, locale)} <span className="font-normal text-muted">{dayMonth(d.date, locale)}</span></td>
                  <td className="py-1.5 pr-3"><span className={`whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-semibold ${AGREE[d.agreement]}`}>{t(`fq.agree.${d.agreement}` as Key)}</span></td>
                  <td className="whitespace-nowrap py-1.5 pr-3">{fmt(d.rainMin, 1)}–{fmt(d.rainMax, 1)} mm <span className="text-muted">({t('fq.typical', { mm: fmt(d.rainMedian, 1) })})</span></td>
                  <td className="whitespace-nowrap py-1.5 pr-3">{t('fq.ofModels', { wet: d.wet, n: d.models })}</td>
                  <td className="whitespace-nowrap py-1.5">{d.tMaxMin == null ? '—' : `${fmt(d.tMaxMin)}–${fmt(d.tMaxMax)}°`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-xs text-muted">{t('fq.agreeNote', { models: MODELS.map((m) => m.name).join(', ') })}</p>
    </Panel>
  )
}

/** How the forecasts made 1–3 days ahead for the past week turned out. */
export function TrackRecord({ station }: { station: Station }) {
  const { t } = useT()
  const q = useQuery({
    queryKey: ['track', station.id],
    queryFn: ({ signal }) => fetchPastForecasts(station, signal),
    staleTime: 3 * HOUR, retry: 1,
  })
  const scores = q.data ? trackRecord(q.data, colomboToday()) : []
  if (q.isError || (q.data && !scores.length)) return null
  return (
    <Panel title={<span className="flex items-center gap-1.5"><History className="size-4 text-lagoon" aria-hidden />{t('fq.trackTitle')}</span>}>
      <p className="mb-3 text-sm text-muted">{t('fq.trackIntro')}</p>
      {!q.data ? <Skeleton className="h-28" /> : (
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[22rem] text-left text-sm">
            <thead className="text-xs text-muted">
              <tr>
                <th className="py-1 pr-3 font-medium">{t('fq.madeAhead')}</th>
                <th className="py-1 pr-3 font-medium">{t('fq.wetDry')}</th>
                <th className="py-1 pr-3 font-medium">{t('fq.rainErr')}</th>
                <th className="py-1 font-medium">{t('fq.tempErr')}</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {scores.map((s) => (
                <tr key={s.lead} className="border-t border-line">
                  <td className="whitespace-nowrap py-1.5 pr-3 font-medium">{t(s.lead === 1 ? 'fq.lead1' : 'fq.leadN', { n: s.lead })}</td>
                  <td className="whitespace-nowrap py-1.5 pr-3">{t('fq.hits', { hits: s.wetHits, n: s.days })}</td>
                  <td className="whitespace-nowrap py-1.5 pr-3">{s.rainMae == null ? '—' : `± ${fmt(s.rainMae, 1)} mm`}</td>
                  <td className="whitespace-nowrap py-1.5">{s.tempMae == null ? '—' : `± ${fmt(s.tempMae, 1)}°`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-xs text-muted">{t('fq.trackNote')}</p>
    </Panel>
  )
}

/** Waves, swell and sea temperature off a coastal town. */
export function SeaConditions({ station }: { station: Station }) {
  const { t, locale } = useT()
  const q = useQuery({
    queryKey: ['marine', station.id],
    queryFn: ({ signal }) => fetchMarine(station, signal),
    staleTime: HOUR, retry: 1,
    enabled: station.zone === 'coast',
  })
  if (station.zone !== 'coast' || q.isError) return null
  const c = q.data?.current
  const num = (k: string) => (typeof c?.[k] === 'number' ? (c[k] as number) : null)
  const wave = num('wave_height')
  const state = seaState(wave)
  // The nearest model cell can be on land, which comes back empty.
  if (q.data && wave == null) return null
  const d = q.data?.daily
  const dTime = (d?.time ?? []) as string[]
  const today = colomboToday()
  const rough = state === 'rough' || state === 'veryRough' || state === 'high'
  return (
    <Panel title={<span className="flex items-center gap-1.5"><Anchor className="size-4 text-lagoon" aria-hidden />{t('sea.title')}</span>}>
      {!q.data ? <Skeleton className="h-28" /> : (
        <>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-3xl font-extrabold tracking-tight tabular-nums">{fmt(wave, 1)}<span className="ml-1 text-base font-medium text-muted">m</span></span>
            {state && <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${rough ? AGREE.low : state === 'moderate' ? AGREE.medium : AGREE.high}`}>{t(`sea.state.${state}` as Key)}</span>}
            <span className="text-sm text-muted">{t('sea.waves', { dir: compass(num('wave_direction')), s: fmt(num('wave_period')) })}</span>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
            <div><dt className="text-xs text-muted">{t('sea.swell')}</dt><dd className="font-semibold tabular-nums">{fmt(num('swell_wave_height'), 1)} m <span className="font-normal text-muted">{compass(num('swell_wave_direction'))} · {fmt(num('swell_wave_period'))} s</span></dd></div>
            <div><dt className="text-xs text-muted">{t('sea.windWaves')}</dt><dd className="font-semibold tabular-nums">{fmt(num('wind_wave_height'), 1)} m</dd></div>
            <div><dt className="text-xs text-muted">{t('sea.temp')}</dt><dd className="font-semibold tabular-nums">{fmt(num('sea_surface_temperature'), 1)}°</dd></div>
          </dl>
          <ul className="mt-3 flex flex-wrap gap-2 text-xs" aria-label={t('sea.outlook')}>
            {dTime.map((day, i) => {
              const h = (d?.wave_height_max as (number | null)[] | undefined)?.[i]
              const st = seaState(h)
              return (
                <li key={day} className="rounded-lg bg-sunken px-2.5 py-1.5">
                  <span className="font-semibold">{day === today ? t('common.today') : dayName(day, locale)}</span>{' '}
                  <span className="tabular-nums">{t('sea.upTo', { m: fmt(h, 1) })}</span>
                  {st && <span className="text-muted"> · {t(`sea.state.${st}` as Key)}</span>}
                </li>
              )
            })}
          </ul>
          {rough && <p className="mt-3 rounded-lg bg-rambutan-soft px-3 py-2 text-sm text-rambutan">{t('sea.roughNote')}</p>}
        </>
      )}
      <p className="mt-3 text-xs text-muted">{t('sea.note')}</p>
    </Panel>
  )
}
