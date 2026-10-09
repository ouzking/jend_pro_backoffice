import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { Ban, CreditCard, LifeBuoy, PlayCircle, ShieldAlert } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, type Column } from '@/components/tables/DataTable'
import { Avatar, Identity } from '@/components/ui/Avatar'
import { Badge, StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader, DescriptionList } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { LoadMore } from '@/components/ui/Pagination'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States'
import { Tabs } from '@/components/ui/Tabs'
import { useToast } from '@/components/ui/Toast'
import { toApiError } from '@/core/api/errors'
import { useAuth } from '@/core/auth'
import { BUSINESS_ROLE_LABEL, BUSINESS_STATUS, MEMBER_STATUS, SUBSCRIPTION_STATUS, TICKET_PRIORITY, TICKET_STATUS } from '@/core/config/domain'
import { paths } from '@/core/router/navigation'
import { cn } from '@/core/utils/cn'
import { formatDate, formatDateTime, formatMoney, formatNumber, formatRelative } from '@/core/utils/format'
import { useAuditLog } from '@/features/audit/api'
import { AuditFeed } from '@/features/audit/AuditFeed'
import { ManualPaymentModal } from '@/features/payments/ManualPaymentModal'
import { usePlans } from '@/features/subscriptions/api'
import { useTickets } from '@/features/support/api'
import { useBusiness, useBusinessMembers, useSetBusinessStatus } from './api'
import type { BusinessDetail, BusinessMember } from './businesses.repository'

type Tab = 'info' | 'users' | 'subscription' | 'stats' | 'activity' | 'audit'

const memberColumns: Column<BusinessMember>[] = [
  { id: 'name', header: 'Membre', hideable: false, cell: (m) => <Identity name={m.fullName} secondary={m.email} seed={m.userId} /> },
  {
    id: 'role',
    header: 'Rôle',
    cell: (m) => <Badge tone={m.roleCode === 'OWNER' ? 'accent' : 'neutral'}>{BUSINESS_ROLE_LABEL[m.roleCode] ?? m.roleName}</Badge>,
  },
  { id: 'phone', header: 'Téléphone', hideBelow: 'lg', cell: (m) => m.phone ?? '—' },
  { id: 'joined', header: 'Membre depuis', hideBelow: 'md', cell: (m) => formatDate(m.joinedAt ?? m.createdAt) },
  {
    id: 'lastSignIn',
    header: 'Dernière connexion',
    hideBelow: 'md',
    cell: (m) => (m.lastSignInAt ? formatRelative(m.lastSignInAt) : <span className="text-fg-subtle">Jamais</span>),
  },
  { id: 'status', header: 'Statut', cell: (m) => <StatusBadge value={m.status} map={MEMBER_STATUS} /> },
]

function Meter({ label, used, max }: { label: string; used: number; max: number | null | undefined }) {
  const ratio = max ? Math.min(used / max, 1) : 0
  const level = !max ? 'none' : ratio >= 1 ? 'danger' : ratio >= 0.8 ? 'warning' : 'ok'
  return (
    <div>
      <div className="flex items-baseline justify-between text-[13px]">
        <span className="font-medium text-fg-muted">{label}</span>
        <span className="font-semibold text-fg tabular">
          {formatNumber(used)} <span className="font-normal text-fg-subtle">/ {max ? formatNumber(max) : 'illimité'}</span>
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-brand-500/12">
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-500',
            level === 'danger' ? 'bg-danger' : level === 'warning' ? 'bg-warning' : 'bg-brand-500',
            level === 'none' && 'w-full opacity-25',
          )}
          style={level === 'none' ? undefined : { width: `${Math.max(ratio * 100, 2)}%` }}
        />
      </div>
    </div>
  )
}

function InfoTab({ b }: { b: BusinessDetail }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader title="Identité" />
        <CardBody>
          <DescriptionList
            items={[
              { label: 'Nom commercial', value: b.name },
              { label: 'Raison sociale', value: b.legalName },
              { label: 'NINEA', value: b.ninea && <span className="font-mono">{b.ninea}</span> },
              { label: 'RCCM', value: b.rccm && <span className="font-mono">{b.rccm}</span> },
              { label: 'Téléphone', value: b.phone },
              { label: 'E-mail', value: b.email },
              { label: 'Adresse', value: b.address },
              { label: 'Ville', value: [b.city, b.countryCode].filter(Boolean).join(', ') },
            ]}
          />
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Plateforme" />
        <CardBody>
          <DescriptionList
            columns={1}
            items={[
              { label: 'Identifiant', value: <span className="font-mono text-xs">{b.id}</span> },
              { label: 'Devise · fuseau', value: `${b.currencyCode} · ${b.timezone}` },
              { label: 'Inscription', value: formatDateTime(b.createdAt) },
              { label: 'Dernière modification', value: formatDateTime(b.updatedAt) },
            ]}
          />
        </CardBody>
      </Card>
    </div>
  )
}

