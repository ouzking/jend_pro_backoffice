import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatNumber } from '@/core/utils/format'
import { IconButton } from './Button'
import { Select } from './Field'

const PAGE_SIZES = [10, 25, 50, 100] as const

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: {
  /** 1-based */
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (size: number) => void
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-[13px] text-fg-muted">
      <p className="tabular">
        <span className="font-semibold text-fg">
          {formatNumber(from)}–{formatNumber(to)}
        </span>{' '}
        sur {formatNumber(total)}
      </p>
      <div className="flex items-center gap-3">
        {onPageSizeChange && (
          <label className="hidden items-center gap-2 sm:flex">
            Lignes
            <Select
              size="sm"
              className="w-[4.5rem]"
              value={String(pageSize)}
              onValueChange={(v) => onPageSizeChange(Number(v))}
              options={PAGE_SIZES.map((s) => ({ value: String(s), label: String(s) }))}
              aria-label="Lignes par page"
            />
          </label>
        )}
        <div className="flex items-center gap-1">
          <IconButton label="Page précédente" variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
            <ChevronLeft className="size-4" />
          </IconButton>
          <span className="min-w-16 text-center tabular">
            {page} / {pageCount}
          </span>
          <IconButton label="Page suivante" variant="secondary" size="sm" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}>
            <ChevronRight className="size-4" />
          </IconButton>
        </div>
      </div>
    </div>
  )
}

/** "Load more" for keyset-paginated feeds (audit log). */
export function LoadMore({ hasMore, loading, onLoadMore }: { hasMore: boolean; loading: boolean; onLoadMore: () => void }) {
  if (!hasMore) return <p className="py-4 text-center text-xs text-fg-subtle">Fin du journal</p>
  return (
    <div className="flex justify-center py-4">
      <button
        type="button"
        onClick={onLoadMore}
        disabled={loading}
        className="rounded-lg border border-border bg-surface px-4 py-2 text-[13px] font-semibold text-fg-muted shadow-xs hover:text-fg disabled:opacity-60"
      >
        {loading ? 'Chargement…' : 'Charger plus'}
      </button>
    </div>
  )
}
