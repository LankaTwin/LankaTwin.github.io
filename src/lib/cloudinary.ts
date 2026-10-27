// Images hosted on Cloudinary (account dkj22lm1g). Every URL asks for f_auto,q_auto so
// each browser gets AVIF/WebP at a sensible quality, resized on Cloudinary's CDN.
import type { Zone } from './places'

export const CLOUD = 'dkj22lm1g'
const BASE = `https://res.cloudinary.com/${CLOUD}/image/upload`

/** Delivery URL for an uploaded asset, e.g. cld('lankatwin/scenes/coast', 'w_1280'). */
export function cld(publicId: string, transform = '') {
  const t = ['f_auto', 'q_auto', transform].filter(Boolean).join(',')
  return `${BASE}/${t}/${publicId}`
}

/** srcset at a few widths, so phones download a fraction of the desktop image. */
export function cldSrcSet(publicId: string, widths = [480, 800, 1280, 1920], extra = 'c_fill') {
  return widths.map((w) => `${cld(publicId, `${extra},w_${w}`)} ${w}w`).join(', ')
}

/**
 * AI-generated scenes of the island's broad landscapes (not photos of a particular town),
 * shown where a real place photo is unavailable and on the About and Floods pages.
 */
export const SCENES: Record<Zone | 'flood', string> = {
  coast: 'lankatwin/scenes/coast',
  hills: 'lankatwin/scenes/hills',
  plains: 'lankatwin/scenes/plains',
  flood: 'lankatwin/scenes/flood',
}

/**
 * A remote image (here, Wikimedia Commons originals) delivered through Cloudinary's
 * fetch type: resized, compressed and cached on its CDN. Needs "Fetched URL" allowed in
 * the account's security settings; callers fall back to the original URL if it fails.
 */
export function cldFetch(url: string, transform = '') {
  const t = ['f_auto', 'q_auto', transform].filter(Boolean).join(',')
  return `https://res.cloudinary.com/${CLOUD}/image/fetch/${t}/${url}`
}

export function cldFetchSrcSet(url: string, widths = [480, 800, 1280, 1920]) {
  return widths.map((w) => `${cldFetch(url, `c_limit,w_${w}`)} ${w}w`).join(', ')
}
