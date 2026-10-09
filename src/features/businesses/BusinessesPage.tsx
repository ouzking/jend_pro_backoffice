import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Building2, FilterX } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, type Column, type SortState } from '@/components/tables/DataTable'
import { Identity } from '@/components/ui/Avatar'
import { Badge, StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input, SearchInput, Select } from '@/components/ui/Field'
import { Pagination } from '@/components/ui/Pagination'
import { blankToUndefined } from '@/core/api/paging'
import { BUSINESS_STATUS, enumOptions, SUBSCRIPTION_STATUS, type BusinessStatus, type SubscriptionStatus } from '@/core/config/domain'
import { paths } from '@/core/router/navigation'
import { formatDate, formatNumber, formatRelative } from '@/core/utils/format'
import { useDebouncedValue, useUrlState } from '@/core/utils/hooks'
import { usePlanOptions } from '@/features/subscriptions/api'
import { useBusinesses } from './api'
import type { BusinessListItem, BusinessSort } from './businesses.repository'

type SortKey = 'created_at' | 'name' | 'last_sale'

const SORT_TO_API: Record<string, BusinessSort> = {
  'created_at:desc': 'created_at_desc',
  'created_at:asc': 'created_at_asc',
  'name:asc': 'name_asc',
  'last_sale:desc': 'last_sale_desc',
}

function sortFromApi(sort: string): SortState<SortKey> {
  const entry = Object.entries(SORT_TO_API).find(([, v]) => v === sort)
  const [key, direction] = (entry?.[0] ?? 'created_at:desc').split(':') as [SortKey, 'asc' | 'desc']
  return { key, direction }
}

const DEFAULTS = { q: '', status: '', plan: '', sub: '', from: '', to: '', sort: 'created_at_desc', page: 1, size: 25 }

const columns: Column<BusinessListItem, SortKey>[] = [
  {
    id: 'name',
    header: 'Entreprise',
    sortKey: 'name',
    sortDirections: ['asc'],
    hideable: false,
    cell: (b) => <Identity name={b.name} secondary={[b.city, b.phone].filter(Boolean).join(' · ') || null} seed={b.id} square />,
  },
  {
    id: 'owner',
    header: 'Propriétaire',
    hideBelow: 'md',
    cell: (b) => (
      <div className="min-w-0">
        <p className="truncate font-medium text-fg">{b.ownerName ?? '—'}</p>
        <p className="truncate text-xs text-fg-subtle">{b.ownerEmail}</p>
      </div>
    ),
  },
  {
    id: 'plan',
    header: 'Abonnement',
    cell: (b) =>
      b.planCode ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone="brand">{b.planName}</Badge>
          <StatusBadge value={b.subscriptionStatus} map={SUBSCRIPTION_STATUS} />
        </div>
      ) : (
        <span className="text-fg-subtle">Aucun</span>
      ),
  },
  { id: 'members', header: 'Membres', align: 'right', hideBelow: 'lg', cell: (b) => formatNumber(b.membersCount) },
  {
    id: 'lastSale',
    header: 'Dernière vente',
    sortKey: 'last_sale',
    sortDirections: ['desc'],
    hideBelow: 'lg',
    cell: (b) => (b.lastSaleAt ? <span title={formatDate(b.lastSaleAt)}>{formatRelative(b.lastSaleAt)}</span> : <span className="text-fg-subtle">Jamais</span>),
  },
  { id: 'createdAt', header: 'Inscription', sortKey: 'created_at', hideBelow: 'sm', cell: (b) => formatDate(b.createdAt) },
  { id: 'status', header: 'Statut', cell: (b) => <StatusBadge value={b.status} map={BUSINESS_STATUS} /> },
]

