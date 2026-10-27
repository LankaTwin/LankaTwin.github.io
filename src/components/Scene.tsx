import { useState, type ReactNode } from 'react'
import { cld, cldSrcSet, SCENES } from '../lib/cloudinary'
import { useT } from '../i18n/useT'
import Landscape, { type Sky } from './Landscape'

/**
 * A wide landscape image served from Cloudinary at the right size and format for the
 * screen, over a drawn illustration that shows while it loads or if it can't.
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
  return (
    <figure className={`relative overflow-hidden bg-sunken ${className}`}>
      <Landscape zone={zone} sky={sky ?? (id === 'flood' ? 'rain' : 'day')} className="absolute inset-0 h-full w-full" />
      {state !== 'error' && (
        <img
          src={cld(SCENES[id], 'c_fill,w_1280')}
          srcSet={cldSrcSet(SCENES[id])}
          sizes={sizes}
          alt={label ?? ""}
          loading="lazy"
          decoding="async"
          onLoad={() => setState('ok')}
          onError={() => setState('error')}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${state === 'ok' ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
      {shade && <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />}
      {children}
      {caption && state === 'ok' && <figcaption className="absolute right-2 bottom-1.5 text-[10px] text-white/75">{t('scene.ai')}</figcaption>}
    </figure>
  )
}
