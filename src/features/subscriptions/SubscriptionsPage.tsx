import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Check, FilterX, Infinity as InfinityIcon, Lock, Repeat } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, type Column } from '@/components/tables/DataTable'
import { Identity } from '@/components/ui/Avatar'
import { Badge, StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SearchInput, Select } from '@/components/ui/Field'
import { Pagination } from '@/components/ui/Pagination'
import { ErrorState, Skeleton } from '@/components/ui/States'
import { SegmentedControl, Tabs } from '@/components/ui/Tabs'
import { blankToUndefined } from '@/core/api/paging'
import { useAuth } from '@/core/auth'
import { BILLING_PERIOD, BUSINESS_STATUS, enumOptions, SUBSCRIPTION_STATUS, type SubscriptionStatus } from '@/core/config/domain'
import { paths } from '@/core/router/navigation'
import { cn } from '@/core/utils/cn'
import { daysFromNow, formatDate, formatMoney, formatNumber, formatRelative } from '@/core/utils/format'
import { useDebouncedValue, useUrlState } from '@/core/utils/hooks'
import { rangeForPreset } from '@/core/utils/dates'
import { useOverview } from '@/features/analytics/api'
import { usePlanOptions, usePlans, useSubscriptions } from './api'
import { planPricing, subscriptionEndDate, type Plan, type SubscriptionListItem } from './subscriptions.repository'

function EndCell({ s }: { s: SubscriptionListItem }) {
  if (s.endedAt) return <span className="text-fg-subtle">Terminé le {formatDate(s.endedAt)}</span>
  const end = subscriptionEndDate(s)
  if (!end) return <span className="text-fg-subtle">Sans échéance</span>
  const days = daysFromNow(end)
  return (
    <div>
      <p className="font-medium text-fg">{formatDate(end)}</p>
      <p className={cn('text-xs', days < 0 ? 'text-danger' : days <= 7 ? 'text-warning' : 'text-fg-subtle')}>
        {s.status === 'TRIALING' ? 'Fin d’essai ' : 'Échéance '}
        {formatRelative(end)}
      </p>
    </div>
  )
}

const columns: Column<SubscriptionListItem>[] = [
  {
    id: 'business',
    header: 'Entreprise',
    hideable: false,
    cell: (s) => (
      <div className="flex items-center gap-2">
        <Identity name={s.businessName} seed={s.businessId} square />
        {s.businessStatus !== 'ACTIVE' && <StatusBadge value={s.businessStatus} map={BUSINESS_STATUS} />}
      </div>
    ),
  },
  { id: 'plan', header: 'Plan', cell: (s) => <Badge tone="brand">{s.planName}</Badge> },
  {
    id: 'price',
    header: 'Prix',
    align: 'right',
    hideBelow: 'md',
    cell: (s) =>
      s.priceAmount > 0 ? (
        <span>
          {formatMoney(s.priceAmount)}
          <span className="text-fg-subtle"> / {BILLING_PERIOD[s.billingPeriod]}</span>
        </span>
      ) : (
        <span className="text-fg-subtle">—</span>
      ),
  },
  { id: 'status', header: 'Statut', cell: (s) => <StatusBadge value={s.status} map={SUBSCRIPTION_STATUS} /> },
  { id: 'end', header: 'Échéance', cell: (s) => <EndCell s={s} /> },
  {
    id: 'renewal',
    header: 'Renouvellement',
    hideBelow: 'lg',
    cell: (s) =>
      s.cancelAtPeriodEnd ? (
        <Badge tone="warning">Annulation prévue</Badge>
      ) : s.externalReference ? (
        <span className="font-mono text-xs text-fg-subtle">{s.externalReference}</span>
      ) : (
        <span className="text-fg-subtle">—</span>
      ),
  },
  { id: 'created', header: 'Début', hideBelow: 'xl', defaultHidden: true, cell: (s) => formatDate(s.currentPeriodStart ?? s.createdAt) },
]

function Limit({ label, value }: { label: string; value: number | null }) {
  return (
    <li className="flex items-center justify-between text-[13px]">
      <span className="text-fg-muted">{label}</span>
      <span className="flex items-center gap-1 font-semibold text-fg tabular">
        {value === null ? (
          <>
            <InfinityIcon className="size-4" /> Illimité
          </>
        ) : (
          formatNumber(value)
        )}
      </span>
    </li>
  )
}

