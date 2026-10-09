import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { CheckCircle2, Info, Mail, Phone, Users as UsersIcon, XCircle } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, type Column } from '@/components/tables/DataTable'
import { Avatar, Identity } from '@/components/ui/Avatar'
import { Badge, StatusBadge } from '@/components/ui/Badge'
import { DescriptionList } from '@/components/ui/Card'
import { SearchInput } from '@/components/ui/Field'
import { Drawer } from '@/components/ui/Overlay'
import { Pagination } from '@/components/ui/Pagination'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States'
import { BUSINESS_ROLE_LABEL, BUSINESS_STATUS, MEMBER_STATUS, PLATFORM_ADMIN_STATUS, PLATFORM_ROLE } from '@/core/config/domain'
import { paths } from '@/core/router/navigation'
import { formatDate, formatDateTime, formatNumber, formatRelative } from '@/core/utils/format'
import { useDebouncedValue, useUrlState } from '@/core/utils/hooks'
import { useUser, useUsers } from './api'
import type { UserListItem } from './users.repository'

const LOCALES: Record<string, string> = { fr: 'Français', en: 'English', wo: 'Wolof' }

const columns: Column<UserListItem>[] = [
  {
    id: 'user',
    header: 'Utilisateur',
    hideable: false,
    cell: (u) => (
      <div className="flex items-center gap-2">
        <Identity name={u.fullName} secondary={u.email} seed={u.id} />
        {u.platformRole && <Badge tone={PLATFORM_ROLE[u.platformRole].tone}>Staff · {PLATFORM_ROLE[u.platformRole].label}</Badge>}
      </div>
    ),
  },
  { id: 'phone', header: 'Téléphone', hideBelow: 'lg', cell: (u) => u.phone ?? <span className="text-fg-subtle">—</span> },
  { id: 'businesses', header: 'Entreprises', align: 'right', cell: (u) => formatNumber(u.businessesCount) },
  {
    id: 'confirmed',
    header: 'E-mail vérifié',
    hideBelow: 'md',
    align: 'center',
    cell: (u) =>
      u.emailConfirmed ? (
        <CheckCircle2 className="mx-auto size-4 text-success" aria-label="Oui" />
      ) : (
        <XCircle className="mx-auto size-4 text-fg-subtle" aria-label="Non" />
      ),
  },
  {
    id: 'lastSignIn',
    header: 'Dernière connexion',
    hideBelow: 'sm',
    cell: (u) =>
      u.lastSignInAt ? <span title={formatDateTime(u.lastSignInAt)}>{formatRelative(u.lastSignInAt)}</span> : <span className="text-fg-subtle">Jamais</span>,
  },
  { id: 'createdAt', header: 'Inscription', hideBelow: 'md', cell: (u) => formatDate(u.createdAt) },
]

