import { useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchPlacePhoto } from '../lib/api'
import { districtName, placeName, type Station } from '../lib/places'
import type { Key } from '../i18n/core'
import { useT } from '../i18n/useT'
import type { Sky } from './Landscape'
import Scene from './Scene'
import { cldFetch, cldFetchSrcSet } from '../lib/cloudinary'

/**
 * A photo of the place from its Wikipedia article, credited to its author. Falls
 * back to an illustration of the local landscape when offline or unavailable.
 */
export default function PlacePhoto({ station, sky, className = '', children }: { station: Station; sky?: Sky; className?: string; children?: ReactNode }) {
  const q = useQuery({
    queryKey: ['photo', station.wiki],
    queryFn: ({ signal }) => fetchPlacePhoto(station.wiki, signal),
    staleTime: 7 * 86400_000,
    gcTime: 7 * 86400_000,
    retry: 1,
  })
  const { t, lang } = useT()
  const name = placeName(station, lang)
  // Try Cloudinary first, then the Wikimedia image itself, then give up and keep the scene.
  const [via, setVia] = useState<'cdn' | 'direct' | 'failed'>('cdn')
  const [loaded, setLoaded] = useState(false)
  const p = q.data
  const showPhoto = p && via !== 'failed'

  return (
    <figure className={`relative overflow-hidden bg-sunken ${className}`}>
      {/* Cloudinary scene of the local landscape; the town photo, when there is one, covers it. */}
      <Scene id={station.zone} sky={sky} shade={false} caption={!showPhoto || !loaded} className="absolute inset-0 h-full w-full" label={showPhoto && loaded ? undefined : t(`place.landscape.${station.zone}` as Key, { place: name })} />
      {showPhoto && via === 'cdn' && !loaded && (
        <img src={cldFetch(p.original, 'c_limit,w_48,e_blur:300,q_30')} alt="" aria-hidden decoding="async" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.display = 'none' }} className="absolute inset-0 h-full w-full scale-110 object-cover blur-md" />
      )}
      {showPhoto && (
        <img
          src={via === 'cdn' ? cldFetch(p.original, 'c_limit,w_1280') : p.src}
          srcSet={via === 'cdn' ? cldFetchSrcSet(p.original) : undefined}
          sizes="(min-width: 1152px) 1120px, 100vw"
          alt={t('place.photoAlt', { place: name, district: districtName(station.district, lang) })}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => setLoaded(true)}
          onError={() => setVia((v) => (v === 'cdn' ? 'direct' : 'failed'))}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
      {children}
      {showPhoto && loaded && (
        <figcaption className="absolute right-2 bottom-1.5 max-w-[70%] truncate text-right text-[10px] text-white/80">
          <a href={p.fileUrl ?? p.pageUrl} className="hover:underline" target="_blank" rel="noreferrer">
            {t('place.photoCredit')}{p.artist ? `: ${p.artist}` : ''}{p.license ? ` · ${p.license}` : ''} · Wikimedia
          </a>
        </figcaption>
      )}
    </figure>
  )
}
