import type { Key } from '../i18n/core'
import { useT } from '../i18n/useT'
import { seasonFor } from '../lib/season'
import { colomboToday } from '../lib/time'

/** Which of Sri Lanka's four monsoon seasons it is, and where it usually rains. */
export default function SeasonCard({ className = 'p-3' }: { className?: string }) {
  const { t } = useT()
  const s = seasonFor(colomboToday())
  const k = (f: string) => t(`season.${s.id}.${f}` as Key)
  return (
    <section className={`rounded-xl border border-line bg-surface ${className}`}>
      <div className="text-xs text-muted">{t('season.now', { months: k('months') })}</div>
      <h2 className="text-[15px] font-semibold">{k('name')}</h2>
      <p className="mt-1 text-sm text-muted">{k('summary')}</p>
      <p className="mt-1 text-xs"><span className="text-muted">{t('season.wettest')}</span> {k('wetter')}</p>
    </section>
  )
}
