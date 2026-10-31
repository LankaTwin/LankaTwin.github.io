import { useQuery } from '@tanstack/react-query'
import { fetchAirNow, fetchNowcast, fetchRivers } from '../lib/api'
import { RIVER_POINTS, STATIONS } from '../lib/places'
import { useSettings } from '../stores/settings'
import { buildReadings, buildRivers } from '../lib/readings'

// The shaping lives in lib/readings so the build's public API uses the same code.
export { num, rainWindows, riverStats, toReading, buildReadings, buildRivers } from '../lib/readings'
export type { StationReading, RiverReading } from '../lib/readings'

export function useNowcast() {
  const refreshMin = useSettings((s) => s.refreshMinutes)
  const interval = refreshMin * 60_000
  const weather = useQuery({
    queryKey: ['nowcast'],
    queryFn: ({ signal }) => fetchNowcast(STATIONS, signal),
    refetchInterval: interval,
  })
  const air = useQuery({
    queryKey: ['air-now'],
    queryFn: ({ signal }) => fetchAirNow(STATIONS, signal),
    refetchInterval: interval,
  })
  // Rivers feed the flood score; the query is shared with every other useRivers() caller.
  const { rivers } = useRivers()

  const readings = weather.data ? buildReadings(weather.data, air.data, rivers) : undefined
  return { readings, weather, air, updatedAt: Math.max(weather.dataUpdatedAt, air.dataUpdatedAt) }
}

export function useRivers() {
  const refreshMin = useSettings((s) => s.refreshMinutes)
  const q = useQuery({
    queryKey: ['rivers'],
    queryFn: ({ signal }) => fetchRivers(RIVER_POINTS, signal),
    // GloFAS updates once a day; no need to poll as often as weather.
    refetchInterval: Math.max(60, refreshMin) * 60_000,
    staleTime: 30 * 60_000,
  })
  const rivers = q.data ? buildRivers(q.data) : undefined
  return { rivers, query: q }
}
