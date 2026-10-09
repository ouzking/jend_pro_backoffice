import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { CreditCard, FilterX, Info, Plus, Receipt, TrendingUp, Wallet } from 'lucide-react'
import { relativeDelta } from '@/components/charts/series'
import { StatTile } from '@/components/charts/StatTile'
import { ChartWithTable } from '@/components/charts/TimeSeriesChart'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, type Column } from '@/components/tables/DataTable'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Input, SearchInput, Select } from '@/components/ui/Field'
import { Pagination } from '@/components/ui/Pagination'
import { PeriodPicker } from '@/components/ui/PeriodPicker'
import { usePeriod } from '@/components/ui/usePeriod'
import { ErrorState, Skeleton } from '@/components/ui/States'
import { blankToUndefined } from '@/core/api/paging'
import { useAuth } from '@/core/auth'
import { PAYMENT_PROVIDER_LABEL } from '@/core/config/domain'
import { paths } from '@/core/router/navigation'
import { previousRange } from '@/core/utils/dates'
import { formatDateTime, formatMoney, formatNumber } from '@/core/utils/format'
import { useDebouncedValue, useUrlState } from '@/core/utils/hooks'
import { useOverview, useTimeseries } from '@/features/analytics/api'
import { useBillingEvents } from './api'
import { ManualPaymentModal } from './ManualPaymentModal'
import type { BillingEvent } from './payments.repository'

const columns: Column<BillingEvent>[] = [
  { id: 'date', header: 'Date', hideable: false, cell: (e) => <span className="whitespace-nowrap">{formatDateTime(e.processedAt)}</span> },
  {
    id: 'business',
    header: 'Entreprise',
    cell: (e) => (
      <Link
        to={paths.business(e.businessId)}
        onClick={(ev) => ev.stopPropagation()}
        className="flex items-center gap-2.5 font-semibold text-fg hover:text-brand-600"
      >
        <Avatar name={e.businessName} seed={e.businessId} size="sm" square />
        <span className="truncate">{e.businessName}</span>
      </Link>
    ),
  },
  {
    id: 'plan',
    header: 'Plan',
    cell: (e) => (
      <span>
        <Badge tone="brand">{e.planCode}</Badge> <span className="text-xs text-fg-subtle">× {e.months} mois</span>
      </span>
    ),
  },
  { id: 'method', header: 'Méthode', hideBelow: 'md', cell: (e) => PAYMENT_PROVIDER_LABEL[e.provider] ?? e.provider },
  { id: 'reference', header: 'Référence', hideBelow: 'lg', cell: (e) => <span className="font-mono text-xs text-fg-muted">{e.eventId}</span> },
  {
    id: 'status',
    header: 'Statut',
    hideBelow: 'sm',
    cell: () => (
      <Badge tone="success" dot>
        Confirmé
      </Badge>
    ),
  },
  { id: 'amount', header: 'Montant', align: 'right', hideable: false, cell: (e) => <span className="font-semibold">{formatMoney(e.amount)}</span> },
]

const DEFAULTS = { q: '', provider: '', from: '', to: '', page: 1, size: 25 }

