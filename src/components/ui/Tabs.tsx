import { useRef, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '@/core/utils/cn'

export interface TabItem<T extends string> {
  value: T
  label: string
  count?: number | null
  icon?: ReactNode
  hidden?: boolean
}

/** Underlined tabs (WAI-ARIA tablist with arrow-key navigation). */
export function Tabs<T extends string>({
  items,
  value,
  onChange,
  className,
}: {
  items: ReadonlyArray<TabItem<T>>
  value: T
  onChange: (value: T) => void
  className?: string
}) {
  const list = useRef<HTMLDivElement>(null)
  const visible = items.filter((i) => !i.hidden)

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    const index = visible.findIndex((i) => i.value === value)
    const next = visible[(index + (e.key === 'ArrowRight' ? 1 : visible.length - 1)) % visible.length]
    onChange(next.value)
    requestAnimationFrame(() => list.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus())
  }

  return (
    <div ref={list} role="tablist" onKeyDown={onKeyDown} className={cn('flex gap-1 overflow-x-auto border-b border-border', className)}>
      {visible.map((item) => {
        const selected = item.value === value
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item.value)}
            className={cn(
              'relative -mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-[13px] font-semibold transition-colors [&_svg]:size-4',
              selected ? 'border-brand-500 text-fg' : 'border-transparent text-fg-muted hover:text-fg',
            )}
          >
            {item.icon}
            {item.label}
            {item.count !== undefined && item.count !== null && (
              <span
                className={cn(
                  'rounded-full px-1.5 text-[11px] tabular',
                  selected ? 'bg-brand-500/15 text-brand-700 dark:text-brand-300' : 'bg-surface-3 text-fg-subtle',
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/** Pill segmented control (period presets, small option sets). */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = 'sm',
  label,
}: {
  options: ReadonlyArray<{ value: T; label: string; title?: string }>
  value: T
  onChange: (value: T) => void
  size?: 'xs' | 'sm'
  label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg border border-border bg-surface-3 p-0.5">
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={o.title}
            onClick={() => onChange(o.value)}
            className={cn(
              'rounded-md font-semibold transition-all duration-150',
              size === 'xs' ? 'h-6 px-2 text-[11px]' : 'h-7 px-2.5 text-xs',
              active ? 'bg-surface text-fg shadow-xs' : 'text-fg-muted hover:text-fg',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
