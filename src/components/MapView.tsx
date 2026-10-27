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
import { useT } from '../i18n/useT'
import { placeName, riverNames } from '../lib/places'
import { metricText, riverLevelText } from '../lib/metrics'
import { FLOOD_LEVELS } from '../lib/flood'
import type { Key } from '../i18n/core'
import type { Feature, FeatureCollection } from 'geojson'
import { GAUGE_LEVELS, type GaugeStation } from '../lib/gauges'
import { useGaugeGeo } from '../hooks/useGauges'

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
  // LANCE MODIS near-real-time Global Flood Product: 250 m, water outside its usual extent over 3 days.
  { id: 'flood', label: 'Flood water (MODIS, 3-day)', layer: 'MODIS_Combined_Flood_3-Day', format: 'image/png', dated: true, maxZoom: 9, note: 'NASA near-real-time flood map.' },
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
  onSelect: (id: string, kind: 'station' | 'river' | 'gauge') => void
  /** Irrigation Department gauges. */
  gauges?: GaugeStation[]
  /** Force layers on regardless of the saved map settings (the gauges screen always shows them). */
  force?: { gauges?: boolean; basins?: boolean; rivers?: boolean }
  /** Fly here when it changes. */
  focus?: { lon: number; lat: number; zoom?: number }
  /** Show a "you are here" dot. */
  userLocation?: { lon: number; lat: number }
  /** Tap on the map away from any chip. */
  onPick?: (lat: number, lon: number) => void
  /** Show a pin at the picked spot. */
  picked?: { lon: number; lat: number }
  className?: string
}