export default function BusinessesPage() {
  const navigate = useNavigate()
  const [state, update, reset] = useUrlState(DEFAULTS)
  const [search, setSearch] = useState(state.q)
  const debounced = useDebouncedValue(search, 300)
  const planOptions = usePlanOptions()

  useEffect(() => {
    if (debounced !== state.q) update({ q: debounced })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync debounced search only
  }, [debounced])

  const filters = {
    search: blankToUndefined(state.q),
    status: blankToUndefined(state.status as BusinessStatus | ''),
    planCode: blankToUndefined(state.plan),
    subscriptionStatus: blankToUndefined(state.sub as SubscriptionStatus | ''),
    createdFrom: blankToUndefined(state.from),
    createdTo: blankToUndefined(state.to),
    sort: state.sort as BusinessSort,
  }
  const page = { page: state.page, pageSize: state.size }
  const query = useBusinesses(filters, page)
  const hasFilters = Boolean(state.q || state.status || state.plan || state.sub || state.from || state.to)

  return (
    <>
      <PageHeader
        title="Entreprises"
        description="Tous les commerces inscrits sur JËND PRO, leur abonnement et leur activité."
        meta={query.data && <Badge size="md">{formatNumber(query.data.total)} résultat(s)</Badge>}
      />

      <DataTable
        id="businesses"
        columns={columns}
        rows={query.data?.items}
        getRowId={(b) => b.id}
        loading={query.isPending}
        fetching={query.isFetching}
        error={query.error}
        onRetry={() => void query.refetch()}
        onRowClick={(b) => navigate(paths.business(b.id))}
        sort={sortFromApi(state.sort)}
        onSortChange={(s) => update({ sort: SORT_TO_API[`${s.key}:${s.direction}`] ?? 'created_at_desc' })}
        empty={{
          icon: <Building2 />,
          title: hasFilters ? 'Aucune entreprise ne correspond' : 'Aucune entreprise inscrite',
          description: hasFilters ? 'Modifiez ou réinitialisez les filtres.' : undefined,
          action: hasFilters && (
            <Button
              size="sm"
              onClick={() => {
                setSearch('')
                reset()
              }}
            >
              Réinitialiser les filtres
            </Button>
          ),
        }}
        toolbar={
          <>
            <SearchInput
              size="sm"
              className="w-full sm:w-64"
              value={search}
              onValueChange={setSearch}
              placeholder="Nom, ville, téléphone, e-mail…"
              aria-label="Rechercher une entreprise"
            />
            <Select
              size="sm"
              className="w-36"
              value={state.status}
              onValueChange={(v) => update({ status: v })}
              options={enumOptions(BUSINESS_STATUS)}
              placeholder="Tous statuts"
              aria-label="Statut"
            />
            <Select
              size="sm"
              className="w-36"
              value={state.plan}
              onValueChange={(v) => update({ plan: v })}
              options={planOptions}
              placeholder="Tous les plans"
              aria-label="Plan"
            />
            <Select
              size="sm"
              className="w-40"
              value={state.sub}
              onValueChange={(v) => update({ sub: v })}
              options={enumOptions(SUBSCRIPTION_STATUS)}
              placeholder="Tout abonnement"
              aria-label="Statut d’abonnement"
            />
            <div className="flex items-center gap-1.5 text-xs text-fg-subtle">
              <span className="hidden xl:inline">Inscrites du</span>
              <Input
                type="date"
                className="h-8 w-[8.5rem] text-[13px]"
                value={state.from}
                max={state.to || undefined}
                onChange={(e) => update({ from: e.target.value })}
                aria-label="Inscrites à partir du"
              />
              <span>au</span>
              <Input
                type="date"
                className="h-8 w-[8.5rem] text-[13px]"
                value={state.to}
                min={state.from || undefined}
                onChange={(e) => update({ to: e.target.value })}
                aria-label="Inscrites jusqu’au"
              />
            </div>
            {hasFilters && (
              <Button
                size="sm"
                variant="ghost"
                leftIcon={<FilterX className="size-4" />}
                onClick={() => {
                  setSearch('')
                  reset()
                }}
              >
                Effacer
              </Button>
            )}
          </>
        }
        footer={
          query.data &&
          query.data.total > 0 && (
            <Pagination
              page={state.page}
              pageSize={state.size}
              total={query.data.total}
              onPageChange={(p) => update({ page: p })}
              onPageSizeChange={(s) => update({ size: s, page: 1 })}
            />
          )
        }
      />
    </>
  )
}
