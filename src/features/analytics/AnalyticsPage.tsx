import type { ReactNode } from 'react'
import { Activity, Building2, CircleDollarSign, Gauge, Hourglass, Info, Repeat, ShoppingBag, TrendingDown, TrendingUp, UserPlus, Users } from 'lucide-react'
import { Distribution } from '@/components/charts/Distribution'
import { relativeDelta } from '@/components/charts/series'
import { StatTile } from '@/components/charts/StatTile'
import { ChartWithTable } from '@/components/charts/TimeSeriesChart'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { PeriodPicker } from '@/components/ui/PeriodPicker'
import { usePeriod } from '@/components/ui/usePeriod'
import { ErrorState, Skeleton } from '@/components/ui/States'
import { SUBSCRIPTION_STATUS, type SubscriptionStatus } from '@/core/config/domain'
import { previousRange } from '@/core/utils/dates'
import { formatCompact, formatMoney, formatNumber, formatPercent } from '@/core/utils/format'
import { planColorSlot, usePlans } from '@/features/subscriptions/api'
import { ratio } from './analytics.repository'
import { useOverview, useTimeseries } from './api'

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="mb-8">
      <div className="mb-3">
        <h2 className="text-[15px] font-bold tracking-tight text-fg">{title}</h2>
        {description && <p className="text-[13px] text-fg-muted">{description}</p>}
      </div>
      {children}
    </section>
  )
}

const STATUS_SLOT: Record<SubscriptionStatus, 0 | 1 | 2 | 3 | 4> = { TRIALING: 4, ACTIVE: 0, PAST_DUE: 2, CANCELLED: 1, EXPIRED: 3 }

