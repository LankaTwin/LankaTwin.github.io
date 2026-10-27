import { useEffect, useId, useRef, useState } from 'react'
import { Check, Copy, Link2, Mail, MessageSquare, MoreHorizontal, Share2 } from 'lucide-react'
import { BRAND_ICONS } from '../brand/social'
import { useT } from '../i18n/useT'

export interface ShareData {
  title: string
  /** One line about what the page shows now; sent with the link. */
  text?: string
  /** App path, e.g. /station/kandy. */
  path: string
}

type Net = keyof typeof BRAND_ICONS
const NETS: { id: Net; name: string; color: string; href: (url: string, text: string, title: string) => string }[] = [
  { id: 'whatsapp', name: 'WhatsApp', color: '#25D366', href: (u, t) => `https://wa.me/?text=${enc(`${t}\n${u}`)}` },
  { id: 'facebook', name: 'Facebook', color: '#0866FF', href: (u) => `https://www.facebook.com/sharer/sharer.php?u=${enc(u)}` },
  { id: 'x', name: 'X', color: '#000000', href: (u, t) => `https://x.com/intent/post?text=${enc(t)}&url=${enc(u)}` },
  { id: 'telegram', name: 'Telegram', color: '#26A5E4', href: (u, t) => `https://t.me/share/url?url=${enc(u)}&text=${enc(t)}` },
  { id: 'viber', name: 'Viber', color: '#7360F2', href: (u, t) => `viber://forward?text=${enc(`${t}\n${u}`)}` },
  { id: 'linkedin', name: 'LinkedIn', color: '#0A66C2', href: (u) => `https://www.linkedin.com/sharing/share-offsite/?url=${enc(u)}` },
]
const enc = encodeURIComponent

export const shareUrl = (path: string) => `${location.origin}${path}`

/** Phones and tablets get the system share sheet; desktops get the menu (which can still open the sheet). */
const preferNative = () => typeof navigator !== 'undefined' && !!navigator.share && matchMedia('(pointer: coarse)').matches

async function copy(text: string) {
  try { await navigator.clipboard.writeText(text); return true } catch { return false }
}

/**
 * Share a page: WhatsApp, Facebook, X, Telegram, Viber, LinkedIn, email, SMS, copy link or
 * copy the summary with the link. Links carry each page's own preview image and title.
 */
export function ShareButton({ title, text, path, className = '', compact = false }: ShareData & { className?: string; compact?: boolean }) {
  const { t } = useT()
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState<'link' | 'text' | null>(null)
  // Open towards whichever side has room for the 272 px menu.
  const [side, setSide] = useState<'left' | 'right'>('right')
  const box = useRef<HTMLDivElement>(null)
  const menuId = useId()
  const url = shareUrl(path)
  const body = text ? `${text} — ${title}` : title

  useEffect(() => {
    if (!open) return
    const off = (e: Event) => { if (!box.current?.contains(e.target as Node)) setOpen(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', off)
    document.addEventListener('keydown', esc)
    // Focus the first option for keyboard users.
    box.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
    return () => { document.removeEventListener('pointerdown', off); document.removeEventListener('keydown', esc) }
  }, [open])

  const native = async () => {
    try { await navigator.share({ title, text: body, url }); setOpen(false) } catch (e) { if ((e as Error).name !== 'AbortError') setOpen(true) }
  }
  const flash = (k: 'link' | 'text') => { setDone(k); setTimeout(() => setDone(null), 2000) }
  const onCopy = async (k: 'link' | 'text') => {
    const ok = await copy(k === 'link' ? url : `${body}\n${url}`)
    if (ok) flash(k)
    else prompt(t('share.prompt'), url)
  }
  const toggle = () => {
    if (preferNative()) return native()
    const r = box.current?.getBoundingClientRect()
    if (r) setSide(r.right < 284 ? 'left' : 'right')
    setOpen((o) => !o)
  }

  // Arrow keys move through the menu.
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const items = [...(box.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])]
    const i = items.indexOf(document.activeElement as HTMLElement)
    items[(i + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length]?.focus()
  }

  const item = 'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm hover:bg-sunken focus:bg-sunken focus:outline-none'
  return (
    <div ref={box} className={`relative ${className}`}>
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={compact ? t('share.share') : undefined}
        title={t('share.menuTitle')}
        className={compact
          ? 'rounded-md p-1.5 text-muted hover:bg-sunken hover:text-ink'
          : 'flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink hover:bg-sunken'}
      >
        {done ? <Check className="size-4 text-paddy" aria-hidden /> : <Share2 className="size-4" aria-hidden />}
        {!compact && (done === 'link' ? t('share.copied') : done === 'text' ? t('share.copiedText') : t('share.share'))}
      </button>
      {open && (
        <div id={menuId} role="menu" aria-label={t('share.menuTitle')} onKeyDown={onKey}
          className={`absolute ${side === 'left' ? 'left-0' : 'right-0'} z-50 mt-1.5 w-[min(272px,calc(100vw-1.5rem))] rounded-xl border border-line bg-surface p-1.5 shadow-xl`}>
          <p className="truncate px-2.5 pt-1 pb-1.5 text-xs text-muted">{title}</p>
          <div className="grid grid-cols-2 gap-0.5">
            {NETS.map((n) => (
              <a key={n.id} role="menuitem" href={n.href(url, body, title)} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)} className={item}>
                <svg viewBox="0 0 24 24" className="size-4 shrink-0" fill={n.color} aria-hidden><path d={BRAND_ICONS[n.id]} /></svg>
                {n.name}
              </a>
            ))}
          </div>
          <div className="my-1 border-t border-line" />
          <a role="menuitem" href={`mailto:?subject=${enc(title)}&body=${enc(`${body}\n\n${url}`)}`} onClick={() => setOpen(false)} className={item}><Mail className="size-4 text-muted" aria-hidden /> {t('share.email')}</a>
          <a role="menuitem" href={`sms:?&body=${enc(`${body} ${url}`)}`} onClick={() => setOpen(false)} className={item}><MessageSquare className="size-4 text-muted" aria-hidden /> {t('share.sms')}</a>
          <button role="menuitem" type="button" onClick={() => onCopy('link')} className={item}>
            {done === 'link' ? <Check className="size-4 text-paddy" aria-hidden /> : <Link2 className="size-4 text-muted" aria-hidden />} {done === 'link' ? t('share.copied') : t('share.copyLink')}
          </button>
          {text && (
            <button role="menuitem" type="button" onClick={() => onCopy('text')} className={item}>
              {done === 'text' ? <Check className="size-4 text-paddy" aria-hidden /> : <Copy className="size-4 text-muted" aria-hidden />} {done === 'text' ? t('share.copiedText') : t('share.copyText')}
            </button>
          )}
          {typeof navigator !== 'undefined' && !!navigator.share && (
            <button role="menuitem" type="button" onClick={native} className={item}><MoreHorizontal className="size-4 text-muted" aria-hidden /> {t('share.more')}</button>
          )}
          <p className="truncate px-2.5 pt-1.5 pb-0.5 text-[11px] text-muted" title={url}>{url.replace(/^https?:\/\//, '')}</p>
        </div>
      )}
    </div>
  )
}
