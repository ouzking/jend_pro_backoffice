import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router'
import { ArrowRight, Building2, Coins, LifeBuoy, ScrollText, Sparkles, TrendingUp, UserPlus, Wallet } from 'lucide-react'
import { Distribution } from '@/components/charts/Distribution'
import { relativeDelta } from '@/components/charts/series'
import { StatTile } from '@/components/charts/StatTile'
import { ChartWithTable } from '@/components/charts/TimeSeriesChart'
import { PageHeader } from '@/components/layout/PageHeader'
import { Avatar } from '@/components/ui/Avatar'
import { StatusBadge } from '@/components/ui/Badge'
import { buttonClass } from '@/components/ui/buttonStyles'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { PeriodPicker } from '@/components/ui/PeriodPicker'
import { usePeriod } from '@/components/ui/usePeriod'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States'
import { useAuth } from '@/core/auth'
import { BUSINESS_STATUS, SUBSCRIPTION_STATUS, TICKET_PRIORITY, type SubscriptionStatus } from '@/core/config/domain'
import { paths } from '@/core/router/navigation'
import { formatCompact, formatDate, formatMoney, formatNumber, formatPercent, formatRelative } from '@/core/utils/format'
import { previousRange } from '@/core/utils/dates'
import { useOverview, useTimeseries } from '@/features/analytics/api'
import { ratio } from '@/features/analytics/analytics.repository'
import { useAuditLog } from '@/features/audit/api'
import { AuditFeed } from '@/features/audit/AuditFeed'
import { useBusinesses } from '@/features/businesses/api'
import { planColorSlot, usePlans } from '@/features/subscriptions/api'
import { useTickets } from '@/features/support/api'

function greeting(): string {
  const hour = Number(new Intl.DateTimeFormat('fr-FR', { hour: 'numeric', timeZone: 'Africa/Dakar' }).format(new Date()))
  return hour < 18 ? 'Bonjour' : 'Bonsoir'
}

const CURRENT_STATUSES: SubscriptionStatus[] = ['TRIALING', 'ACTIVE', 'PAST_DUE']