function UserDrawer({ userId, onClose }: { userId: string | null; onClose: () => void }) {
  const query = useUser(userId)
  const u = query.data
  return (
    <Drawer open={Boolean(userId)} onClose={onClose} title="Fiche utilisateur" width="lg">
      {query.isPending ? (
        <div className="space-y-4">
          <Skeleton className="h-14 w-64" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : u ? (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar name={u.fullName ?? u.email} seed={u.id} size="lg" />
            <div className="min-w-0">
              <p className="truncate text-lg font-bold text-fg">{u.fullName ?? 'Sans nom'}</p>
              <p className="flex items-center gap-1.5 truncate text-[13px] text-fg-muted">
                <Mail className="size-3.5" />
                {u.email}
              </p>
              {u.phone && (
                <p className="flex items-center gap-1.5 text-[13px] text-fg-muted">
                  <Phone className="size-3.5" />
                  {u.phone}
                </p>
              )}
            </div>
          </div>

          {u.platformRole && (
            <div className="flex items-center gap-2 rounded-xl border border-accent/30 bg-accent-soft px-3 py-2.5 text-[13px]">
              <Badge tone={PLATFORM_ROLE[u.platformRole].tone}>{PLATFORM_ROLE[u.platformRole].label}</Badge>
              <span className="text-fg-muted">Membre de l’équipe JËND PRO</span>
              {u.platformStatus && <StatusBadge value={u.platformStatus} map={PLATFORM_ADMIN_STATUS} />}
            </div>
          )}

          <DescriptionList
            items={[
              { label: 'Inscription', value: formatDateTime(u.createdAt) },
              { label: 'Dernière connexion', value: u.lastSignInAt ? formatDateTime(u.lastSignInAt) : 'Jamais' },
              { label: 'E-mail vérifié', value: u.emailConfirmed ? 'Oui' : 'Non' },
              { label: 'Langue', value: u.locale ? (LOCALES[u.locale] ?? u.locale) : '—' },
              { label: 'Compte bloqué jusqu’au', value: formatDateTime(u.bannedUntil), hidden: !u.bannedUntil },
              { label: 'Identifiant', value: <span className="font-mono text-xs">{u.id}</span> },
            ]}
          />

          <section>
            <h3 className="mb-3 text-[13px] font-bold text-fg">Entreprises ({u.memberships.length})</h3>
            {u.memberships.length === 0 ? (
              <EmptyState compact title="Aucune entreprise" description="Ce compte n’appartient à aucune entreprise." />
            ) : (
              <ul className="divide-y divide-border rounded-xl border border-border">
                {u.memberships.map((m) => (
                  <li key={m.businessId}>
                    <Link to={paths.business(m.businessId)} className="flex items-center gap-3 px-3.5 py-3 transition-colors hover:bg-surface-2">
                      <Avatar name={m.businessName} seed={m.businessId} size="sm" square />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-semibold text-fg">{m.businessName}</span>
                        <span className="text-xs text-fg-subtle">
                          {BUSINESS_ROLE_LABEL[m.roleCode] ?? m.roleName} · depuis {formatDate(m.joinedAt ?? m.createdAt)}
                        </span>
                      </span>
                      <span className="flex flex-col items-end gap-1">
                        <StatusBadge value={m.status} map={MEMBER_STATUS} />
                        {m.businessStatus !== 'ACTIVE' && <StatusBadge value={m.businessStatus} map={BUSINESS_STATUS} />}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <p className="flex gap-2 rounded-lg bg-surface-3 px-3 py-2.5 text-xs text-fg-muted">
            <Info className="mt-px size-3.5 shrink-0" />
            Consultation seule. Rôles et statuts d’un membre sont gérés par les propriétaires de l’entreprise ; une entreprise peut être suspendue depuis sa
            fiche.
          </p>
        </div>
      ) : null}
    </Drawer>
  )
}

const DEFAULTS = { q: '', page: 1, size: 25 }

export default function UsersPage() {
  const [state, update] = useUrlState(DEFAULTS)
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState(state.q)
  const debounced = useDebouncedValue(search, 300)
  const query = useUsers(state.q || undefined, { page: state.page, pageSize: state.size })
  const openUser = params.get('user')

  useEffect(() => {
    if (debounced !== state.q) update({ q: debounced })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync debounced search only
  }, [debounced])

  const setOpenUser = (id: string | null) =>
    setParams((prev) => {
      const n = new URLSearchParams(prev)
      if (id) n.set('user', id)
      else n.delete('user')
      return n
    })

  return (
    <>
      <PageHeader
        title="Utilisateurs"
        description="Tous les comptes de la plateforme et leurs entreprises."
        meta={query.data && <Badge size="md">{formatNumber(query.data.total)} compte(s)</Badge>}
      />
      <DataTable
        id="users"
        columns={columns}
        rows={query.data?.items}
        getRowId={(u) => u.id}
        loading={query.isPending}
        fetching={query.isFetching}
        error={query.error}
        onRetry={() => void query.refetch()}
        onRowClick={(u) => setOpenUser(u.id)}
        empty={{ icon: <UsersIcon />, title: state.q ? `Aucun compte pour « ${state.q} »` : 'Aucun utilisateur' }}
        toolbar={
          <SearchInput
            size="sm"
            className="w-full sm:w-80"
            value={search}
            onValueChange={setSearch}
            placeholder="Nom, e-mail, téléphone ou identifiant…"
            aria-label="Rechercher un utilisateur"
          />
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
      <UserDrawer userId={openUser} onClose={() => setOpenUser(null)} />
    </>
  )
}
