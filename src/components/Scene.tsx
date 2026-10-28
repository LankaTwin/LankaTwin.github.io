import { useState, type ReactNode } from 'react'
import { SCENES, sceneSrc, sceneSrcSet } from '../lib/scenes'
import { useT } from '../i18n/useT'
import Landscape, { type Sky } from './Landscape'

/**
 * A real photo of one of the island's landscapes (Wikimedia Commons, credited to its author),
 * served as small WebP files sized for the screen. A tiny inlined preview shows at once, over
 * a drawn illustration that stays if the photo can't load (offline, blocked).
 */
export default function Scene({ id, sky, className = '', sizes = '(min-width: 1152px) 1120px, 100vw', children, caption = true, shade = true, label }: {
  id: keyof typeof SCENES
  sky?: Sky
  className?: string
  sizes?: string
  children?: ReactNode
  caption?: boolean
  /** Darken the bottom for text laid over the image. */
  shade?: boolean
  /** Accessible description; decorative when omitted. */
  label?: string
}) {
  const { t } = useT()
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading')
  const zone = id === 'flood' ? 'plains' : id
  const photo = SCENES[id]
  return (
    <figure className={`relative overflow-hidden bg-sunken ${className}`}>
      <Landscape zone={zone} sky={sky ?? (id === 'flood' ? 'rain' : 'day')} className="absolute inset-0 h-full w-full" />
      {state !== 'error' && (
        <img src={photo.lqip} alt="" aria-hidden className={`absolute inset-0 h-full w-full scale-110 object-cover blur-lg transition-opacity duration-500 ${state === 'ok' ? 'opacity-0' : 'opacity-100'}`} />
      )}
      {state !== 'error' && (
        <img
          src={sceneSrc(id, 960)}
          srcSet={sceneSrcSet(id)}
          sizes={sizes}
          alt={label ?? ''}
          loading="lazy"
          decoding="async"
          onLoad={() => setState('ok')}
          onError={() => setState('error')}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${state === 'ok' ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
      {shade && <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />}
      {children}
      {caption && state === 'ok' && (
        <figcaption className="absolute right-2 bottom-1.5 max-w-[70%] truncate text-right text-[10px] text-white/80">
          <a href={photo.page} className="hover:underline" target="_blank" rel="noreferrer" title={photo.title}>
            {t('place.photoCredit')}: {photo.author} · {photo.license} · Wikimedia Commons
          </a>
        </figcaption>
      )}
    </figure>
  )
}