export default function AnalyticsPage() {
  const { preset, range, granularity, setPreset } = usePeriod('90d')
  const overview = useOverview(range)
  const previous = useOverview(previousRange(range))
  const series = useTimeseries(range, granularity)
  const plans = usePlans()
  const o = overview.data
  const p = previous.data
  const loading = overview.isPending

  const chart = (title: string, description: string, body: (data: NonNullable<typeof series.data>) => ReactNode) => (
    <Card>
      <CardHeader title={title} description={description} />
      <CardBody>
        {series.isPending ? (
          <Skeleton className="h-[220px] w-full rounded-xl" />
        ) : series.isError ? (
          <ErrorState error={series.error} onRetry={() => void series.refetch()} compact />
        ) : (
          body(series.data)
        )}
      </CardBody>
    </Card>
  )

  if (overview.isError) {
    return (
      <>
        <PageHeader title="Analytics" actions={<PeriodPicker preset={preset} range={range} onChange={setPreset} />} />
        <Card>
          <ErrorState error={overview.error} onRetry={() => void overview.refetch()} />
        </Card>
      </>
    )
  }

  const churnBase = o ? o.revenue.payingBusinesses + o.subscriptions.churned : 0

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Indicateurs SaaS de la plateforme, calculés par le backend (définitions au survol)."
        actions={<PeriodPicker preset={preset} range={range} onChange={setPreset} />}
      />

      <Section title="Revenus récurrents" description="Photographie actuelle, au prix catalogue">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            emphasis
            label="MRR"
            value={formatMoney(o?.revenue.mrr)}
            icon={<CircleDollarSign />}
            loading={loading}
            definition="Somme des prix catalogue mensuels des abonnements payés en cours (plans annuels ÷ 12, plans sur devis = 0)."
          />
          <StatTile label="ARR" value={formatMoney(o?.revenue.arr)} icon={<TrendingUp />} loading={loading} definition="MRR × 12." />
          <StatTile label="ARPU" value={formatMoney(o?.revenue.arpu)} icon={<Gauge />} loading={loading} definition="MRR ÷ nombre d’entreprises payantes." />
          <StatTile
            label="Entreprises payantes"
            value={formatNumber(o?.revenue.payingBusinesses)}
            icon={<Building2 />}
            loading={loading}
            hint={o && `sur ${formatNumber(o.businesses.active)} actives`}
          />
        </div>
      </Section>

      <Section title="Croissance & activation" description="Sur la période sélectionnée, comparée à la période précédente">
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label="Nouvelles entreprises"
            value={formatNumber(o?.businesses.new)}
            icon={<Building2 />}
            loading={loading}
            delta={relativeDelta(o?.businesses.new, p?.businesses.new)}
          />
          <StatTile
            label="Nouveaux utilisateurs"
            value={formatNumber(o?.users.new)}
            icon={<UserPlus />}
            loading={loading}
            delta={relativeDelta(o?.users.new, p?.users.new)}
          />
          <StatTile
            label="Taux d’activation"
            value={formatPercent(o ? ratio(o.businesses.newActivated, o.businesses.new) : null)}
            icon={<Activity />}
            loading={loading}
            definition="Part des nouvelles entreprises de la période ayant enregistré au moins une vente."
            hint={o && `${formatNumber(o.businesses.newActivated)} / ${formatNumber(o.businesses.new)}`}
          />
          <StatTile
            label="Entreprises actives"
            value={formatNumber(o?.businesses.withSales)}
            icon={<ShoppingBag />}
            loading={loading}
            delta={relativeDelta(o?.businesses.withSales, p?.businesses.withSales)}
            definition="Entreprises avec au moins une vente sur la période."
            hint={o && `${formatPercent(ratio(o.businesses.withSales, o.businesses.active))} des actives`}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {chart('Inscriptions', 'Entreprises et utilisateurs créés', (d) => (
            <ChartWithTable
              label="Inscriptions par période"
              data={d.map((x) => ({ bucket: x.bucket, newBusinesses: x.newBusinesses, newUsers: x.newUsers }))}
              series={[
                { key: 'newBusinesses', label: 'Entreprises', color: 0 },
                { key: 'newUsers', label: 'Utilisateurs', color: 1 },
              ]}
              granularity={granularity}
              height={220}
              formatValue={formatNumber}
            />
          ))}
          {chart('Entreprises actives', 'Entreprises ayant vendu, par période', (d) => (
            <ChartWithTable
              kind="bar"
              label="Entreprises actives par période"
              data={d.map((x) => ({ bucket: x.bucket, activeBusinesses: x.activeBusinesses }))}
              series={[{ key: 'activeBusinesses', label: 'Entreprises actives', color: 0 }]}
              granularity={granularity}
              height={220}
              formatValue={formatNumber}
            />
          ))}
        </div>
      </Section>

      <Section title="Rétention" description="Abonnements perdus et essais non convertis sur la période">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label="Abonnements perdus"
            value={formatNumber(o?.subscriptions.churned)}
            icon={<TrendingDown />}
            loading={loading}
            upIsGood={false}
            delta={relativeDelta(o?.subscriptions.churned, p?.subscriptions.churned)}
            definition="Abonnements payés terminés (expirés ou annulés) sur la période."
          />
          <StatTile
            label="Taux de churn (approx.)"
            value={formatPercent(o ? ratio(o.subscriptions.churned, churnBase) : null)}
            icon={<Repeat />}
            loading={loading}
            definition="Approximation : abonnements perdus ÷ (entreprises payantes actuelles + abonnements perdus). Pas d’historique quotidien des abonnés en V1."
          />
          <StatTile
            label="Essais expirés"
            value={formatNumber(o?.subscriptions.trialExpired)}
            icon={<Hourglass />}
            loading={loading}
            upIsGood={false}
            definition="Essais terminés sans paiement sur la période."
          />
          <StatTile
            label="Essais finissant sous 7 j"
            value={formatNumber(o?.subscriptions.trialsEnding7d)}
            icon={<Hourglass />}
            loading={loading}
            definition="Opportunités de conversion immédiates."
          />
        </div>
      </Section>

      <Section title="Activité commerciale de la plateforme" description="Ventes enregistrées par l’ensemble des commerces (XOF)">
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatTile
            label="Volume d’affaires (GMV)"
            value={`${formatCompact(o?.activity.gmv)} FCFA`}
            icon={<ShoppingBag />}
            loading={loading}
            delta={relativeDelta(o?.activity.gmv, p?.activity.gmv)}
            definition="Somme des ventes finalisées de toutes les entreprises en XOF."
          />
          <StatTile
            label="Nombre de ventes"
            value={formatNumber(o?.activity.salesCount)}
            icon={<Activity />}
            loading={loading}
            delta={relativeDelta(o?.activity.salesCount, p?.activity.salesCount)}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {chart('Volume d’affaires', 'GMV par période', (d) => (
            <ChartWithTable
              label="Volume d’affaires par période"
              data={d.map((x) => ({ bucket: x.bucket, gmv: x.gmv }))}
              series={[{ key: 'gmv', label: 'GMV (FCFA)', color: 0 }]}
              granularity={granularity}
              height={220}
              formatValue={(v) => formatMoney(v)}
            />
          ))}
          {chart('Encaissements d’abonnements', 'Paiements confirmés par période', (d) => (
            <ChartWithTable
              kind="bar"
              label="Encaissements par période"
              data={d.map((x) => ({ bucket: x.bucket, collected: x.collected }))}
              series={[{ key: 'collected', label: 'Encaissé (FCFA)', color: 0 }]}
              granularity={granularity}
              height={220}
              formatValue={(v) => formatMoney(v)}
            />
          ))}
        </div>
      </Section>

      <Section title="Portefeuille d’abonnements" description="Abonnements en cours">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader title="Par plan" />
            <CardBody>
              {loading || plans.isPending ? (
                <Skeleton className="h-40" />
              ) : (
                <Distribution
                  label="Abonnements en cours par plan"
                  items={(plans.data ?? []).map((pl) => ({
                    key: pl.code,
                    label: pl.name,
                    value: o?.subscriptions.byPlan[pl.code] ?? 0,
                    color: planColorSlot(plans.data, pl.code),
                  }))}
                />
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Par statut" />
            <CardBody>
              {loading ? (
                <Skeleton className="h-40" />
              ) : (
                <Distribution
                  label="Abonnements en cours par statut"
                  items={(['TRIALING', 'ACTIVE', 'PAST_DUE'] as SubscriptionStatus[]).map((s) => ({
                    key: s,
                    label: SUBSCRIPTION_STATUS[s].label,
                    value: o?.subscriptions.byStatus[s] ?? 0,
                    color: STATUS_SLOT[s],
                  }))}
                />
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Base installée" />
            <CardBody className="space-y-3 text-[13px]">
              {[
                ['Entreprises', o?.businesses.total],
                ['dont actives', o?.businesses.active],
                ['dont suspendues', o?.businesses.suspended],
                ['Utilisateurs', o?.users.total],
                ['Connectés sur la période', o?.users.signedIn],
              ].map(([label, value]) => (
                <div key={label as string} className="flex items-center justify-between">
                  <span className="text-fg-muted">{label}</span>
                  <span className="font-bold text-fg tabular">{loading ? '…' : formatNumber(value as number | undefined)}</span>
                </div>
              ))}
              <p className="flex gap-1.5 border-t border-border pt-3 text-xs text-fg-subtle">
                <Users className="mt-px size-3.5 shrink-0" /> « Connectés » = dernière connexion dans la période (pas d’historique de sessions en V1).
              </p>
            </CardBody>
          </Card>
        </div>
      </Section>

      <Card className="border-dashed bg-surface-2 shadow-none">
        <CardBody className="flex gap-3 pt-5">
          <Info className="mt-0.5 size-4 shrink-0 text-fg-subtle" />
          <p className="text-[13px] text-fg-muted">
            <span className="font-semibold text-fg">Non disponible en V1 :</span> rétention par cohorte, utilisateurs actifs quotidiens / mensuels (DAU/MAU) et
            MRR historique. Ces indicateurs nécessitent un historique (sessions, snapshots d’abonnements) que le backend ne conserve pas encore — ils ne sont
            donc pas estimés ici.
          </p>
        </CardBody>
      </Card>
    </>
  )
}
