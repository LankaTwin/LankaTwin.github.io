import { Phone } from 'lucide-react'
import type { Key } from '../i18n/core'
import { useT } from '../i18n/useT'

// National numbers, free from any phone in Sri Lanka.
export const EMERGENCY = ['117', '119', '110', '1990', '1919']

export default function EmergencyContacts() {
  const { t } = useT()
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {EMERGENCY.map((n) => (
        <li key={n}>
          <a href={`tel:${n}`} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3 hover:border-rambutan">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-rambutan-soft text-rambutan"><Phone className="size-4" aria-hidden /></span>
            <span className="min-w-0">
              <span className="block text-xl font-extrabold leading-tight">{n}</span>
              <span className="block text-sm font-semibold">{t(`emergency.${n}.who` as Key)}</span>
              <span className="block text-xs text-muted">{t(`emergency.${n}.what` as Key)}</span>
            </span>
          </a>
        </li>
      ))}
    </ul>
  )
}
