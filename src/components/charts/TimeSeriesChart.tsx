import { useId, useState, type ReactNode } from 'react'
import { BarChart3, Table2 } from 'lucide-react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from 'recharts'
import { IconButton } from '@/components/ui/Button'
import { cn } from '@/core/utils/cn'
import { formatBucket, formatCompact } from '@/core/utils/format'
import type { Granularity } from '@/core/utils/dates'
import { SERIES_COLORS, type Series } from './series'

export interface TimeSeriesChartProps<T extends { bucket: string }> {
  data: readonly T[]
  series: ReadonlyArray<Series<T>>
  granularity: Granularity
  kind?: 'area' | 'bar'
  height?: number
  formatValue?: (value: number) => string
  /** Accessible name of the figure. */
  label: string
}

function ChartTooltip({
  active,
  payload,
  label,
  granularity,
  formatValue,
}: TooltipContentProps<number, string> & { granularity: Granularity; formatValue: (v: number) => string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="min-w-40 rounded-xl border border-border bg-surface px-3 py-2.5 shadow-pop">
      <p className="mb-1.5 text-xs font-semibold text-fg-subtle">
        {granularity === 'week' ? 'Semaine du ' : ''}
        {formatBucket(String(label), granularity)}
      </p>
      {payload.map((p) => (
        <div key={String(p.dataKey)} className="flex items-center justify-between gap-4 text-[13px]">
          <span className="flex items-center gap-2 text-fg-muted">
            <span className="size-2 rounded-full" style={{ background: p.color }} aria-hidden />
            {p.name}
          </span>
          <span className="font-semibold text-fg tabular">{formatValue(Number(p.value))}</span>
        </div>
      ))}
    </div>
  )
}

export function TimeSeriesChart<T extends { bucket: string }>({
  data,
  series,
  granularity,
  kind = 'area',
  height = 240,
  formatValue = (v) => formatCompact(v),
  label,
}: TimeSeriesChartProps<T>) {
  const gradientId = useId().replace(/:/g, '')
  const axisTick = { fill: 'var(--fg-subtle)', fontSize: 11 }
  const common = {
    data: data as T[],
    margin: { top: 8, right: 8, bottom: 0, left: 0 },
    accessibilityLayer: true,
  }
  const xAxis = (
    <XAxis
      dataKey="bucket"
      tickFormatter={(v: string) => formatBucket(v, granularity)}
      tick={axisTick}
      tickLine={false}
      axisLine={{ stroke: 'var(--chart-grid)' }}
      minTickGap={24}
      tickMargin={8}
    />
  )
  const yAxis = <YAxis tickFormatter={(v: number) => formatCompact(v)} tick={axisTick} tickLine={false} axisLine={false} width={44} allowDecimals={false} />
  const grid = <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeWidth={1} />
  const tooltip = (
    <Tooltip
      cursor={kind === 'area' ? { stroke: 'var(--border-strong)', strokeWidth: 1 } : { fill: 'var(--surface-3)', opacity: 0.6 }}
      content={(props) => <ChartTooltip {...(props as TooltipContentProps<number, string>)} granularity={granularity} formatValue={formatValue} />}
    />
  )

  return (
    <figure aria-label={label} className="m-0">
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {kind === 'area' ? (
            <AreaChart {...common}>
              <defs>
                {series.map((s) => (
                  <linearGradient key={s.key} id={`${gradientId}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={SERIES_COLORS[s.color]} stopOpacity={0.16} />
                    <stop offset="100%" stopColor={SERIES_COLORS[s.color]} stopOpacity={0.02} />
                  </linearGradient>
                ))}
              </defs>
              {grid}
              {xAxis}
              {yAxis}
              {tooltip}
              {series.map((s) => (
                <Area
                  key={s.key}
                  type="monotone"
                  dataKey={String(s.key)}
                  name={s.label}
                  stroke={SERIES_COLORS[s.color]}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill={`url(#${gradientId}-${s.key})`}
                  activeDot={{ r: 4.5, strokeWidth: 2, stroke: 'var(--surface)' }}
                  dot={false}
                  isAnimationActive={data.length < 120}
                  animationDuration={500}
                />
              ))}
            </AreaChart>
          ) : (
            <BarChart {...common} barCategoryGap="22%" barGap={2}>
              {grid}
              {xAxis}
              {yAxis}
              {tooltip}
              {series.map((s) => (
                <Bar
                  key={s.key}
                  dataKey={String(s.key)}
                  name={s.label}
                  fill={SERIES_COLORS[s.color]}
                  maxBarSize={24}
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={data.length < 120}
                  animationDuration={500}
                />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
      {series.length > 1 && <ChartLegend series={series} />}
    </figure>
  )
}

export function ChartLegend<T>({ series }: { series: ReadonlyArray<Series<T>> }) {
  return (
    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-fg-muted">
      {series.map((s) => (
        <li key={s.key} className="flex items-center gap-1.5">
          <span className="h-2 w-3 rounded-sm" style={{ background: SERIES_COLORS[s.color] }} aria-hidden />
          {s.label}
        </li>
      ))}
    </ul>
  )
}

/** Accessible table alternative to any time series (always available). */
export function SeriesTable<T extends { bucket: string }>({
  data,
  series,
  granularity,
  formatValue = (v) => formatCompact(v),
}: Pick<TimeSeriesChartProps<T>, 'data' | 'series' | 'granularity' | 'formatValue'>) {
  return (
    <div className="max-h-64 overflow-auto rounded-lg border border-border">
      <table className="w-full text-[13px]">
        <thead className="sticky top-0 bg-surface-2">
          <tr>
            <th className="px-3 py-2 text-left text-[11px] font-bold tracking-wider text-fg-subtle uppercase">Période</th>
            {series.map((s) => (
              <th key={s.key} className="px-3 py-2 text-right text-[11px] font-bold tracking-wider text-fg-subtle uppercase">
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.bucket} className="border-t border-border">
              <td className="px-3 py-1.5 text-fg-muted">{formatBucket(row.bucket, granularity)}</td>
              {series.map((s) => (
                <td key={s.key} className="px-3 py-1.5 text-right font-medium text-fg tabular">
                  {formatValue(Number(row[s.key]))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Chart with a chart / table toggle (accessibility and exact values). */
export function ChartWithTable<T extends { bucket: string }>(props: TimeSeriesChartProps<T> & { headerless?: boolean; extra?: ReactNode }) {
  const [view, setView] = useState<'chart' | 'table'>('chart')
  return (
    <div>
      <div className={cn('mb-2 flex items-center justify-end gap-1', props.headerless && 'hidden')}>
        {props.extra}
        <IconButton
          size="xs"
          label={view === 'chart' ? 'Afficher le tableau' : 'Afficher le graphique'}
          onClick={() => setView((v) => (v === 'chart' ? 'table' : 'chart'))}
        >
          {view === 'chart' ? <Table2 className="size-3.5" /> : <BarChart3 className="size-3.5" />}
        </IconButton>
      </div>
      {view === 'chart' ? <TimeSeriesChart {...props} /> : <SeriesTable {...props} />}
    </div>
  )
}
