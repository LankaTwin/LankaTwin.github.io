import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { buildGauges, fetchFloodAreas, fetchGaugeReadings, fetchGaugeStations, fetchGeoLayer, GAUGE_SERVICES } from '../lib/gauges'
import { useSettings } from '../stores/settings'

/** Live Irrigation Department gauges, shared by every screen that shows them. */
export function useGauges() {
  const refreshMin = useSettings((s) => s.refreshMinutes)
  const stations = useQuery({
    queryKey: ['gauge-stations'],
    queryFn: ({ signal }) => fetchGaugeStations(signal),
    staleTime: 24 * 3_600_000,
  })
  const readings = useQuery({
    queryKey: ['gauges'],
    queryFn: ({ signal }) => fetchGaugeReadings(4, signal),
    // Gauges report hourly; checking at the user's refresh rate catches each new hour promptly.
    refetchInterval: refreshMin * 60_000,
  })
  const gauges = useMemo(
    () => (readings.data ? buildGauges(stations.data ?? [], readings.data) : undefined),
    // Recompute when either query lands; dataUpdatedAt also moves "now" forward for staleness.
    [readings.data, stations.data, readings.dataUpdatedAt], // eslint-disable-line react-hooks/exhaustive-deps
  )
  return { gauges, query: readings, stations, updatedAt: readings.dataUpdatedAt }
}

/** River basins, river lines and mapped flood extents for the map; fetched only when a layer is on. */
export function useGaugeGeo(which: 'basins' | 'rivers' | 'flood', enabled: boolean) {
  return useQuery({
    queryKey: ['gauge-geo', which],
    queryFn: ({ signal }) =>
      which === 'flood' ? fetchFloodAreas(signal)
        : which === 'basins' ? fetchGeoLayer(GAUGE_SERVICES.basins, "Name <> 'Placemark'", 'Name', signal)
          : fetchGeoLayer(GAUGE_SERVICES.rivers, '1=1', '*', signal),
    enabled,
    staleTime: Infinity,
    gcTime: Infinity,
  })
}
