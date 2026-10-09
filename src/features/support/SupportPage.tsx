import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { Inbox, LifeBuoy, MessageSquare } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatusBadge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { SearchInput, Select } from '@/components/ui/Field'
import { Pagination } from '@/components/ui/Pagination'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States'
import { Tabs } from '@/components/ui/Tabs'
import { blankToUndefined } from '@/core/api/paging'
import { useAuth } from '@/core/auth'
import { enumOptions, TICKET_PRIORITY, TICKET_STATUS, type TicketPriority, type TicketStatus } from '@/core/config/domain'
import { cn } from '@/core/utils/cn'
import { formatRelative } from '@/core/utils/format'
import { useDebouncedValue, useUrlState } from '@/core/utils/hooks'
import { useTickets } from './api'
import type { TicketFilters } from './support.repository'
import { TicketConversation } from './TicketConversation'

type Queue = 'open' | 'mine' | 'unassigned' | 'all'

const PRIORITY_BAR: Record<TicketPriority, string> = {
  URGENT: 'bg-danger',
  HIGH: 'bg-warning',
  NORMAL: 'bg-info/60',
  LOW: 'bg-fg-subtle/40',
}

const DEFAULTS = { queue: 'open', q: '', status: '', priority: '', page: 1, size: 25 }

export default function SupportPage() {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const [state, update] = useUrlState(DEFAULTS)
  const [search, setSearch] = useState(state.q)
  const debounced = useDebouncedValue(search, 300)
  const selected = params.get('ticket')
  // Legacy deep link from the topbar: ?open=1
  const queue = (params.get('open') === '1' ? 'open' : state.queue) as Queue

  useEffect(() => {
    if (debounced !== state.q) update({ q: debounced })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync debounced search only
  }, [debounced])

  const filters: TicketFilters = {
    search: blankToUndefined(state.q),
    status: blankToUndefined(state.status as TicketStatus | ''),
    priority: blankToUndefined(state.priority as TicketPriority | ''),
    openOnly: queue === 'open' || queue === 'mine' || queue === 'unassigned',
    assignedTo: queue === 'mine' ? user?.id : undefined,
    unassigned: queue === 'unassigned',
  }
  const query = useTickets(filters, { page: state.page, pageSize: state.size }, { refetchInterval: 60_000 })

  const select = (id: string | null) =>
    setParams((prev) => {
      const n = new URLSearchParams(prev)
      if (id) n.set('ticket', id)
      else n.delete('ticket')
      return n
    })

  return (
    <>
      <PageHeader title="Support" description="Demandes des commerçants : priorisez, assignez, répondez." />
      <Card className="flex h-[calc(100dvh-13.5rem)] min-h-[520px] overflow-hidden">
        <section
          aria-label="Liste des tickets"
          className={cn('flex w-full min-w-0 flex-col border-border lg:w-[400px] lg:shrink-0 lg:border-r', selected && 'hidden lg:flex')}
        >
          <div className="space-y-2.5 border-b border-border p-3">
            <Tabs<Queue>
              className="-mx-3 -mt-1 px-1"
              value={queue}
              onChange={(q) => {
                setParams((prev) => {
                  const n = new URLSearchParams(prev)
                  n.delete('open')
                  return n
                })
                update({ queue: q })
              }}
              items={[
                { value: 'open', label: 'À traiter' },
                { value: 'mine', label: 'Mes tickets' },
                { value: 'unassigned', label: 'Non assignés' },
                { value: 'all', label: 'Tous' },
              ]}
            />
            <SearchInput size="sm" value={search} onValueChange={setSearch} placeholder="Sujet, entreprise, e-mail, n°…" aria-label="Rechercher un ticket" />
            <div className="flex gap-2">
              <Select
                size="sm"
                className="flex-1"
                value={state.status}
                onValueChange={(v) => update({ status: v })}
                options={enumOptions(TICKET_STATUS)}
                placeholder="Tous statuts"
                aria-label="Statut"
              />
              <Select
                size="sm"
                className="flex-1"
                value={state.priority}
                onValueChange={(v) => update({ priority: v })}
                options={enumOptions(TICKET_PRIORITY)}
                placeholder="Toutes priorités"
                aria-label="Priorité"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {query.isPending ? (
              <div className="space-y-px">
                {Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className="p-4">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="mt-2 h-3 w-1/2" />
                  </div>
                ))}
              </div>
            ) : query.isError ? (
              <ErrorState error={query.error} onRetry={() => void query.refetch()} compact />
            ) : query.data.items.length === 0 ? (
              <EmptyState
                compact
                icon={<Inbox />}
                title={queue === 'all' ? 'Aucun ticket' : 'Rien à traiter'}
                description={queue === 'all' ? undefined : 'Tous les tickets de cette file sont traités.'}
              />
            ) : (
              <ul role="listbox" aria-label="Tickets">
                {query.data.items.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={t.id === selected}
                      onClick={() => select(t.id)}
                      className={cn(
                        'relative flex w-full flex-col gap-1.5 border-b border-border py-3 pr-4 pl-5 text-left transition-colors',
                        t.id === selected ? 'bg-brand-50 dark:bg-brand-500/10' : 'hover:bg-surface-2',
                      )}
                    >
                      <span className={cn('absolute top-3 bottom-3 left-0 w-[3px] rounded-r-full', PRIORITY_BAR[t.priority])} aria-hidden />
                      <span className="flex items-center gap-2">
                        <span className="font-mono text-[11px] text-fg-subtle">#{t.number}</span>
                        <span className="ml-auto text-[11px] text-fg-subtle">{formatRelative(t.lastMessageAt)}</span>
                      </span>
                      <span className="line-clamp-2 text-[13px] leading-snug font-semibold text-fg">{t.subject}</span>
                      <span className="flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate text-xs text-fg-muted">{t.businessName ?? t.requesterName ?? t.requesterEmail}</span>
                        <span className="flex items-center gap-1 text-[11px] text-fg-subtle">
                          <MessageSquare className="size-3" />
                          {t.messagesCount}
                        </span>
                        <StatusBadge value={t.status} map={TICKET_STATUS} />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {query.data && query.data.total > state.size && (
            <div className="border-t border-border">
              <Pagination page={state.page} pageSize={state.size} total={query.data.total} onPageChange={(p) => update({ page: p })} />
            </div>
          )}
        </section>

        <section aria-label="Conversation" className={cn('min-w-0 flex-1', !selected && 'hidden lg:block')}>
          {selected ? (
            <TicketConversation key={selected} ticketId={selected} onBack={() => select(null)} />
          ) : (
            <div className="grid h-full place-items-center">
              <EmptyState icon={<LifeBuoy />} title="Sélectionnez un ticket" description="La conversation, l’historique et les actions s’affichent ici." />
            </div>
          )}
        </section>
      </Card>
    </>
  )
}
