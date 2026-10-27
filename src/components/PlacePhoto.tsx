import { useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchPlacePhoto } from '../lib/api'
import { districtName, placeName, type Station } from '../lib/places'
import type { Key } from '../i18n/core'
import { useT } from '../i18n/useT'
import Landscape, { type Sky } from './Landscape'

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
  const [failed, setFailed] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const p = q.data
  const showPhoto = p && !failed

  return (
    <figure className={`relative overflow-hidden bg-sunken ${className}`}>
      <Landscape zone={station.zone} sky={sky} className="absolute inset-0 h-full w-full" label={showPhoto ? undefined : t(`place.illustration.${station.zone}` as Key, { place: name })} />
      {showPhoto && (
        <img
          src={p.src}
          alt={t('place.photoAlt', { place: name, district: districtName(station.district, lang) })}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
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