export default function PaymentsPage() {
  const { can } = useAuth()
  const { preset, range, granularity, setPreset } = usePeriod('90d')
  const canAnalytics = can('analytics.read')
  const overview = useOverview(range, canAnalytics)
  const previous = useOverview(previousRange(range), canAnalytics)
  const series = useTimeseries(range, granularity, canAnalytics)
  const [state, update, reset] = useUrlState(DEFAULTS)
  const [search, setSearch] = useState(state.q)
  const debounced = useDebouncedValue(search, 300)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    if (debounced !== state.q) update({ q: debounced })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync debounced search only
  }, [debounced])

  const query = useBillingEvents(
    { search: blankToUndefined(state.q), provider: blankToUndefined(state.provider), from: blankToUndefined(state.from), to: blankToUndefined(state.to) },
    { page: state.page, pageSize: state.size },
  )
  const o = overview.data
  const hasFilters = Boolean(state.q || state.provider || state.from || state.to)

  return (
    <>
      <PageHeader
        title="Paiements"
        description="Paiements d’abonnement confirmés : webhooks des opérateurs et encaissements manuels."
        actions={
          <>
            {canAnalytics && <PeriodPicker preset={preset} range={range} onChange={setPreset} />}
            {can('billing.manage') && (
              <Button variant="primary" leftIcon={<Plus className="size-4" />} onClick={() => setModalOpen(true)}>
                Paiement manuel
              </Button>
            )}
          </>
        }
      />

      {canAnalytics && (
        <>
          <section className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              emphasis
              label="Encaissé sur la période"
              value={formatMoney(o?.revenue.collected)}
              icon={<Wallet />}
              loading={overview.isPending}
              delta={relativeDelta(o?.revenue.collected, previous.data?.revenue.collected)}
            />
            <StatTile
              label="Paiements confirmés"
              value={formatNumber(o?.revenue.paymentsCount)}
              icon={<TrendingUp />}
              loading={overview.isPending}
              delta={relativeDelta(o?.revenue.paymentsCount, previous.data?.revenue.paymentsCount)}
              definition="Nombre de paiements d’abonnement confirmés sur la période, comparé à la période précédente de même durée."
            />
            <StatTile
              label="MRR"
              value={formatMoney(o?.revenue.mrr)}
              icon={<Receipt />}
              loading={overview.isPending}
              definition="Somme des prix catalogue mensuels des abonnements payés en cours."
              hint={o && `${formatNumber(o.revenue.payingBusinesses)} entreprise(s) payante(s)`}
            />
            <StatTile
              label="ARPU"
              value={formatMoney(o?.revenue.arpu)}
              icon={<CreditCard />}
              loading={overview.isPending}
              definition="Revenu mensuel moyen par entreprise payante (MRR ÷ entreprises payantes)."
            />
          </section>
          <Card className="mb-6">
            <CardHeader title="Encaissements" description="Montants confirmés par période" />
            <CardBody>
              {series.isPending ? (
                <Skeleton className="h-[220px] w-full rounded-xl" />
              ) : series.isError ? (
                <ErrorState error={series.error} onRetry={() => void series.refetch()} compact />
              ) : (
                <ChartWithTable
                  kind="bar"
                  height={220}
                  label="Encaissements par période"
                  data={series.data.map((d) => ({ bucket: d.bucket, collected: d.collected }))}
                  series={[{ key: 'collected', label: 'Encaissé (FCFA)', color: 0 }]}
                  granularity={granularity}
                  formatValue={(v) => formatMoney(v)}
                />
              )}
            </CardBody>
          </Card>
        </>
      )}

      <p className="mb-3 flex items-start gap-2 text-xs text-fg-subtle">
        <Info className="mt-px size-3.5 shrink-0" />
        Seuls les paiements confirmés sont enregistrés en V1 (aucun état « en attente », « échoué » ou « remboursé »). Une référence n’est jamais comptée deux
        fois.
      </p>

      <DataTable
        id="payments"
        columns={columns}
        rows={query.data?.items}
        getRowId={(e) => e.id}
        loading={query.isPending}
        fetching={query.isFetching}
        error={query.error}
        onRetry={() => void query.refetch()}
        empty={{
          icon: <CreditCard />,
          title: hasFilters ? 'Aucun paiement ne correspond' : 'Aucun paiement enregistré',
          description: hasFilters ? undefined : 'Les paiements apparaîtront ici dès la première confirmation.',
          action: can('billing.manage') && !hasFilters && (
            <Button size="sm" variant="primary" onClick={() => setModalOpen(true)}>
              Enregistrer un paiement
            </Button>
          ),
        }}
        toolbar={
          <>
            <SearchInput
              size="sm"
              className="w-full sm:w-60"
              value={search}
              onValueChange={setSearch}
              placeholder="Entreprise ou référence…"
              aria-label="Rechercher un paiement"
            />
            <Select
              size="sm"
              className="w-44"
              value={state.provider}
              onValueChange={(v) => update({ provider: v })}
              options={[{ value: 'MANUAL', label: 'Paiements manuels' }]}
              placeholder="Toutes méthodes"
              aria-label="Méthode"
            />
            <div className="flex items-center gap-1.5 text-xs text-fg-subtle">
              <span>Du</span>
              <Input
                type="date"
                className="h-8 w-[8.5rem] text-[13px]"
                value={state.from}
                max={state.to || undefined}
                onChange={(e) => update({ from: e.target.value })}
                aria-label="À partir du"
              />
              <span>au</span>
              <Input
                type="date"
                className="h-8 w-[8.5rem] text-[13px]"
                value={state.to}
                min={state.from || undefined}
                onChange={(e) => update({ to: e.target.value })}
                aria-label="Jusqu’au"
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
      {can('billing.manage') && <ManualPaymentModal open={modalOpen} onClose={() => setModalOpen(false)} />}
    </>
  )
}
