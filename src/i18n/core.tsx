import { Fragment, type ReactNode } from 'react'
import en, { type Key } from './en'
import si from './si'
import ta from './ta'

export type Lang = 'en' | 'si' | 'ta'
export type Vars = Record<string, string | number>
export type T = (key: Key, vars?: Vars) => string

export const LANGS: { id: Lang; label: string; short: string; locale: string }[] = [
  { id: 'en', label: 'English', short: 'EN', locale: 'en-LK' },
  { id: 'si', label: 'සිංහල', short: 'සිං', locale: 'si-LK' },
  { id: 'ta', label: 'தமிழ்', short: 'த', locale: 'ta-LK' },
]

export const DICTS: Record<Lang, Record<Key, string>> = { en, si, ta }

const fill = (s: string, vars?: Vars) => (vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : s)

export function tFor(lang: Lang): T {
  const d = DICTS[lang] ?? en
  return (key, vars) => fill(d[key] ?? en[key] ?? key, vars)
}

export const localeOf = (lang: Lang) => LANGS.find((l) => l.id === lang)?.locale ?? 'en-LK'

export function detectLang(): Lang {
  const n = typeof navigator === 'undefined' ? '' : (navigator.languages?.[0] ?? navigator.language ?? '')
  return n.startsWith('si') ? 'si' : n.startsWith('ta') ? 'ta' : 'en'
}

/**
 * Fill a translated string whose placeholders are React nodes, such as links:
 *   rich(t('signals.intro'), { dom: <a href="…">{t('common.dom')}</a> })
 */
export function rich(template: string, nodes: Record<string, ReactNode>): ReactNode {
  const parts = template.split(/\{(\w+)\}/g)
  return parts.map((p, i) => (i % 2 ? <Fragment key={i}>{p in nodes ? nodes[p] : `{${p}}`}</Fragment> : p))
}

export type { Key }
