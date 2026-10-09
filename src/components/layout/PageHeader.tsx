import { useEffect, type ReactNode } from 'react'
import { Link } from 'react-router'
import { ChevronRight } from 'lucide-react'

export interface Crumb {
  label: string
  to?: string
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Fil d’Ariane" className="mb-2">
      <ol className="flex flex-wrap items-center gap-1 text-xs font-medium text-fg-subtle">
        {items.map((item, i) => (
          <li key={`${item.label}-${i}`} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="size-3" aria-hidden />}
            {item.to ? (
              <Link to={item.to} className="transition-colors hover:text-fg">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-fg-muted">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  meta,
}: {
  title: ReactNode
  description?: ReactNode
  breadcrumbs?: Crumb[]
  actions?: ReactNode
  /** Badges / status under the title. */
  meta?: ReactNode
}) {
  useEffect(() => {
    if (typeof title === 'string') document.title = `${title} · JËND PRO Console`
  }, [title])

  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
        <h1 className="truncate text-[22px] leading-tight font-extrabold tracking-tight text-fg sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-[13px] text-fg-muted sm:text-sm">{description}</p>}
        {meta && <div className="mt-2.5 flex flex-wrap items-center gap-2">{meta}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}
