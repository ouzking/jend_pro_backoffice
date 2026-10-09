import { cn } from '@/core/utils/cn'
import { formatNumber, formatPercent } from '@/core/utils/format'
import { SERIES_COLORS } from './series'

export interface DistributionItem {
  key: string
  label: string
  value: number
  /** Fixed color slot of the entity (never its rank). */
  color: 0 | 1 | 2 | 3 | 4
}

/**
 * Part-to-whole as a 100% stacked bar (2px surface gaps) + labelled rows.
 * Every value is written in text: identity never relies on color alone.
 */
export function Distribution({ items, label }: { items: DistributionItem[]; label: string }) {
  const total = items.reduce((sum, i) => sum + i.value, 0)
  return (
    <figure aria-label={label} className="m-0">
      <div className="flex h-2.5 w-full gap-[2px] overflow-hidden rounded-full bg-surface-3">
        {total > 0 &&
          items
            .filter((i) => i.value > 0)
            .map((i) => (
              <div
                key={i.key}
                className="h-full first:rounded-l-full last:rounded-r-full"
                style={{ width: `${(i.value / total) * 100}%`, background: SERIES_COLORS[i.color] }}
                title={`${i.label} : ${formatNumber(i.value)}`}
              />
            ))}
      </div>
      <ul className="mt-4 space-y-2.5">
        {items.map((i) => (
          <li key={i.key} className="flex items-center gap-3 text-[13px]">
            <span className="size-2.5 shrink-0 rounded-sm" style={{ background: SERIES_COLORS[i.color] }} aria-hidden />
            <span className="min-w-0 flex-1 truncate font-medium text-fg">{i.label}</span>
            <span className={cn('font-semibold tabular text-fg')}>{formatNumber(i.value)}</span>
            <span className="w-12 text-right text-xs text-fg-subtle tabular">{total > 0 ? formatPercent(i.value / total) : '—'}</span>
          </li>
        ))}
      </ul>
    </figure>
  )
}