export default function MapView({ readings, rivers, gauges, force, selected, onSelect, focus, userLocation, onPick, picked, className }: Props) {
  const box = useRef<HTMLDivElement>(null)
  const map = useRef<MLMap | null>(null)
  const stationMarkers = useRef(new Map<string, Marker>())
  const riverMarkers = useRef(new Map<string, Marker>())
  const gaugeMarkers = useRef(new Map<string, Marker>())
  const userMarker = useRef<Marker | null>(null)
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect
  const onPickRef = useRef(onPick)
  const focusRef = useRef(focus)
  focusRef.current = focus
  onPickRef.current = onPick
  const pickMarker = useRef<Marker | null>(null)
  // True once the style is parsed and layers can be added. Not map.isStyleLoaded(): that stays
  // false while any tile is still loading, which would silently drop layer updates.
  const styleReady = useRef(false)

  const { theme, metric, overlay, overlayOpacity, overlayDate, showRivers, showStations, showFlood, showGauges: savedGauges, showBasins: savedBasins, showFloodAreas } = useSettings()
  const showGauges = force?.gauges ?? savedGauges
  const showBasins = force?.basins ?? savedBasins
  const showRiverLines = force?.rivers ?? savedBasins
  const { t, lang } = useT()
  const basinsGeo = useGaugeGeo('basins', showBasins)
  const riversGeo = useGaugeGeo('rivers', showRiverLines)
  const floodGeo = useGaugeGeo('flood', showFloodAreas)

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
      // Control tooltips in the interface language; Dashboard remounts the map when it changes.
      locale: {
        'NavigationControl.ZoomIn': t('map.zoomIn'),
        'NavigationControl.ZoomOut': t('map.zoomOut'),
        'AttributionControl.ToggleAttribution': t('map.attribution'),
        'Map.Title': t('map.title'),
      },
    })
    m.touchZoomRotate.disableRotation()
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    // Under the zoom buttons: the bottom edge belongs to the legend and the variable picker.
    m.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'top-right')
    // Chips stop their own clicks, so a map click is always a tap on open ground.
    m.on('click', (e) => onPickRef.current?.(e.lngLat.lat, e.lngLat.lng))
    m.on('style.load', () => { styleReady.current = true })
    // MapLibre opens the compact credits expanded; on phones that box covers the variable
    // picker, so start it folded behind its (i) button there.
    m.once('load', () => {
      if (box.current && box.current.clientWidth < 640) box.current.querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show')
    })
    map.current = m
    // Until someone pans or zooms, keep the whole island in view as the panel changes size
    // (the gauges page grows its map once data arrives).
    let moved = false
    m.on('movestart', (e) => { if ((e as { originalEvent?: Event }).originalEvent) moved = true })
    const ro = new ResizeObserver(() => {
      m.resize()
      if (!moved && !focusRef.current) m.fitBounds(SL_BOUNDS, { padding: 24, animate: false })
    })
    ro.observe(box.current)
    return () => {
      ro.disconnect()
      m.remove()
      map.current = null
      styleReady.current = false
      stationMarkers.current.clear()
      riverMarkers.current.clear()
      gaugeMarkers.current.clear()
      userMarker.current = null
      pickMarker.current = null
    }
  }, [])

  // Basemap follows the theme; overlays are re-added after the style swaps.
  useEffect(() => {
    const m = map.current
    if (!m) return
    const wanted = STYLES[theme]
    const current = (m as unknown as { _lt_style?: string })._lt_style
    if (current && current !== wanted) { styleReady.current = false; m.setStyle(wanted) }
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
    if (styleReady.current) apply()
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
    el.setAttribute('aria-label', t('dash.youAreHere'))
    el.title = t('dash.youAreHere')
    userMarker.current = new maplibregl.Marker({ element: el }).setLngLat([userLocation.lon, userLocation.lat]).addTo(m)
  }, [userLocation]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const m = map.current
    if (!m) return
    pickMarker.current?.remove()
    pickMarker.current = null
    if (!picked) return
    const el = document.createElement('div')
    el.className = 'lt-pin'
    el.setAttribute('aria-label', t('spot.marker'))
    pickMarker.current = new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([picked.lon, picked.lat]).addTo(m)
  }, [picked]) // eslint-disable-line react-hooks/exhaustive-deps

  // Flood risk overlay: soft circles at towns (by flood score) and river points (by rise), under the chips.
  useEffect(() => {
    const m = map.current
    if (!m) return
    const features: Feature[] = []
    if (showFlood) {
      for (const r of readings ?? []) {
        if (!r.flood) continue
        features.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [r.station.lon, r.station.lat] }, properties: { v: r.flood.score, c: FLOOD_LEVELS[r.flood.level].color } })
      }
      for (const rv of rivers ?? []) {
        const v = Math.min(100, Math.max(0, ((rv.ratio ?? 1) - 1) * 25))
        features.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [rv.point.lon, rv.point.lat] }, properties: { v, c: RIVER_LEVELS[rv.level].color } })
      }
    }
    const data: FeatureCollection = { type: 'FeatureCollection', features }
    const apply = () => {
      const src = m.getSource('lt-flood') as maplibregl.GeoJSONSource | undefined
      if (src) { src.setData(data); return }
      m.addSource('lt-flood', { type: 'geojson', data })
      const firstSymbol = m.getStyle().layers?.find((l) => l.type === 'symbol')?.id
      m.addLayer({
        id: 'lt-flood', type: 'circle', source: 'lt-flood',
        paint: {
          'circle-color': ['get', 'c'],
          'circle-opacity': ['interpolate', ['linear'], ['get', 'v'], 0, 0.12, 100, 0.5],
          'circle-blur': 0.6,
          // Grows with the score and with zoom, so the island reads as a risk surface.
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, ['+', 10, ['*', ['get', 'v'], 0.35]], 10, ['+', 40, ['*', ['get', 'v'], 1.6]]],
        },
      }, firstSymbol)
    }
    if (styleReady.current) apply()
    m.on('style.load', apply)
    return () => { m.off('style.load', apply) }
  }, [readings, rivers, showFlood, theme])

  // Irrigation Department vectors: mapped flood extents, basin outlines and river lines, under the chips.
  useEffect(() => {
    const m = map.current
    if (!m) return
    const empty: FeatureCollection = { type: 'FeatureCollection', features: [] }
    const layers: [string, FeatureCollection | undefined, boolean][] = [
      ['lt-floodareas', floodGeo.data, showFloodAreas],
      ['lt-basins', basinsGeo.data, showBasins],
      ['lt-riverlines', riversGeo.data, showRiverLines],
    ]
    const apply = () => {
      const firstSymbol = m.getStyle().layers?.find((l) => l.type === 'symbol')?.id
      for (const [id, fc, on] of layers) {
        const data = on && fc ? fc : empty
        const src = m.getSource(id) as maplibregl.GeoJSONSource | undefined
        if (src) { src.setData(data); continue }
        m.addSource(id, { type: 'geojson', data, attribution: 'Irrigation Department, Sri Lanka' })
        if (id === 'lt-floodareas') {
          m.addLayer({ id, type: 'fill', source: id, paint: { 'fill-color': '#1f78d1', 'fill-opacity': 0.45, 'fill-outline-color': '#0b4f94' } }, firstSymbol)
        } else if (id === 'lt-basins') {
          m.addLayer({ id: `${id}-fill`, type: 'fill', source: id, paint: { 'fill-color': '#0e7c86', 'fill-opacity': 0.04 } }, firstSymbol)
          m.addLayer({ id, type: 'line', source: id, paint: { 'line-color': '#0e7c86', 'line-width': 1, 'line-opacity': 0.7 } }, firstSymbol)
        } else {
          m.addLayer({ id, type: 'line', source: id, paint: { 'line-color': '#2f7fe0', 'line-width': ['interpolate', ['linear'], ['zoom'], 6, 0.6, 11, 2], 'line-opacity': 0.8 } }, firstSymbol)
        }
      }
    }
    if (styleReady.current) apply()
    m.on('style.load', apply)
    return () => { m.off('style.load', apply) }
  }, [floodGeo.data, basinsGeo.data, riversGeo.data, showFloodAreas, showBasins, showRiverLines, theme])

  // Gauge markers: a dot in the department's status colour; the selected one shows its level.
  useEffect(() => {
    const m = map.current
    if (!m) return
    const seen = new Set<string>()
    if (showGauges) {
      for (const g of gauges ?? []) {
        if (g.lat == null || g.lon == null) continue
        const id = g.id
        seen.add(id)
        let mk = gaugeMarkers.current.get(id)
        if (!mk) {
          const el = document.createElement('button')
          el.type = 'button'
          el.className = 'lt-chip gauge'
          el.addEventListener('click', (e) => { e.stopPropagation(); onSelectRef.current(id, 'gauge') })
          mk = new maplibregl.Marker({ element: el }).setLngLat([g.lon, g.lat]).addTo(m)
          gaugeMarkers.current.set(id, mk)
        }
        const el = mk.getElement()
        const bg = g.stale ? '#8a9399' : GAUGE_LEVELS[g.level].color
        el.style.background = bg
        el.style.color = inkOn(bg)
        el.dataset.active = String(selected === id)
        el.dataset.level = g.level
        const v = g.latest?.level
        el.innerHTML = selected === id && v != null ? `${fmt(v, 2)}<small>${g.unit}</small>` : ''
        const label = `${t('gauge.marker', { name: g.name })}: ${v != null ? `${fmt(v, 2)} ${g.unit}, ` : ''}${t(g.stale ? 'gauge.stale' : (`gaugeLevel.${g.level}` as Key))}`
        el.setAttribute('aria-label', label)
        el.title = label
      }
    }
    for (const [id, mk] of gaugeMarkers.current) if (!seen.has(id)) { mk.remove(); gaugeMarkers.current.delete(id) }
  }, [gauges, selected, showGauges, lang]) // eslint-disable-line react-hooks/exhaustive-deps

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
          // Sits just above the town so the basemap's own name label stays readable below it.
          mk = new maplibregl.Marker({ element: el, anchor: 'bottom', offset: [0, -5] }).setLngLat([r.station.lon, r.station.lat]).addTo(m)
          stationMarkers.current.set(id, mk)
        }
        const el = mk.getElement()
        const v = r.values[metric]
        const bg = colorFor(met, v)
        el.style.background = bg
        el.style.color = inkOn(bg)
        el.dataset.active = String(selected === id)
        el.innerHTML = `${fmt(v, met.decimals)}${met.unit && met.unit !== '°' ? `<small>${met.unit}</small>` : met.unit}`
        const name = placeName(r.station, lang)
        el.setAttribute('aria-label', `${name}: ${metricText(metric, t).label} ${fmt(v, met.decimals)} ${met.unit}`)
        el.title = name
      }
    }
    for (const [id, mk] of stationMarkers.current) if (!seen.has(id)) { mk.remove(); stationMarkers.current.delete(id) }
  }, [readings, metric, selected, showStations, lang]) // eslint-disable-line react-hooks/exhaustive-deps

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
        const title = t('river.at', riverNames(rv.point, lang))
        el.setAttribute('aria-label', `${title}: ${fmt(rv.today)} m³/s, ${riverLevelText(rv.level, t)}`)
        el.title = title
      }
    }
    for (const [id, mk] of riverMarkers.current) if (!seen.has(id)) { mk.remove(); riverMarkers.current.delete(id) }
  }, [rivers, selected, showRivers, lang]) // eslint-disable-line react-hooks/exhaustive-deps

  // MapLibre's own stylesheet sets position:relative on the map element (unlayered CSS beats
  // Tailwind's layered utilities), so positioning lives on a wrapper.
  return (
    <div className={className}>
      <div ref={box} className="h-full w-full" role="region" aria-label={t('dash.mapRegion')} />
    </div>
  )
}
