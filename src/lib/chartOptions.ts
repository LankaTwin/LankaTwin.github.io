import type { EChartsCoreOption } from 'echarts/core'
import { baseOption, chartTokens } from '../components/Chart'
import { currentI18n } from '../i18n/useT'

export interface SeriesSpec {
  name: string
  data: [string, number | null][]
  color: string
  type?: 'line' | 'bar'
  area?: boolean
  dashed?: boolean
  width?: number
  step?: boolean
}

/** A time chart with a "now" rule and a shaded forecast region. */
export function timeOption(specs: SeriesSpec[], opts: { unit: string; now?: string; min?: number; max?: number; yMin0?: boolean; decimals?: number }): EChartsCoreOption {
  const t = chartTokens()
  const { t: tr } = currentI18n()
  const base = baseOption() as Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
  const last = specs[0]?.data.at(-1)?.[0]
  const d = opts.decimals ?? 1
  return {
    ...base,
    legend: { ...base.legend, show: specs.length > 1 },
    tooltip: {
      ...base.tooltip,
      valueFormatter: (v: number | null) => (v == null ? '—' : `${Number(v).toFixed(d)} ${opts.unit}`),
    },
    yAxis: { ...base.yAxis, min: opts.yMin0 ? 0 : opts.min, max: opts.max, name: opts.unit, scale: !opts.yMin0 },
    series: specs.map((s, i) => ({
      name: s.name,
      type: s.type ?? 'line',
      data: s.data,
      showSymbol: false,
      smooth: s.type === 'bar' || s.step ? false : 0.2,
      step: s.step ? 'end' : undefined,
      barMaxWidth: 10,
      itemStyle: { color: s.color, borderRadius: s.type === 'bar' ? [2, 2, 0, 0] : 0 },
      lineStyle: { width: s.width ?? 2, type: s.dashed ? 'dashed' : 'solid', color: s.color },
      areaStyle: s.area ? { color: s.color, opacity: 0.12 } : undefined,
      markLine:
        i === 0 && opts.now
          ? { silent: true, symbol: 'none', label: { formatter: tr('chart.now'), color: t.muted, fontSize: 10, position: 'insideEndTop' }, lineStyle: { color: t.ink, type: 'solid', width: 1, opacity: 0.5 }, data: [{ xAxis: opts.now }] }
          : undefined,
      markArea:
        i === 0 && opts.now && last && last > opts.now
          ? { silent: true, itemStyle: { color: t.muted, opacity: 0.07 }, label: { show: true, formatter: tr('chart.forecast'), color: t.muted, fontSize: 10, position: 'insideTopRight' }, data: [[{ xAxis: opts.now }, { xAxis: last }]] }
          : undefined,
    })),
  }
}

export const zip = (time: string[], vals: (number | null)[]): [string, number | null][] => time.map((t, i) => [t, vals[i] ?? null])

/** Sum hourly values into calendar days. */
export function dailySum(time: string[], vals: (number | null)[]) {
  const m = new Map<string, number>()
  time.forEach((t, i) => {
    const d = t.slice(0, 10)
    m.set(d, (m.get(d) ?? 0) + (vals[i] ?? 0))
  })
  return [...m.entries()].map(([d, v]) => [d, Math.round(v * 10) / 10] as [string, number])
}
