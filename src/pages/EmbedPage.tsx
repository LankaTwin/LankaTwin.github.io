import { useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import WeatherIcon from '../components/WeatherIcon'
import { Mark } from '../components/Logo'
import { useNowcast } from '../hooks/useLiveData'
import { colorFor, fmt, inkOn, METRICS, weatherText } from '../lib/metrics'
import { placeName, stationById } from '../lib/places'
import { tFor, type Lang } from '../i18n/core'
import { useSettings } from '../stores/settings'

/**
 * A small live card for one place, meant for an <iframe> on another site:
 *   <iframe src="https://lankatwin.github.io/embed/kandy" width="320" height="180"></iframe>
 * Add ?theme=dark or ?theme=light to force a theme, and ?lang=si or ?lang=ta for Sinhala or Tamil.
 */
export default function EmbedPage() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const st = stationById(id)
  const { readings } = useNowcast()
  const r = readings?.find((x) => x.station.id === id)
  const theme = params.get('theme')
  // ?lang= picks the language for this widget only; it never changes the visitor's saved choice.
  const stored = useSettings((s) => s.lang)
  const q = params.get('lang')
  const lang: Lang = q === 'si' || q === 'ta' || q === 'en' ? q : stored
  const t = tFor(lang)

  useEffect(() => {
    if (theme === 'dark' || theme === 'light') document.documentElement.classList.toggle('dark', theme === 'dark')
    document.body.style.background = 'transparent'
    document.documentElement.lang = lang
  }, [theme, lang])

  const appUrl = `${location.origin}/station/${id}`
  if (!st) return <p className="p-3 text-sm">{t('embed.unknown', { id: id ?? '' })}</p>
  const aqiColor = colorFor(METRICS.aqi, r?.values.aqi)

  return (
    <a href={appUrl} target="_blank" rel="noreferrer" className="flex h-dvh flex-col justify-between rounded-xl border border-line bg-surface p-3 text-ink hover:border-lagoon">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-base font-extrabold leading-tight">{placeName(st, lang)} <span className="text-xs font-medium text-muted">{lang === 'en' ? st.si : st.name}</span></div>
          <div className="truncate text-xs text-muted">{r ? weatherText(r.weatherCode, t) : t('common.loading')}</div>
        </div>
        <WeatherIcon code={r?.weatherCode} isDay={r?.isDay ?? true} className="size-11 shrink-0" />
      </div>
      <div className="flex items-end justify-between gap-2">
        <div className="text-4xl font-extrabold tracking-tight">{fmt(r?.values.temp)}°</div>
        <dl className="grid grid-cols-[auto_auto] gap-x-2 text-right text-xs">
          <dt className="text-muted">{t('embed.feels')}</dt><dd className="font-semibold">{fmt(r?.values.feels)}°</dd>
          <dt className="text-muted">{t('embed.rainNext')}</dt><dd className="font-semibold">{fmt(r?.values.rainNext24, 1)} mm</dd>
          <dt className="text-muted">{t('embed.air')}</dt>
          <dd><span className="rounded px-1 font-semibold" style={{ background: aqiColor, color: inkOn(aqiColor) }}>{fmt(r?.values.aqi)}</span></dd>
        </dl>
      </div>
      <div className="flex items-center gap-1.5 text-[10px] text-muted">
        <Mark className="size-3.5" /> {t('embed.footer')}
      </div>
    </a>
  )
}
