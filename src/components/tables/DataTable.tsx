import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, ChevronsUpDown, Columns3 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Menu } from '@/components/ui/Menu'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States'
import { cn } from '@/core/utils/cn'

export type SortDirection = 'asc' | 'desc'
export interface SortState<K extends string = string> {
  key: K
  direction: SortDirection
}

export interface Column<T, K extends string = string> {
  id: string
  header: ReactNode
  cell: (row: T) => ReactNode
  /** Server-side sort key: the table only emits the change, the query sorts. */
  sortKey?: K
  /** Directions allowed by the backend for this key (default: both). */
  sortDirections?: readonly SortDirection[]
  align?: 'left' | 'right' | 'center'
  className?: string
  /** Responsive: hide the column under this breakpoint. */
  hideBelow?: 'sm' | 'md' | 'lg' | 'xl'
  /** Shown in the column picker; `false` keeps it always visible. */
  hideable?: boolean
  defaultHidden?: boolean
}

const HIDE_BELOW: Record<NonNullable<Column<unknown>['hideBelow']>, string> = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
  xl: 'hidden xl:table-cell',
}

export interface DataTableProps<T, K extends string = string> {
  /** Stable id: column preferences are remembered per table. */
  id: string
  columns: ReadonlyArray<Column<T, K>>
  rows: readonly T[] | undefined
  getRowId: (row: T) => string
  loading?: boolean
  /** Refetch in background (previous page still displayed). */
  fetching?: boolean
  error?: unknown
  onRetry?: () => void
  empty?: { title: string; description?: ReactNode; icon?: ReactNode; action?: ReactNode }
  onRowClick?: (row: T) => void
  sort?: SortState<K>
  onSortChange?: (sort: SortState<K>) => void
  selection?: { selected: ReadonlySet<string>; onChange: (next: Set<string>) => void; actions?: ReactNode }
  toolbar?: ReactNode
  footer?: ReactNode
  skeletonRows?: number
}

function readHidden(id: string, columns: ReadonlyArray<Column<unknown>>): Set<string> {
  try {
    const saved = localStorage.getItem(`jendpro.table.${id}.hidden`)
    if (saved) return new Set(JSON.parse(saved) as string[])
  } catch {
    /* storage unavailable: defaults */
  }
  return new Set(columns.filter((c) => c.defaultHidden).map((c) => c.id))
}

