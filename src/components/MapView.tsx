import { useEffect, useRef } from 'react'
import * as maplibregl from 'maplibre-gl'
type MLMap = maplibregl.Map
type Marker = maplibregl.Marker
// MapLibre 6 loads its worker as a separate module; let Vite fingerprint and ship it.
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
maplibregl.setWorkerUrl(workerUrl)
import { SL_BOUNDS } from '../lib/places'
import { colorFor, fmt, inkOn, METRICS, RIVER_LEVELS } from '../lib/metrics'
import { useSettings, type Overlay } from '../stores/settings'
import type { RiverReading, StationReading } from '../hooks/useLiveData'

const STYLES = {
  light: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
}

export interface OverlayDef {
  id: Exclude<Overlay, 'none'>
  label: string
  layer: string
  format: 'image/png' | 'image/jpeg'
  dated: boolean
  maxZoom: number
  note: string
}

export const OVERLAYS: OverlayDef[] = [
  { id: 'truecolor', label: 'Satellite (true colour)', layer: 'MODIS_Terra_CorrectedReflectance_TrueColor', format: 'image/jpeg', dated: true, maxZoom: 9, note: 'MODIS Terra daily mosaic, 250 m. Pick a date; today is usually incomplete.' },
  { id: 'ndvi', label: 'Vegetation (NDVI)', layer: 'MODIS_Terra_NDVI_8Day', format: 'image/png', dated: false, maxZoom: 9, note: 'Latest MODIS 8-day NDVI composite. Greener means denser, healthier vegetation.' },
  { id: 'imerg', label: 'Rain rate (IMERG)', layer: 'IMERG_Precipitation_Rate', format: 'image/png', dated: false, maxZoom: 6, note: 'GPM IMERG satellite precipitation estimate, latest 30-minute step.' },
  { id: 'lst', label: 'Land surface temp.', layer: 'MODIS_Terra_Land_Surface_Temp_Day', format: 'image/png', dated: true, maxZoom: 7, note: 'MODIS daytime land surface temperature. Clouds leave gaps.' },
]

function gibsUrl(def: OverlayDef, date: string) {
  const time = def.dated ? `&TIME=${date}` : ''
  return `https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS=${def.layer}&STYLES=&FORMAT=${encodeURIComponent(def.format)}&TRANSPARENT=TRUE&CRS=EPSG:3857&WIDTH=256&HEIGHT=256&BBOX={bbox-epsg-3857}${time}`
}

interface Props {
  readings?: StationReading[]
  rivers?: RiverReading[]
  selected?: string
  onSelect: (id: string, kind: 'station' | 'river') => void
  /** Fly here when it changes. */
  focus?: { lon: number; lat: number; zoom?: number }
  /** Show a "you are here" dot. */
  userLocation?: { lon: number; lat: number }
  className?: string
}