function SubscriptionTab({ b }: { b: BusinessDetail }) {
  const plans = usePlans()
  const current = b.subscriptions.find((s) => ['TRIALING', 'ACTIVE', 'PAST_DUE'].includes(s.status)) ?? b.subscriptions[0]
  const plan = plans.data?.find((p) => p.code === current?.planCode)
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card>
        <CardHeader title="Abonnement actuel" />
        <CardBody>
          {current ? (
            <div className="space-y-5">
              <div className="flex items-center gap-2">
                <span className="text-xl font-extrabold tracking-tight text-fg">{current.planName}</span>
                <StatusBadge value={current.status} map={SUBSCRIPTION_STATUS} size="md" />
              </div>
              {b.isRestricted && (
                <p className="flex gap-2 rounded-lg bg-warning-soft px-3 py-2 text-[13px] text-warning">
                  <ShieldAlert className="mt-0.5 size-4 shrink-0" /> Mode restreint : lecture seule, la caisse reste ouverte.
                </p>
              )}
              <DescriptionList
                columns={1}
                items={[
                  { label: 'Fin d’essai', value: formatDate(current.trialEndsAt), hidden: current.status !== 'TRIALING' },
                  {
                    label: 'Période en cours',
                    value: `${formatDate(current.currentPeriodStart)} → ${current.currentPeriodEnd ? formatDate(current.currentPeriodEnd) : 'sans fin'}`,
                  },
                  {
                    label: 'Référence de paiement',
                    value: current.externalReference && <span className="font-mono text-xs">{current.externalReference}</span>,
                  },
                ]}
              />
              <div className="space-y-4 border-t border-border pt-4">
                <Meter label="Membres" used={b.usage.members} max={plan?.limits.maxMembers} />
                <Meter label="Produits actifs" used={b.usage.products} max={plan?.limits.maxProducts} />
                <Meter label="Emplacements" used={b.usage.locations} max={plan?.limits.maxLocations} />
              </div>
            </div>
          ) : (
            <EmptyState compact title="Aucun abonnement" />
          )}
        </CardBody>
      </Card>
      <Card className="lg:col-span-2">
        <CardHeader title="Historique" description="Toutes les périodes, de la plus récente à la plus ancienne" />
        <CardBody>
          <ol className="relative space-y-4 before:absolute before:top-2 before:bottom-2 before:left-[3.5px] before:w-px before:bg-border">
            {b.subscriptions.map((s) => (
              <li key={s.id} className="relative pl-6">
                <span className={cn('absolute top-[7px] left-0 size-2 rounded-full ring-4 ring-surface', s.endedAt ? 'bg-fg-subtle' : 'bg-brand-500')} />
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[13px] font-semibold text-fg">{s.planName}</span>
                  <StatusBadge value={s.status} map={SUBSCRIPTION_STATUS} />
                  {s.externalReference && <span className="font-mono text-[11px] text-fg-subtle">{s.externalReference}</span>}
                </div>
                <p className="mt-0.5 text-xs text-fg-muted">
                  Créé le {formatDate(s.createdAt)}
                  {s.status === 'TRIALING' && s.trialEndsAt && ` · essai jusqu’au ${formatDate(s.trialEndsAt)}`}
                  {s.currentPeriodEnd && s.status !== 'TRIALING' && ` · jusqu’au ${formatDate(s.currentPeriodEnd)}`}
                  {s.endedAt && ` · terminé le ${formatDate(s.endedAt)}`}
                </p>
              </li>
            ))}
          </ol>
        </CardBody>
      </Card>
    </div>
  )
}

function StatsTab({ b }: { b: BusinessDetail }) {
  const tiles = [
    { label: 'Chiffre d’affaires (30 j)', value: formatMoney(b.activity.revenue30d, b.currencyCode) },
    { label: 'Ventes (30 j)', value: formatNumber(b.activity.salesCount30d) },
    { label: 'Ventes (total)', value: formatNumber(b.activity.salesCountTotal) },
    { label: 'Dernière vente', value: b.activity.lastSaleAt ? formatRelative(b.activity.lastSaleAt) : 'Jamais' },
    { label: 'Produits actifs', value: formatNumber(b.counts.products) },
    { label: 'Clients', value: formatNumber(b.counts.customers) },
    { label: 'Emplacements', value: formatNumber(b.counts.locations) },
    { label: 'Membres / invités', value: `${formatNumber(b.counts.members)} / ${formatNumber(b.counts.invited)}` },
  ]
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {tiles.map((t) => (
        <Card key={t.label} className="p-4">
          <p className="text-xs font-semibold text-fg-muted">{t.label}</p>
          <p className="mt-1.5 truncate text-xl font-bold tracking-tight text-fg">{t.value}</p>
        </Card>
      ))}
    </div>
  )
}

