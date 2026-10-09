import type { ReactNode } from 'react'
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { Skeleton } from '@/components/ui/States'
import { Tooltip } from '@/components/ui/Tooltip'
import { cn } from '@/core/utils/cn'
import { formatPercent } from '@/core/utils/format'

export interface StatTileProps {
  label: string
  value: ReactNode
  icon?: ReactNode
  /** Signed ratio vs previous period (0.12 = +12 %). */
  delta?: number | null
  deltaLabel?: string
  /** Whether "up" is good (false for churn, open tickets…). */
  upIsGood?: boolean
  hint?: ReactNode
  /** Definition of the metric (shown on hover): never a number without its meaning. */
  definition?: string
  loading?: boolean
  emphasis?: boolean
  footer?: ReactNode
}

export function StatTile({
  label,
  value,
  icon,
  delta,
  deltaLabel = 'vs période précédente',
  upIsGood = true,
  hint,
  definition,
  loading,
  emphasis,
  footer,
}: StatTileProps) {
  const direction = delta === null || delta === undefined || !Number.isFinite(delta) ? null : delta > 0.0005 ? 'up' : delta < -0.0005 ? 'down' : 'flat'
  const good = direction === 'flat' ? null : (direction === 'up') === upIsGood

  const labelNode = (
    <p
      className={cn(
        'text-[13px] font-semibold',
        emphasis ? 'text-white/75' : 'text-fg-muted',
        definition && 'cursor-help underline decoration-dotted decoration-1 underline-offset-4',
      )}
    >
      {label}
    </p>
  )

  return (
    <div
      className={cn(
        'relative flex min-w-0 flex-col overflow-hidden rounded-2xl border p-4 shadow-card sm:p-5',
        emphasis ? 'border-transparent bg-gradient-to-br from-[#07120e] via-[#0e271e] to-[#1a5a40] text-white' : 'border-border bg-surface',
      )}
    >
      {emphasis && <div className="pointer-events-none absolute -top-16 -right-16 size-48 rounded-full bg-mint/20 blur-3xl" aria-hidden />}
      <div className="relative flex items-start justify-between gap-3">
        {definition ? <Tooltip content={definition}>{labelNode}</Tooltip> : labelNode}
        {icon && (
          <span
            className={cn(
              'grid size-8 shrink-0 place-items-center rounded-lg [&_svg]:size-4',
              emphasis ? 'bg-white/10 text-brand-200' : 'bg-surface-3 text-fg-muted',
            )}
          >
            {icon}
          </span>
        )}
      </div>
      <div className="relative mt-2">
        {loading ? (
          <Skeleton className={cn('h-8 w-32', emphasis && 'opacity-30')} />
        ) : (
          <p className={cn('truncate font-bold tracking-tight', emphasis ? 'text-[32px] leading-10' : 'text-[26px] leading-9 text-fg')}>{value}</p>
        )}
      </div>
      <div className="relative mt-1.5 flex min-h-5 flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        {!loading && direction && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-semibold tabular',
              good === null && (emphasis ? 'bg-white/10 text-white/80' : 'bg-surface-3 text-fg-muted'),
              good === true && (emphasis ? 'bg-success/20 text-[#7ef0b0]' : 'bg-success-soft text-success'),
              good === false && (emphasis ? 'bg-danger/20 text-[#ffb3bb]' : 'bg-danger-soft text-danger'),
            )}
          >
            {direction === 'up' ? (
              <ArrowUpRight className="size-3.5" />
            ) : direction === 'down' ? (
              <ArrowDownRight className="size-3.5" />
            ) : (
              <Minus className="size-3.5" />
            )}
            {formatPercent(Math.abs(delta ?? 0))}
          </span>
        )}
        {!loading && direction && <span className={emphasis ? 'text-white/55' : 'text-fg-subtle'}>{deltaLabel}</span>}
        {!loading && hint && <span className={emphasis ? 'text-white/60' : 'text-fg-subtle'}>{hint}</span>}
      </div>
      {footer && <div className="relative mt-3">{footer}</div>}
    </div>
  )
}
