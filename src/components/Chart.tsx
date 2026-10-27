import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import * as echarts from 'echarts/core'
import { BarChart, LineChart } from 'echarts/charts'
import { DataZoomComponent, GridComponent, LegendComponent, MarkAreaComponent, MarkLineComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsCoreOption } from 'echarts/core'
import { useSettings } from '../stores/settings'
import { localeOf } from '../i18n/core'
import { calendarNames } from '../lib/time'

echarts.use([LineChart, BarChart, GridComponent, TooltipComponent, LegendComponent, DataZoomComponent, MarkLineComponent, MarkAreaComponent, CanvasRenderer])

export interface ChartHandle { toPNG: () => string | undefined }

/** Reads the current theme tokens so charts match light and dark. */
export function chartTokens() {
  const cs = getComputedStyle(document.documentElement)
  const v = (k: string) => cs.getPropertyValue(k).trim()
  return { ink: v('--c-ink'), muted: v('--c-muted'), line: v('--c-line'), surface: v('--c-surface'), lagoon: v('--c-lagoon'), thambili: v('--c-thambili'), rambutan: v('--c-rambutan'), paddy: v('--c-paddy') }
}

export function baseOption(): EChartsCoreOption {
  const t = chartTokens()
  return {
    backgroundColor: 'transparent',
    textStyle: { fontFamily: 'Schibsted Grotesk, system-ui, sans-serif', color: t.muted },
    grid: { left: 44, right: 16, top: 28, bottom: 30, containLabel: false },
    tooltip: {
      trigger: 'axis',
      backgroundColor: t.surface,
      borderColor: t.line,
      textStyle: { color: t.ink, fontSize: 12 },
      axisPointer: { lineStyle: { color: t.muted, type: 'dashed' } },
    },
    xAxis: { type: 'time', axisLine: { lineStyle: { color: t.line } }, axisLabel: { color: t.muted, hideOverlap: true }, splitLine: { show: false } },
    yAxis: { type: 'value', axisLabel: { color: t.muted }, splitLine: { lineStyle: { color: t.line, opacity: 0.6 } }, nameTextStyle: { color: t.muted, align: 'left' } },
    legend: { top: 0, right: 0, textStyle: { color: t.muted }, icon: 'roundRect', itemWidth: 12, itemHeight: 4 },
  }
}

interface Props { option: EChartsCoreOption; height?: number; label: string }

const Chart = forwardRef<ChartHandle, Props>(function Chart({ option, height = 220, label }, ref) {
  const el = useRef<HTMLDivElement>(null)
  const inst = useRef<echarts.ECharts | null>(null)
  const theme = useSettings((s) => s.theme)
  const lang = useSettings((s) => s.lang)

  // Month and weekday names on time axes follow the interface language.
  useEffect(() => {
    if (!el.current) return
    // ECharts fills the rest of a partial locale from its English default.
    const locale = { time: calendarNames(localeOf(lang)) } as unknown as echarts.EChartsInitOpts['locale']
    const c = echarts.init(el.current, undefined, { renderer: 'canvas', locale })
    inst.current = c
    const ro = new ResizeObserver(() => c.resize())
    ro.observe(el.current)
    c.setOption(option, true)
    return () => { ro.disconnect(); c.dispose(); inst.current = null }
  }, [lang]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    inst.current?.setOption(option, true)
  }, [option, theme])

  useImperativeHandle(ref, () => ({
    toPNG: () => inst.current?.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: chartTokens().surface }),
  }))

  return <div ref={el} style={{ height }} className="w-full" role="img" aria-label={label} />
})

export default Chart
