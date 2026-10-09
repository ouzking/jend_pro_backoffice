import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/core/utils/cn'

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-2xl border border-border bg-surface shadow-card', className)} {...rest} />
}

export interface CardHeaderProps {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  icon?: ReactNode
  className?: string
}

export function CardHeader({ title, description, actions, icon, className }: CardHeaderProps) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-3 px-5 pt-4 pb-3', className)}>
      <div className="flex min-w-0 items-start gap-3">
        {icon && <div className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-surface-3 text-fg-muted [&_svg]:size-4">{icon}</div>}
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-bold tracking-tight text-fg">{title}</h3>
          {description && <p className="mt-0.5 text-[13px] text-fg-muted">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}

export function CardBody({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-5 pb-5', className)} {...rest} />
}

/** Key / value grid used on detail pages. */
export function DescriptionList({ items, columns = 2 }: { items: Array<{ label: string; value: ReactNode; hidden?: boolean }>; columns?: 1 | 2 | 3 }) {
  return (
    <dl
      className={cn(
        'grid gap-x-6 gap-y-4',
        columns === 1 && 'grid-cols-1',
        columns === 2 && 'grid-cols-1 sm:grid-cols-2',
        columns === 3 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
      )}
    >
      {items
        .filter((i) => !i.hidden)
        .map((item) => (
          <div key={item.label} className="min-w-0">
            <dt className="text-xs font-medium text-fg-subtle">{item.label}</dt>
            <dd className="mt-1 truncate text-sm font-medium text-fg">{item.value ?? '—'}</dd>
          </div>
        ))}
    </dl>
  )
}
