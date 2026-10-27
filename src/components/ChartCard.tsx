import { useRef, type ReactNode } from 'react'
import { ImageDown } from 'lucide-react'
import type { EChartsCoreOption } from 'echarts/core'
import Chart, { type ChartHandle } from './Chart'
import { download } from '../lib/export'
import { Skeleton } from './ui'

export default function ChartCard({ title, sub, option, height = 220, file, loading, children }: {
  title: string
  sub?: ReactNode
  option?: EChartsCoreOption
  height?: number
  file: string
  loading?: boolean
  children?: ReactNode
}) {
  const ref = useRef<ChartHandle>(null)
  return (
    <section className="rounded-xl border border-line bg-surface p-4">
      <header className="mb-2 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-semibold">{title}</h3>
          {sub && <p className="text-xs text-muted">{sub}</p>}
        </div>
        {option && (
          <button
            type="button"
            onClick={() => { const u = ref.current?.toPNG(); if (u) download(`${file}.png`, u) }}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted hover:bg-sunken hover:text-ink"
          >
            <ImageDown className="size-3.5" aria-hidden /> PNG
          </button>
        )}
      </header>
      {loading || !option ? <div style={{ height }}><Skeleton className="h-full w-full" /></div> : <Chart ref={ref} option={option} height={height} label={title} />}
      {children}
    </section>
  )
}
