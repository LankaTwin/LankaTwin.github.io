// Sri Lanka's four climate seasons, as the Department of Meteorology describes them.

export interface Season {
  id: 'fim' | 'swm' | 'sim' | 'nem'
  name: string
  months: string
  /** Months 1–12 the season covers. */
  span: number[]
  summary: string
  /** Parts of the island that usually get most rain in this season. */
  wetter: string
}

export const SEASONS: Season[] = [
  {
    id: 'fim', name: 'First inter-monsoon', months: 'March – April', span: [3, 4],
    summary: 'Hot and humid, with afternoon and evening thunderstorms across much of the island.',
    wetter: 'South-western slopes and the hill country',
  },
  {
    id: 'swm', name: 'South-west monsoon', months: 'May – September', span: [5, 6, 7, 8, 9],
    summary: 'Steady south-westerly winds bring rain to the west and south; the north and east stay dry and windy.',
    wetter: 'Western, Sabaragamuwa and Southern provinces, and the western hills',
  },
  {
    id: 'sim', name: 'Second inter-monsoon', months: 'October – November', span: [10, 11],
    summary: 'Thunderstorms island-wide, and the season most prone to cyclones and depressions from the Bay of Bengal.',
    wetter: 'Most of the island, especially the south-west',
  },
  {
    id: 'nem', name: 'North-east monsoon', months: 'December – February', span: [12, 1, 2],
    summary: 'North-easterly winds bring rain to the north and east, filling the dry-zone tanks for the Maha paddy season.',
    wetter: 'Northern, Eastern and Uva provinces, and the eastern hills',
  },
]

/** The season for a date given as YYYY-MM-DD (Sri Lanka time). */
export function seasonFor(isoDate: string): Season {
  const m = Number(isoDate.slice(5, 7))
  return SEASONS.find((s) => s.span.includes(m)) ?? SEASONS[0]
}