export function DataTable<T, K extends string = string>({
  id,
  columns,
  rows,
  getRowId,
  loading = false,
  fetching = false,
  error,
  onRetry,
  empty,
  onRowClick,
  sort,
  onSortChange,
  selection,
  toolbar,
  footer,
  skeletonRows = 8,
}: DataTableProps<T, K>) {
  const [hidden, setHidden] = useState<Set<string>>(() => readHidden(id, columns as ReadonlyArray<Column<unknown>>))

  useEffect(() => {
    try {
      localStorage.setItem(`jendpro.table.${id}.hidden`, JSON.stringify([...hidden]))
    } catch {
      /* ignore */
    }
  }, [hidden, id])

  const visibleColumns = useMemo(() => columns.filter((c) => !hidden.has(c.id)), [columns, hidden])
  const hideableColumns = columns.filter((c) => c.hideable !== false && typeof c.header === 'string')
  const rowIds = useMemo(() => (rows ?? []).map(getRowId), [rows, getRowId])
  const allSelected = selection !== undefined && rowIds.length > 0 && rowIds.every((r) => selection.selected.has(r))
  const someSelected = selection !== undefined && rowIds.some((r) => selection.selected.has(r))

  const toggleAll = () => {
    if (!selection) return
    const next = new Set(selection.selected)
    if (allSelected) rowIds.forEach((r) => next.delete(r))
    else rowIds.forEach((r) => next.add(r))
    selection.onChange(next)
  }

  const toggleRow = (rowId: string) => {
    if (!selection) return
    const next = new Set(selection.selected)
    if (next.has(rowId)) next.delete(rowId)
    else next.add(rowId)
    selection.onChange(next)
  }

  const onHeaderSort = (column: Column<T, K>) => {
    if (!column.sortKey || !onSortChange) return
    const allowed = column.sortDirections ?? ['desc', 'asc']
    if (sort?.key === column.sortKey) {
      const next = sort.direction === 'desc' ? 'asc' : 'desc'
      if (allowed.includes(next)) onSortChange({ key: column.sortKey, direction: next })
    } else {
      onSortChange({ key: column.sortKey, direction: allowed[0] })
    }
  }

  const colSpan = visibleColumns.length + (selection ? 1 : 0)
  const showEmpty = !loading && !error && rows !== undefined && rows.length === 0

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
      {(toolbar || hideableColumns.length > 0) && (
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5 sm:px-4">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">{toolbar}</div>
          {hideableColumns.length > 0 && (
            <Menu
              trigger={(props) => (
                <Button size="sm" variant="ghost" leftIcon={<Columns3 className="size-4" />} {...props}>
                  <span className="hidden sm:inline">Colonnes</span>
                </Button>
              )}
              header={<p className="text-xs font-semibold text-fg-subtle">Colonnes affichées</p>}
              items={hideableColumns.map((c) => ({
                label: `${hidden.has(c.id) ? '○' : '●'}  ${c.header as string}`,
                onSelect: () =>
                  setHidden((h) => {
                    const next = new Set(h)
                    if (next.has(c.id)) next.delete(c.id)
                    else next.add(c.id)
                    return next
                  }),
              }))}
            />
          )}
        </div>
      )}

      {selection && selection.selected.size > 0 && (
        <div className="flex animate-fade-in items-center gap-3 border-b border-brand-500/20 bg-brand-50 px-4 py-2 text-[13px] dark:bg-brand-500/10">
          <span className="font-semibold text-brand-700 dark:text-brand-300">{selection.selected.size} sélectionné(s)</span>
          <div className="flex items-center gap-2">{selection.actions}</div>
          <button type="button" className="ml-auto text-xs font-semibold text-fg-muted hover:text-fg" onClick={() => selection.onChange(new Set())}>
            Désélectionner
          </button>
        </div>
      )}

      {fetching && !loading && (
        <div className="absolute inset-x-0 top-0 z-10 h-0.5 overflow-hidden" aria-hidden>
          <div className="h-full w-1/3 animate-[shimmer_1s_linear_infinite] bg-gradient-to-r from-transparent via-brand-500 to-transparent bg-[length:300%_100%]" />
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-[13px]">
          <thead>
            <tr className="border-b border-border bg-surface-2">
              {selection && (
                <th className="w-10 px-4 py-2.5">
                  <input
                    type="checkbox"
                    aria-label="Tout sélectionner"
                    className="size-4 accent-brand-600"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = !allSelected && someSelected
                    }}
                    onChange={toggleAll}
                  />
                </th>
              )}
              {visibleColumns.map((column) => {
                const active = column.sortKey !== undefined && sort?.key === column.sortKey
                return (
                  <th
                    key={column.id}
                    scope="col"
                    aria-sort={active ? (sort?.direction === 'asc' ? 'ascending' : 'descending') : undefined}
                    className={cn(
                      'px-4 py-2.5 text-[11px] font-bold tracking-wider whitespace-nowrap text-fg-subtle uppercase',
                      column.align === 'right' && 'text-right',
                      column.align === 'center' && 'text-center',
                      column.hideBelow && HIDE_BELOW[column.hideBelow],
                      column.className,
                    )}
                  >
                    {column.sortKey && onSortChange ? (
                      <button
                        type="button"
                        onClick={() => onHeaderSort(column)}
                        className={cn('inline-flex items-center gap-1 uppercase transition-colors hover:text-fg', active && 'text-fg')}
                      >
                        {column.header}
                        {active ? (
                          sort?.direction === 'asc' ? (
                            <ArrowUp className="size-3" />
                          ) : (
                            <ArrowDown className="size-3" />
                          )
                        ) : (
                          <ChevronsUpDown className="size-3 opacity-50" />
                        )}
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody className={cn('transition-opacity', fetching && !loading && 'opacity-70')}>
            {loading &&
              Array.from({ length: skeletonRows }, (_, i) => (
                <tr key={`sk-${i}`} className="border-b border-border last:border-0">
                  {selection && (
                    <td className="px-4 py-3.5">
                      <Skeleton className="size-4" />
                    </td>
                  )}
                  {visibleColumns.map((c, j) => (
                    <td key={c.id} className={cn('px-4 py-3.5', c.hideBelow && HIDE_BELOW[c.hideBelow])}>
                      <Skeleton className={cn('h-3.5', j === 0 ? 'w-40' : 'w-20', c.align === 'right' && 'ml-auto')} />
                    </td>
                  ))}
                </tr>
              ))}

            {!loading && error !== undefined && error !== null && (
              <tr>
                <td colSpan={colSpan}>
                  <ErrorState error={error} onRetry={onRetry} compact />
                </td>
              </tr>
            )}

            {showEmpty && (
              <tr>
                <td colSpan={colSpan}>
                  <EmptyState compact title={empty?.title ?? 'Aucun résultat'} description={empty?.description} icon={empty?.icon} action={empty?.action} />
                </td>
              </tr>
            )}

            {!loading &&
              !error &&
              rows?.map((row) => {
                const rowId = getRowId(row)
                const selected = selection?.selected.has(rowId) ?? false
                return (
                  <tr
                    key={rowId}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    onKeyDown={
                      onRowClick
                        ? (e) => {
                            if (e.key === 'Enter' && e.target === e.currentTarget) onRowClick(row)
                          }
                        : undefined
                    }
                    tabIndex={onRowClick ? 0 : undefined}
                    className={cn(
                      'group border-b border-border transition-colors last:border-0',
                      onRowClick && 'cursor-pointer outline-none hover:bg-surface-2 focus-visible:bg-surface-2',
                      selected && 'bg-brand-50/60 dark:bg-brand-500/5',
                    )}
                  >
                    {selection && (
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          aria-label="Sélectionner la ligne"
                          className="size-4 accent-brand-600"
                          checked={selected}
                          onChange={() => toggleRow(rowId)}
                        />
                      </td>
                    )}
                    {visibleColumns.map((column) => (
                      <td
                        key={column.id}
                        className={cn(
                          'px-4 py-3 align-middle text-fg',
                          column.align === 'right' && 'text-right tabular',
                          column.align === 'center' && 'text-center',
                          column.hideBelow && HIDE_BELOW[column.hideBelow],
                          column.className,
                        )}
                      >
                        {column.cell(row)}
                      </td>
                    ))}
                  </tr>
                )
              })}
          </tbody>
        </table>
      </div>
      {footer && !error && <div className="border-t border-border">{footer}</div>}
    </div>
  )
}
