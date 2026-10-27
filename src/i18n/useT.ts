import { useMemo } from 'react'
import { useSettings } from '../stores/settings'
import { localeOf, tFor, type Lang, type T } from './core'

export interface I18n { t: T; lang: Lang; locale: string }

export function useT(): I18n {
  const lang = useSettings((s) => s.lang)
  return useMemo(() => ({ t: tFor(lang), lang, locale: localeOf(lang) }), [lang])
}

/** For code outside React components (chart options, notifications). */
export const currentI18n = (): I18n => {
  const lang = useSettings.getState().lang
  return { t: tFor(lang), lang, locale: localeOf(lang) }
}