export default function MapView({ readings, rivers, selected, onSelect, focus, userLocation, className }: Props) {
  const box = useRef<HTMLDivElement>(null)
  const map = useRef<MLMap | null>(null)
  const stationMarkers = useRef(new Map<string, Marker>())
  const riverMarkers = useRef(new Map<string, Marker>())
  const userMarker = useRef<Marker | null>(null)
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect

  const { theme, metric, overlay, overlayOpacity, overlayDate, showRivers, showStations } = useSettings()

  // Create the map once.
  useEffect(() => {
    if (!box.current) return
    const m = new maplibregl.Map({
      container: box.current,
      style: STYLES[useSettings.getState().theme],
      bounds: SL_BOUNDS,
      fitBoundsOptions: { padding: 24 },
      maxBounds: [[76.5, 3.5], [85, 12.5]],
      minZoom: 5.5,
      maxZoom: 13,
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
    })
    m.touchZoomRotate.disableRotation()
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    m.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-right')
    map.current = m
    const ro = new ResizeObserver(() => m.resize())
    ro.observe(box.current)
    return () => {
      ro.disconnect()
      m.remove()
      map.current = null
      stationMarkers.current.clear()
      riverMarkers.current.clear()
      userMarker.current = null
    }
  }, [])

  // Basemap follows the theme; overlays are re-added after the style swaps.
  useEffect(() => {
    const m = map.current
    if (!m) return
    const wanted = STYLES[theme]
    const current = (m as unknown as { _lt_style?: string })._lt_style
    if (current && current !== wanted) m.setStyle(wanted)
    ;(m as unknown as { _lt_style?: string })._lt_style = wanted
  }, [theme])

  // Satellite overlay.
  useEffect(() => {
    const m = map.current
    if (!m) return
    const apply = () => {
      if (m.getLayer('lt-overlay')) m.removeLayer('lt-overlay')
      if (m.getSource('lt-overlay')) m.removeSource('lt-overlay')
      const def = OVERLAYS.find((o) => o.id === overlay)
      if (!def) return
      m.addSource('lt-overlay', {
        type: 'raster',
        tiles: [gibsUrl(def, overlayDate)],
        tileSize: 256,
        maxzoom: def.maxZoom,
        attribution: 'Imagery: NASA EOSDIS GIBS',
      })
      // Keep place labels on top of imagery.
      const firstSymbol = m.getStyle().layers?.find((l) => l.type === 'symbol')?.id
      m.addLayer({ id: 'lt-overlay', type: 'raster', source: 'lt-overlay', paint: { 'raster-opacity': overlayOpacity, 'raster-fade-duration': 200 } }, firstSymbol)
    }
    if (m.isStyleLoaded()) apply()
    m.on('style.load', apply)
    return () => { m.off('style.load', apply) }
  }, [overlay, overlayDate, theme]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const m = map.current
    if (m?.getLayer('lt-overlay')) m.setPaintProperty('lt-overlay', 'raster-opacity', overlayOpacity)
  }, [overlayOpacity])

  useEffect(() => {
    if (!focus || !map.current) return
    map.current.flyTo({ center: [focus.lon, focus.lat], zoom: focus.zoom ?? 9, essential: true, duration: 1200 })
  }, [focus])

  useEffect(() => {
    const m = map.current
    if (!m) return
    userMarker.current?.remove()
    userMarker.current = null
    if (!userLocation) return
    const el = document.createElement('div')
    el.className = 'lt-me'
    el.setAttribute('aria-label', 'Your location')
    el.title = 'You are here'
    userMarker.current = new maplibregl.Marker({ element: el }).setLngLat([userLocation.lon, userLocation.lat]).addTo(m)
  }, [userLocation])

  // Station value chips.
  useEffect(() => {
    const m = map.current
    if (!m) return
    const met = METRICS[metric]
    const seen = new Set<string>()
    if (showStations) {
      for (const r of readings ?? []) {
        const id = r.station.id
        seen.add(id)
        let mk = stationMarkers.current.get(id)
        if (!mk) {
          const el = document.createElement('button')
          el.type = 'button'
          el.className = 'lt-chip'
          el.addEventListener('click', (e) => { e.stopPropagation(); onSelectRef.current(id, 'station') })
          mk = new maplibregl.Marker({ element: el }).setLngLat([r.station.lon, r.station.lat]).addTo(m)
          stationMarkers.current.set(id, mk)
        }
        const el = mk.getElement()
        const v = r.values[metric]
        const bg = colorFor(met, v)
        el.style.background = bg
        el.style.color = inkOn(bg)
        el.dataset.active = String(selected === id)
        el.innerHTML = `${fmt(v, met.decimals)}${met.unit && met.unit !== '°' ? `<small>${met.unit}</small>` : met.unit}`
        el.setAttribute('aria-label', `${r.station.name}: ${met.label} ${fmt(v, met.decimals)} ${met.unit}`)
        el.title = r.station.name
      }
    }
    for (const [id, mk] of stationMarkers.current) if (!seen.has(id)) { mk.remove(); stationMarkers.current.delete(id) }
  }, [readings, metric, selected, showStations])

  // River chips.
  useEffect(() => {
    const m = map.current
    if (!m) return
    const seen = new Set<string>()
    if (showRivers) {
      for (const rv of rivers ?? []) {
        const id = rv.point.id
        seen.add(id)
        let mk = riverMarkers.current.get(id)
        if (!mk) {
          const el = document.createElement('button')
          el.type = 'button'
          el.className = 'lt-chip river'
          el.addEventListener('click', (e) => { e.stopPropagation(); onSelectRef.current(id, 'river') })
          mk = new maplibregl.Marker({ element: el, offset: [0, 0] }).setLngLat([rv.point.lon, rv.point.lat]).addTo(m)
          riverMarkers.current.set(id, mk)
        }
        const el = mk.getElement()
        const bg = RIVER_LEVELS[rv.level].color
        el.style.background = bg
        el.style.color = inkOn(bg)
        el.dataset.active = String(selected === id)
        // Compact square so rivers don't crowd the town readings; the value shows on hover/selection.
        el.innerHTML = selected === id ? `≈ ${fmt(rv.today)}<small>m³/s</small>` : '≈'
        el.setAttribute('aria-label', `${rv.point.river} at ${rv.point.near}: ${fmt(rv.today)} cubic metres per second, ${RIVER_LEVELS[rv.level].label}`)
        el.title = `${rv.point.river} at ${rv.point.near}`
      }
    }
    for (const [id, mk] of riverMarkers.current) if (!seen.has(id)) { mk.remove(); riverMarkers.current.delete(id) }
  }, [rivers, selected, showRivers])

  // MapLibre's own stylesheet sets position:relative on the map element (unlayered CSS beats
  // Tailwind's layered utilities), so positioning lives on a wrapper.
  return (
    <div className={className}>
      <div ref={box} className="h-full w-full" role="region" aria-label="Map of Sri Lanka with live readings" />
    </div>
  )
}