export default function DashboardPage() {
  const { user, can } = useAuth()
  const navigate = useNavigate()
  const { preset, range, granularity, setPreset } = usePeriod('30d')
  const canAnalytics = can('analytics.read')

  const overview = useOverview(range, canAnalytics)
  const previous = useOverview(previousRange(range), canAnalytics)
  const series = useTimeseries(range, granularity, canAnalytics)
  const plans = usePlans()
  const tickets = useTickets({ openOnly: true }, { page: 1, pageSize: 5 }, { enabled: can('support.read') })
  const recentBusinesses = useBusinesses({ sort: 'created_at_desc' }, { page: 1, pageSize: 5 })
  const audit = useAuditLog({}, { limit: 8, enabled: can('audit.read') })

  const o = overview.data
  const p = previous.data
  const firstName = user?.fullName?.split(' ')[0]

  const planItems = useMemo(
    () =>
      (plans.data ?? [])
        .map((plan) => ({ key: plan.code, label: plan.name, value: o?.subscriptions.byPlan[plan.code] ?? 0, color: planColorSlot(plans.data, plan.code) }))
        .filter((i) => i.value > 0 || (o && Object.keys(o.subscriptions.byPlan).length === 0)),
    [plans.data, o],
  )

  return (
    <>
      <PageHeader
        title={`${greeting()}${firstName ? `, ${firstName}` : ''}`}
        description="Vue d’ensemble de la plateforme JËND PRO."
        actions={canAnalytics && <PeriodPicker preset={preset} range={range} onChange={setPreset} />}
      />

      {canAnalytics && (
        <>
          {overview.isError ? (
            <Card className="mb-6">
              <ErrorState error={overview.error} onRetry={() => void overview.refetch()} compact />
            </Card>
          ) : (
            <section aria-label="Indicateurs clés" className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatTile
                emphasis
                label="MRR"
                definition="Revenu mensuel récurrent : somme des prix catalogue mensuels des abonnements payés en cours (plans annuels ÷ 12)."
                value={formatMoney(o?.revenue.mrr)}
                icon={<TrendingUp />}
                loading={overview.isPending}
                hint={o ? `ARR ${formatCompact(o.revenue.arr)} FCFA · ${formatNumber(o.revenue.payingBusinesses)} payantes` : undefined}
              />
              <StatTile
                label="Entreprises actives"
                definition="Entreprises ayant enregistré au moins une vente sur la période."
                value={formatNumber(o?.businesses.withSales)}
                icon={<Building2 />}
                loading={overview.isPending}
                delta={relativeDelta(o?.businesses.withSales, p?.businesses.withSales)}
                footer={
                  o && (
                    <p className="text-xs text-fg-subtle">
                      sur {formatNumber(o.businesses.total)} entreprises · {formatNumber(o.businesses.suspended)} suspendue(s)
                    </p>
                  )
                }
              />
              <StatTile
                label="Nouveaux comptes"
                definition="Entreprises créées sur la période (et nouveaux utilisateurs inscrits)."
                value={formatNumber(o?.businesses.new)}
                icon={<UserPlus />}
                loading={overview.isPending}
                delta={relativeDelta(o?.businesses.new, p?.businesses.new)}
                footer={
                  o && (
                    <p className="text-xs text-fg-subtle">
                      {formatNumber(o.users.new)} nouveaux utilisateurs · activation {formatPercent(ratio(o.businesses.newActivated, o.businesses.new))}
                    </p>
                  )
                }
              />
              <StatTile
                label="Encaissé"
                definition="Paiements d’abonnement confirmés sur la période (Wave, Orange Money, paiements manuels)."
                value={formatMoney(o?.revenue.collected)}
                icon={<Wallet />}
                loading={overview.isPending}
                delta={relativeDelta(o?.revenue.collected, p?.revenue.collected)}
                footer={
                  o && (
                    <p className="text-xs text-fg-subtle">
                      {formatNumber(o.revenue.paymentsCount)} paiement(s) · ARPU {formatMoney(o.revenue.arpu)}
                    </p>
                  )
                }
              />
            </section>
          )}

          <section className="mb-6 grid grid-cols-1 items-start gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader title="Croissance" description="Nouvelles entreprises et nouveaux utilisateurs" />
              <CardBody>
                {series.isPending ? (
                  <Skeleton className="h-[240px] w-full rounded-xl" />
                ) : series.isError ? (
                  <ErrorState error={series.error} onRetry={() => void series.refetch()} compact />
                ) : (
                  <ChartWithTable
                    label="Croissance : nouvelles entreprises et nouveaux utilisateurs"
                    data={series.data.map((d) => ({ bucket: d.bucket, newBusinesses: d.newBusinesses, newUsers: d.newUsers }))}
                    series={[
                      { key: 'newBusinesses', label: 'Entreprises', color: 0 },
                      { key: 'newUsers', label: 'Utilisateurs', color: 1 },
                    ]}
                    granularity={granularity}
                    formatValue={formatNumber}
                  />
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Abonnements en cours" description="Répartition par plan" />
              <CardBody>
                {overview.isPending || plans.isPending ? (
                  <Skeleton className="h-48 w-full rounded-xl" />
                ) : (
                  <>
                    <Distribution label="Abonnements en cours par plan" items={planItems} />
                    <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
                      {CURRENT_STATUSES.map((s) => (
                        <Link
                          key={s}
                          to={`${paths.subscriptions}?status=${s}`}
                          className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-1.5 text-xs transition-colors hover:border-border-strong"
                        >
                          <StatusBadge value={s} map={SUBSCRIPTION_STATUS} />
                          <span className="font-bold text-fg tabular">{formatNumber(o?.subscriptions.byStatus[s] ?? 0)}</span>
                        </Link>
                      ))}
                    </div>
                  </>
                )}
              </CardBody>
            </Card>
          </section>

          <section className="mb-6 grid grid-cols-1 items-start gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader title="Revenus encaissés" description="Paiements d’abonnement confirmés" icon={<Coins />} />
              <CardBody>
                {series.isPending ? (
                  <Skeleton className="h-[220px] w-full rounded-xl" />
                ) : series.isError ? null : (
                  <ChartWithTable
                    kind="bar"
                    height={220}
                    label="Revenus encaissés par période"
                    data={series.data.map((d) => ({ bucket: d.bucket, collected: d.collected }))}
                    series={[{ key: 'collected', label: 'Encaissé (FCFA)', color: 0 }]}
                    granularity={granularity}
                    formatValue={(v) => formatMoney(v)}
                  />
                )}
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Santé du portefeuille" description="À surveiller" icon={<Sparkles />} />
              <CardBody className="space-y-1">
                {[
                  { label: 'Essais se terminant sous 7 j', value: o?.subscriptions.trialsEnding7d, to: `${paths.subscriptions}?status=TRIALING&ending=7` },
                  { label: 'Abonnements impayés', value: o?.subscriptions.byStatus.PAST_DUE ?? 0, to: `${paths.subscriptions}?status=PAST_DUE` },
                  { label: 'Abonnements perdus (churn)', value: o?.subscriptions.churned, to: `${paths.subscriptions}?history=1&status=EXPIRED` },
                  { label: 'Essais expirés sans paiement', value: o?.subscriptions.trialExpired, to: `${paths.subscriptions}?history=1&status=EXPIRED` },
                  { label: 'Entreprises suspendues', value: o?.businesses.suspended, to: `${paths.businesses}?status=SUSPENDED` },
                ].map((row) => (
                  <Link
                    key={row.label}
                    to={row.to}
                    className="group flex items-center justify-between rounded-lg px-2 py-2.5 transition-colors hover:bg-surface-2"
                  >
                    <span className="text-[13px] text-fg-muted group-hover:text-fg">{row.label}</span>
                    <span className="flex items-center gap-2 text-[15px] font-bold text-fg tabular">
                      {overview.isPending ? <Skeleton className="h-4 w-6" /> : formatNumber(row.value)}
                      <ArrowRight className="size-3.5 text-fg-subtle opacity-0 transition-opacity group-hover:opacity-100" />
                    </span>
                  </Link>
                ))}
              </CardBody>
            </Card>
          </section>
        </>
      )}

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {can('support.read') && (
          <Card>
            <CardHeader
              title="Support à traiter"
              icon={<LifeBuoy />}
              actions={
                <Link to={`${paths.support}?open=1`} className={buttonClass('ghost', 'xs')}>
                  Tout voir <ArrowRight className="size-3.5" />
                </Link>
              }
            />
            <CardBody>
              {tickets.isPending ? (
                <Skeleton className="h-40 w-full rounded-xl" />
              ) : tickets.isError ? (
                <ErrorState error={tickets.error} onRetry={() => void tickets.refetch()} compact />
              ) : tickets.data.items.length === 0 ? (
                <EmptyState compact icon={<LifeBuoy />} title="Aucun ticket ouvert" description="La file de support est vide." />
              ) : (
                <ul className="-mx-2 space-y-0.5">
                  {tickets.data.items.map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => navigate(paths.ticket(t.id))}
                        className="flex w-full items-start gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-surface-2"
                      >
                        <StatusBadge value={t.priority} map={TICKET_PRIORITY} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-semibold text-fg">{t.subject}</span>
                          <span className="block truncate text-xs text-fg-subtle">
                            #{t.number} · {t.businessName ?? t.requesterEmail} · {formatRelative(t.lastMessageAt)}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        )}

        <Card>
          <CardHeader
            title="Dernières inscriptions"
            icon={<Building2 />}
            actions={
              <Link to={paths.businesses} className={buttonClass('ghost', 'xs')}>
                Tout voir <ArrowRight className="size-3.5" />
              </Link>
            }
          />
          <CardBody>
            {recentBusinesses.isPending ? (
              <Skeleton className="h-40 w-full rounded-xl" />
            ) : recentBusinesses.isError ? (
              <ErrorState error={recentBusinesses.error} onRetry={() => void recentBusinesses.refetch()} compact />
            ) : recentBusinesses.data.items.length === 0 ? (
              <EmptyState compact title="Aucune entreprise" />
            ) : (
              <ul className="-mx-2 space-y-0.5">
                {recentBusinesses.data.items.map((b) => (
                  <li key={b.id}>
                    <Link to={paths.business(b.id)} className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-surface-2">
                      <Avatar name={b.name} seed={b.id} size="sm" square />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-semibold text-fg">{b.name}</span>
                        <span className="block truncate text-xs text-fg-subtle">
                          {b.city ?? '—'} · {formatDate(b.createdAt)}
                        </span>
                      </span>
                      <StatusBadge value={b.status} map={BUSINESS_STATUS} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        {can('audit.read') && (
          <Card>
            <CardHeader
              title="Activité récente"
              icon={<ScrollText />}
              actions={
                <Link to={paths.audit} className={buttonClass('ghost', 'xs')}>
                  Journal <ArrowRight className="size-3.5" />
                </Link>
              }
            />
            <CardBody>
              {audit.isError ? (
                <ErrorState error={audit.error} onRetry={() => void audit.refetch()} compact />
              ) : (
                <AuditFeed entries={audit.data?.pages[0]?.entries} loading={audit.isPending} />
              )}
            </CardBody>
          </Card>
        )}
      </section>
    </>
  )
}
