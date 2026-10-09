import { useId, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check, X } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { SearchInput } from '@/components/ui/Field'
import { Spinner } from '@/components/ui/States'
import { cn } from '@/core/utils/cn'
import { useDebouncedValue } from '@/core/utils/hooks'
import { businessesRepository } from './api'

export interface PickedBusiness {
  id: string
  name: string
}

/** Async search-and-pick of a business (server-side search, 8 results). */
export function BusinessPicker({
  value,
  onChange,
  id,
  placeholder = 'Rechercher une entreprise (2 lettres min.)',
}: {
  value: PickedBusiness | null
  onChange: (b: PickedBusiness | null) => void
  id?: string
  placeholder?: string
}) {
  const [term, setTerm] = useState('')
  const debounced = useDebouncedValue(term.trim(), 250)
  const listId = useId()
  const results = useQuery({
    queryKey: ['business-picker', debounced],
    queryFn: () => businessesRepository.list({ search: debounced, sort: 'name_asc' }, { page: 1, pageSize: 8 }),
    enabled: !value && debounced.length >= 2,
    staleTime: 30_000,
  })

  if (value) {
    return (
      <div id={id} className="flex h-9 items-center gap-2.5 rounded-lg border border-brand-500/40 bg-brand-50 px-2.5 dark:bg-brand-500/10">
        <Avatar name={value.name} seed={value.id} size="xs" square />
        <span className="flex-1 truncate text-sm font-semibold text-fg">{value.name}</span>
        <button type="button" onClick={() => onChange(null)} className="text-fg-subtle hover:text-fg" aria-label="Changer d’entreprise">
          <X className="size-4" />
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <SearchInput id={id} value={term} onValueChange={setTerm} placeholder={placeholder} aria-controls={listId} autoComplete="off" />
      {debounced.length >= 2 && (
        <div
          id={listId}
          role="listbox"
          className="absolute top-full z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-border bg-surface p-1 shadow-pop"
        >
          {results.isFetching && !results.data && (
            <div className="flex items-center gap-2 px-3 py-3 text-[13px] text-fg-muted">
              <Spinner /> Recherche…
            </div>
          )}
          {results.data?.items.length === 0 && <p className="px-3 py-3 text-[13px] text-fg-muted">Aucune entreprise trouvée.</p>}
          {results.data?.items.map((b) => (
            <button
              key={b.id}
              type="button"
              role="option"
              aria-selected={false}
              onClick={() => {
                onChange({ id: b.id, name: b.name })
                setTerm('')
              }}
              className={cn('flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-surface-3')}
            >
              <Avatar name={b.name} seed={b.id} size="xs" square />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-fg">{b.name}</span>
                <span className="block truncate text-xs text-fg-subtle">{[b.city, b.planName].filter(Boolean).join(' · ')}</span>
              </span>
              <Check className="size-4 text-transparent" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