function ActivityTab({ b }: { b: BusinessDetail }) {
  const { can } = useAuth()
  const navigate = useNavigate()
  const tickets = useTickets({ businessId: b.id }, { page: 1, pageSize: 10 }, { enabled: can('support.read') })
  const timeline = [
    { at: b.createdAt, label: 'Inscription sur JËND PRO' },
    ...b.subscriptions.map((s) => ({ at: s.createdAt, label: `Abonnement ${s.planName} (${SUBSCRIPTION_STATUS[s.status].label.toLowerCase()})` })),
    ...(b.activity.lastSaleAt ? [{ at: b.activity.lastSaleAt, label: 'Dernière vente enregistrée' }] : []),
  ].sort((x, y) => y.at.localeCompare(x.at))

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader title="Jalons" />
        <CardBody>
          <ol className="relative space-y-4 before:absolute before:top-2 before:bottom-2 before:left-[3.5px] before:w-px before:bg-border">
            {timeline.map((t, i) => (
              <li key={`${t.at}-${i}`} className="relative pl-6">
                <span className="absolute top-[7px] left-0 size-2 rounded-full bg-brand-500 ring-4 ring-surface" />
                <p className="text-[13px] font-semibold text-fg">{t.label}</p>
                <p className="text-xs text-fg-subtle">{formatDateTime(t.at)}</p>
              </li>
            ))}
          </ol>
        </CardBody>
      </Card>
      {can('support.read') && (
        <Card>
          <CardHeader title="Tickets de support" icon={<LifeBuoy />} />
          <CardBody>
            {tickets.isPending ? (
              <Skeleton className="h-32 w-full" />
            ) : tickets.isError ? (
              <ErrorState error={tickets.error} onRetry={() => void tickets.refetch()} compact />
            ) : tickets.data.items.length === 0 ? (
              <EmptyState compact icon={<LifeBuoy />} title="Aucun ticket" />
            ) : (
              <ul className="-mx-2">
                {tickets.data.items.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => navigate(paths.ticket(t.id))}
                      className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left hover:bg-surface-2"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-semibold text-fg">
                          #{t.number} · {t.subject}
                        </span>
                        <span className="text-xs text-fg-subtle">{formatRelative(t.lastMessageAt)}</span>
                      </span>
                      <StatusBadge value={t.priority} map={TICKET_PRIORITY} />
                      <StatusBadge value={t.status} map={TICKET_STATUS} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  )
}

function AuditTab({ businessId }: { businessId: string }) {
  const audit = useAuditLog({ businessId })
  const entries = audit.data?.pages.flatMap((p) => p.entries)
  return (
    <Card>
      <CardHeader title="Journal d’audit de l’entreprise" description="Actions des membres et de l’équipe JËND PRO" />
      <CardBody>
        {audit.isError ? (
          <ErrorState error={audit.error} onRetry={() => void audit.refetch()} compact />
        ) : entries && entries.length === 0 ? (
          <EmptyState compact title="Aucune action enregistrée" />
        ) : (
          <>
            <AuditFeed entries={entries} loading={audit.isPending} showBusiness={false} />
            {entries && <LoadMore hasMore={audit.hasNextPage} loading={audit.isFetchingNextPage} onLoadMore={() => void audit.fetchNextPage()} />}
          </>
        )}
      </CardBody>
    </Card>
  )
}

export default function BusinessDetailPage() {
  const { businessId = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const { can } = useAuth()
  const toast = useToast()
  const query = useBusiness(businessId)
  const tab = (params.get('tab') as Tab | null) ?? 'info'
  const members = useBusinessMembers(businessId, tab === 'users')
  const setStatus = useSetBusinessStatus()
  const [confirm, setConfirm] = useState<'suspend' | 'reactivate' | null>(null)
  const [paymentOpen, setPaymentOpen] = useState(false)

  if (query.isPending) {
    return (
      <div>
        <Skeleton className="mb-3 h-3 w-40" />
        <div className="mb-8 flex items-center gap-4">
          <Skeleton className="size-14 rounded-2xl" />
          <Skeleton className="h-8 w-72" />
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    )
  }
  if (query.isError) {
    return (
      <Card>
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        {toApiError(query.error).kind === 'not_found' && (
          <p className="pb-8 text-center">
            <Link to={paths.businesses} className="text-sm font-semibold text-brand-600 hover:underline">
              Retour aux entreprises
            </Link>
          </p>
        )}
      </Card>
    )
  }

  const b = query.data
  const current = b.subscriptions.find((s) => ['TRIALING', 'ACTIVE', 'PAST_DUE'].includes(s.status))
  const setTab = (t: Tab) =>
    setParams(
      (prev) => {
        const n = new URLSearchParams(prev)
        if (t === 'info') n.delete('tab')
        else n.set('tab', t)
        return n
      },
      { replace: true },
    )

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Entreprises', to: paths.businesses }, { label: b.name }]}
        title={
          <span className="flex items-center gap-3.5">
            <Avatar name={b.name} seed={b.id} size="lg" square className="rounded-2xl" />
            <span className="truncate">{b.name}</span>
          </span>
        }
        meta={
          <>
            <StatusBadge value={b.status} map={BUSINESS_STATUS} size="md" />
            {current && (
              <Badge tone="brand" size="md">
                {current.planName} · {SUBSCRIPTION_STATUS[current.status].label}
              </Badge>
            )}
            {b.isRestricted && (
              <Badge tone="warning" size="md" dot>
                Mode restreint
              </Badge>
            )}
            <span className="text-xs text-fg-subtle">
              Inscrite le {formatDate(b.createdAt)}
              {b.city ? ` · ${b.city}` : ''}
            </span>
          </>
        }
        actions={
          <>
            {can('billing.manage') && (
              <Button leftIcon={<CreditCard className="size-4" />} onClick={() => setPaymentOpen(true)}>
                Enregistrer un paiement
              </Button>
            )}
            {can('businesses.manage') &&
              (b.status === 'ACTIVE' ? (
                <Button variant="danger" leftIcon={<Ban className="size-4" />} onClick={() => setConfirm('suspend')}>
                  Suspendre
                </Button>
              ) : (
                <Button variant="primary" leftIcon={<PlayCircle className="size-4" />} onClick={() => setConfirm('reactivate')}>
                  Réactiver
                </Button>
              ))}
          </>
        }
      />

      {b.status === 'SUSPENDED' && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-danger/25 bg-danger-soft px-4 py-3 text-[13px] text-danger">
          <Ban className="mt-0.5 size-4 shrink-0" />
          <p>
            <span className="font-semibold">Entreprise suspendue.</span> Aucun membre ne peut accéder à ses données. Le motif figure dans l’onglet Audit.
          </p>
        </div>
      )}

      <Tabs<Tab>
        className="mb-5"
        value={tab}
        onChange={setTab}
        items={[
          { value: 'info', label: 'Informations' },
          { value: 'users', label: 'Utilisateurs', count: b.counts.members + b.counts.invited },
          { value: 'subscription', label: 'Abonnement' },
          { value: 'stats', label: 'Statistiques' },
          { value: 'activity', label: 'Activité' },
          { value: 'audit', label: 'Audit', hidden: !can('audit.read') },
        ]}
      />

      <div key={tab} className="animate-fade-in">
        {tab === 'info' && <InfoTab b={b} />}
        {tab === 'users' && (
          <DataTable
            id="business-members"
            columns={memberColumns}
            rows={members.data}
            getRowId={(m) => m.memberId}
            loading={members.isPending}
            error={members.error}
            onRetry={() => void members.refetch()}
            empty={{ title: 'Aucun membre' }}
            skeletonRows={4}
          />
        )}
        {tab === 'subscription' && <SubscriptionTab b={b} />}
        {tab === 'stats' && <StatsTab b={b} />}
        {tab === 'activity' && <ActivityTab b={b} />}
        {tab === 'audit' && can('audit.read') && <AuditTab businessId={b.id} />}
      </div>

      <ConfirmDialog
        open={confirm === 'suspend'}
        onClose={() => setConfirm(null)}
        title={`Suspendre ${b.name} ?`}
        description="Tous les membres perdent immédiatement l’accès (ventes comprises). Les propriétaires sont notifiés. Action réversible."
        confirmLabel="Suspendre l’entreprise"
        reason={{ label: 'Motif de la suspension', placeholder: 'Ex. : fraude signalée, demande du propriétaire…' }}
        confirmText={b.name}
        onConfirm={async (reason) => {
          await setStatus.mutateAsync({ id: b.id, status: 'SUSPENDED', reason })
          toast.success('Entreprise suspendue', b.name)
        }}
      />
      <ConfirmDialog
        open={confirm === 'reactivate'}
        onClose={() => setConfirm(null)}
        tone="primary"
        title={`Réactiver ${b.name} ?`}
        description="Les membres actifs retrouvent immédiatement l’accès. Les propriétaires sont notifiés."
        confirmLabel="Réactiver"
        reason={{ label: 'Motif de la réactivation' }}
        onConfirm={async (reason) => {
          await setStatus.mutateAsync({ id: b.id, status: 'ACTIVE', reason })
          toast.success('Entreprise réactivée', b.name)
        }}
      />
      {can('billing.manage') && <ManualPaymentModal open={paymentOpen} onClose={() => setPaymentOpen(false)} business={{ id: b.id, name: b.name }} />}
    </>
  )
}