function PlanCard({ plan, current }: { plan: Plan; current: number | undefined }) {
  const features = Object.entries(plan.features)
  const pricing = planPricing(plan)
  return (
    <Card className="relative flex flex-col p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-[11px] font-semibold tracking-wider text-fg-subtle">{plan.code}</p>
          <h3 className="mt-0.5 text-lg font-extrabold tracking-tight text-fg">{plan.name}</h3>
        </div>
        {!plan.isPublic && (
          <Badge tone="neutral" title="Non proposé à l’inscription">
            <Lock className="size-3" /> Privé
          </Badge>
        )}
      </div>
      {plan.description && <p className="mt-1 text-[13px] text-fg-muted">{plan.description}</p>}
      <p className="mt-4 text-2xl font-extrabold tracking-tight text-fg">{pricing === 'quote' ? 'Sur devis' : formatMoney(plan.priceAmount)}</p>
      <p className="text-xs font-medium text-fg-subtle">
        {pricing === 'paid' ? `par ${BILLING_PERIOD[plan.billingPeriod]}` : pricing === 'free' ? 'sans engagement' : 'tarif négocié'}
      </p>
      <ul className="mt-4 space-y-2 border-t border-border pt-4">
        <Limit label="Membres" value={plan.limits.maxMembers} />
        <Limit label="Produits" value={plan.limits.maxProducts} />
        <Limit label="Emplacements" value={plan.limits.maxLocations} />
      </ul>
      {features.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {features.map(([k, v]) => (
            <li key={k} className="flex items-center gap-2 text-[13px] text-fg-muted">
              <Check className="size-3.5 text-success" />
              {k}
              {typeof v === 'string' || typeof v === 'number' ? ` : ${v}` : ''}
            </li>
          ))}
        </ul>
      )}
      {current !== undefined && (
        <p className="mt-auto pt-4 text-xs text-fg-subtle">
          <span className="font-bold text-fg tabular">{formatNumber(current)}</span> abonnement(s) en cours
        </p>
      )}
    </Card>
  )
}

function PlansTab() {
  const { can } = useAuth()
  const plans = usePlans()
  const overview = useOverview(rangeForPreset('7d'), can('analytics.read'))
  if (plans.isPending)
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-80 rounded-2xl" />
        ))}
      </div>
    )
  if (plans.isError)
    return (
      <Card>
        <ErrorState error={plans.error} onRetry={() => void plans.refetch()} />
      </Card>
    )
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {plans.data.map((p) => (
          <PlanCard key={p.id} plan={p} current={overview.data?.subscriptions.byPlan[p.code] ?? (overview.data ? 0 : undefined)} />
        ))}
      </div>
      <p className="mt-4 flex items-center gap-2 text-xs text-fg-subtle">
        <Lock className="size-3.5" /> Le catalogue (prix, limites, fonctionnalités) est versionné dans les migrations du backend : toute modification est revue
        et testée avant déploiement.
      </p>
    </>
  )
}

const DEFAULTS = { tab: 'list', q: '', status: '', plan: '', ending: '', history: '', page: 1, size: 25 }

export default function SubscriptionsPage() {
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
    status: blankToUndefined(state.status as SubscriptionStatus | ''),
    planCode: blankToUndefined(state.plan),
    endingWithinDays: state.ending ? Number(state.ending) : undefined,
    currentOnly: state.history !== '1',
  }
  const query = useSubscriptions(filters, { page: state.page, pageSize: state.size })
  const hasFilters = Boolean(state.q || state.status || state.plan || state.ending || state.history)

  return (
    <>
      <PageHeader title="Abonnements" description="Essais, abonnements payants, échéances et historique des plans." />
      <Tabs
        className="mb-5"
        value={state.tab as 'list' | 'plans'}
        onChange={(t) => update({ tab: t })}
        items={[
          { value: 'list', label: 'Abonnements', count: query.data?.total ?? null },
          { value: 'plans', label: 'Plans & tarifs' },
        ]}
      />
      {state.tab === 'plans' ? (
        <PlansTab />
      ) : (
        <DataTable
          id="subscriptions"
          columns={columns}
          rows={query.data?.items}
          getRowId={(s) => s.id}
          loading={query.isPending}
          fetching={query.isFetching}
          error={query.error}
          onRetry={() => void query.refetch()}
          onRowClick={(s) => navigate(`${paths.business(s.businessId)}?tab=subscription`)}
          empty={{
            icon: <Repeat />,
            title: 'Aucun abonnement ne correspond',
            action: hasFilters && (
              <Button
                size="sm"
                onClick={() => {
                  setSearch('')
                  reset()
                }}
              >
                Réinitialiser
              </Button>
            ),
          }}
          toolbar={
            <>
              <SearchInput
                size="sm"
                className="w-full sm:w-56"
                value={search}
                onValueChange={setSearch}
                placeholder="Entreprise…"
                aria-label="Rechercher une entreprise"
              />
              <Select
                size="sm"
                className="w-36"
                value={state.status}
                onValueChange={(v) => update({ status: v })}
                options={enumOptions(SUBSCRIPTION_STATUS)}
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
              <SegmentedControl
                label="Échéance"
                value={state.ending || 'all'}
                onChange={(v) => update({ ending: v === 'all' ? '' : v })}
                options={[
                  { value: 'all', label: 'Toutes' },
                  { value: '7', label: '≤ 7 j' },
                  { value: '30', label: '≤ 30 j' },
                ]}
              />
              <label className="flex items-center gap-2 text-[13px] font-medium text-fg-muted">
                <input
                  type="checkbox"
                  className="size-4 accent-brand-600"
                  checked={state.history === '1'}
                  onChange={(e) => update({ history: e.target.checked ? '1' : '' })}
                />
                Inclure l’historique
              </label>
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
      )}
    </>
  )
}
