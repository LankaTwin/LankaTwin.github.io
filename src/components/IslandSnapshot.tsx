import { useState } from 'react'
import { ChevronLeft, ChevronRight, Satellite } from 'lucide-react'
import { islandSnapshotUrl } from '../lib/api'
import { addDays, dayMonth } from '../lib/time'
import { useSettings, yesterday } from '../stores/settings'
import { useT } from '../i18n/useT'

/** Yesterday's (or any day's) MODIS true-colour view of the whole island. */
export default function IslandSnapshot() {
  const [date, setDate] = useState(yesterday())
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading')
  const { setOverlay, setOverlayDate } = useSettings()
  const { t, locale } = useT()
  const max = yesterday()
  const go = (n: number) => { setState('loading'); setDate((d) => addDays(d, n)) }

  return (
    <section className="overflow-hidden rounded-xl border border-line bg-surface">
      <header className="flex items-center justify-between gap-2 px-3 pt-3 pb-2">
        <h2 className="flex items-center gap-1.5 text-[15px] font-semibold"><Satellite className="size-4 text-lagoon" aria-hidden /> {t('snap.title')}</h2>
        <div className="flex items-center gap-1 text-xs">
          <button onClick={() => go(-1)} className="rounded p-1 text-muted hover:bg-sunken hover:text-ink" aria-label={t('common.prevDay')}><ChevronLeft className="size-4" /></button>
          <span className="min-w-14 text-center font-medium">{dayMonth(date, locale)}</span>
          <button onClick={() => go(1)} disabled={date >= max} className="rounded p-1 text-muted hover:bg-sunken hover:text-ink disabled:opacity-30" aria-label={t('common.nextDay')}><ChevronRight className="size-4" /></button>
        </div>
      </header>
      <button
        type="button"
        onClick={() => { setOverlayDate(date); setOverlay('truecolor') }}
        className="group relative block h-80 w-full overflow-hidden bg-[#0b1e2a]"
        title={t('snap.useLayer')}
      >
        <img
          key={date}
          src={islandSnapshotUrl(date)}
          alt={t('snap.alt', { date: dayMonth(date, locale) })}
          loading="lazy"
          onLoad={() => setState('ok')}
          onError={() => setState('error')}
          className={`h-full w-full object-contain transition duration-500 group-hover:scale-[1.03] ${state === 'ok' ? 'opacity-100' : 'opacity-0'}`}
        />
        {state !== 'ok' && (
          <span className={`absolute inset-0 grid place-items-center text-xs text-white/70 ${state === 'loading' ? 'animate-pulse' : ''}`}>
            {t(state === 'loading' ? 'snap.loading' : 'snap.unavailable')}
          </span>
        )}
      </button>
      <p className="px-3 py-2 text-xs text-muted">
        {t('snap.caption')}
      </p>
    </section>
  )
}
