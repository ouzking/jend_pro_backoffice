import { useState } from 'react'
import { Check, KeyRound, LogOut, Minus, Moon, Sun, UserPlus } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, type Column } from '@/components/tables/DataTable'
import { Avatar, Identity } from '@/components/ui/Avatar'
import { Badge, StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Field, Input } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Overlay'
import { ErrorState, Skeleton } from '@/components/ui/States'
import { SegmentedControl, Tabs } from '@/components/ui/Tabs'
import { useToast } from '@/components/ui/Toast'
import { toApiError } from '@/core/api/errors'
import { useAuth } from '@/core/auth'
import { PLATFORM_ADMIN_STATUS, PLATFORM_ROLE, type PlatformRole } from '@/core/config/domain'
import { PLATFORM_PERMISSIONS } from '@/core/permissions/permissions'
import { cn } from '@/core/utils/cn'
import { formatDate, formatRelative } from '@/core/utils/format'
import { useUrlState } from '@/core/utils/hooks'
import { applyTheme, useTheme } from '@/core/utils/theme'
import { useGrantRole, useRoleMatrix, useSetAdminStatus, useTeam } from './api'
import { MfaCard } from './MfaCard'
import { ChangePasswordModal } from '@/features/auth/PasswordForm'
import type { PlatformAdmin } from './team.repository'

const PERMISSION_LABELS: Record<string, string> = {
  'businesses.read': 'Voir les entreprises',
  'businesses.manage': 'Suspendre / réactiver une entreprise',
  'users.read': 'Voir les utilisateurs',
  'subscriptions.read': 'Voir les abonnements et plans',
  'billing.read': 'Voir les paiements',
  'billing.manage': 'Enregistrer un paiement manuel',
  'support.read': 'Voir les tickets',
  'support.manage': 'Traiter les tickets',
  'announcements.read': 'Voir les annonces',
  'announcements.manage': 'Créer et envoyer des annonces',
  'audit.read': 'Journal d’audit plateforme',
  'analytics.read': 'Indicateurs (MRR, croissance…)',
  'admins.manage': 'Gérer l’équipe plateforme',
}

const ROLES = Object.keys(PLATFORM_ROLE) as PlatformRole[]

function ProfileTab() {
  const { user, access, signOut } = useAuth()
  const [changingPassword, setChangingPassword] = useState(false)
  const [theme] = useTheme()
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader title="Mon compte" />
        <CardBody>
          <div className="mb-5 flex items-center gap-4">
            <Avatar name={user?.fullName ?? user?.email} seed={user?.id} size="lg" />
            <div>
              <p className="text-base font-bold text-fg">{user?.fullName ?? '—'}</p>
              <p className="text-[13px] text-fg-muted">{user?.email}</p>
            </div>
            {access && (
              <Badge tone={PLATFORM_ROLE[access.role].tone} size="md" className="ml-auto">
                {PLATFORM_ROLE[access.role].label}
              </Badge>
            )}
          </div>
          <p className="mb-2 text-[13px] font-semibold text-fg">Mes permissions</p>
          <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {PLATFORM_PERMISSIONS.map((p) => {
              const granted = access?.permissions.has(p) ?? false
              return (
                <li key={p} className={cn('flex items-center gap-2 text-[13px]', granted ? 'text-fg' : 'text-fg-subtle line-through decoration-fg-subtle/40')}>
                  {granted ? <Check className="size-3.5 text-success" /> : <Minus className="size-3.5" />}
                  {PERMISSION_LABELS[p]}
                </li>
              )
            })}
          </ul>
        </CardBody>
      </Card>
      <div className="space-y-4">
        <Card>
          <CardHeader title="Apparence" />
          <CardBody>
            <SegmentedControl
              label="Thème"
              value={theme}
              onChange={applyTheme}
              options={[
                { value: 'light', label: '☀ Clair' },
                { value: 'dark', label: '☾ Sombre' },
              ]}
            />
            <p className="mt-2 flex items-center gap-1.5 text-xs text-fg-subtle">
              {theme === 'dark' ? <Moon className="size-3.5" /> : <Sun className="size-3.5" />} Mémorisé sur cet appareil.
            </p>
          </CardBody>
        </Card>
        <MfaCard />
        <Card>
          <CardBody className="flex items-center justify-between gap-3 pt-5 text-[13px] text-fg-muted">
            <Button size="sm" leftIcon={<KeyRound className="size-4" />} onClick={() => setChangingPassword(true)}>
              Changer mon mot de passe
            </Button>
            <Button variant="danger" size="sm" leftIcon={<LogOut className="size-4" />} onClick={() => void signOut()}>
              Se déconnecter
            </Button>
          </CardBody>
        </Card>
      </div>
      {changingPassword && <ChangePasswordModal onClose={() => setChangingPassword(false)} />}
    </div>
  )
}

function GrantModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast()
  const grant = useGrantRole()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<PlatformRole>('SUPPORT')
  const [error, setError] = useState<string | null>(null)
  const valid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())

  const submit = async () => {
    setError(null)
    try {
      await grant.mutateAsync({ email, role })
      toast.success('Accès accordé', `${email.trim()} — ${PLATFORM_ROLE[role].label}`)
      setEmail('')
      onClose()
    } catch (e) {
      setError(toApiError(e).message)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Donner accès à la console"
      description="La personne doit déjà avoir un compte JËND PRO (inscription avec son e-mail)."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="primary" disabled={!valid} loading={grant.isPending} onClick={submit}>
            Accorder l’accès
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="E-mail du compte" required>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="prenom@jendpro.sn" data-autofocus />
        </Field>
        <fieldset>
          <legend className="mb-2 text-[13px] font-semibold text-fg">Rôle</legend>
          <div className="space-y-2">
            {ROLES.map((r) => (
              <label
                key={r}
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors',
                  role === r ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10' : 'border-border hover:border-border-strong',
                )}
              >
                <input type="radio" name="role" className="mt-0.5 accent-brand-600" checked={role === r} onChange={() => setRole(r)} />
                <span>
                  <span className="block text-[13px] font-semibold text-fg">{PLATFORM_ROLE[r].label}</span>
                  <span className="block text-xs text-fg-muted">{PLATFORM_ROLE[r].description}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        {error && (
          <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-[13px] font-medium text-danger">
            {error}
          </p>
        )}
      </div>
    </Modal>
  )
}

function TeamTab() {
  const { user } = useAuth()
  const toast = useToast()
  const team = useTeam(true)
  const setStatus = useSetAdminStatus()
  const [grantOpen, setGrantOpen] = useState(false)
  const [target, setTarget] = useState<PlatformAdmin | null>(null)

  const columns: Column<PlatformAdmin>[] = [
    {
      id: 'member',
      header: 'Membre',
      hideable: false,
      cell: (a) => (
        <div className="flex items-center gap-2">
          <Identity name={a.fullName} secondary={a.email} seed={a.userId} />
          {a.userId === user?.id && <Badge>Vous</Badge>}
        </div>
      ),
    },
    { id: 'role', header: 'Rôle', cell: (a) => <Badge tone={PLATFORM_ROLE[a.role].tone}>{PLATFORM_ROLE[a.role].label}</Badge> },
    { id: 'since', header: 'Depuis', hideBelow: 'md', cell: (a) => formatDate(a.createdAt) },
    { id: 'lastSignIn', header: 'Dernière connexion', hideBelow: 'sm', cell: (a) => (a.lastSignInAt ? formatRelative(a.lastSignInAt) : 'Jamais') },
    { id: 'status', header: 'Statut', cell: (a) => <StatusBadge value={a.status} map={PLATFORM_ADMIN_STATUS} /> },
    {
      id: 'actions',
      header: '',
      hideable: false,
      align: 'right',
      cell: (a) =>
        a.userId === user?.id ? null : (
          <Button size="xs" variant={a.status === 'ACTIVE' ? 'ghost' : 'subtle'} onClick={() => setTarget(a)}>
            {a.status === 'ACTIVE' ? 'Suspendre' : 'Réactiver'}
          </Button>
        ),
    },
  ]

  return (
    <>
      <DataTable
        id="team"
        columns={columns}
        rows={team.data}
        getRowId={(a) => a.userId}
        loading={team.isPending}
        error={team.error}
        onRetry={() => void team.refetch()}
        skeletonRows={4}
        toolbar={
          <>
            <p className="text-[13px] text-fg-muted">Membres de l’équipe JËND PRO ayant accès à la console.</p>
            <Button size="sm" variant="primary" className="ml-auto" leftIcon={<UserPlus className="size-4" />} onClick={() => setGrantOpen(true)}>
              Ajouter / changer un rôle
            </Button>
          </>
        }
      />
      <GrantModal open={grantOpen} onClose={() => setGrantOpen(false)} />
      <ConfirmDialog
        open={Boolean(target)}
        onClose={() => setTarget(null)}
        tone={target?.status === 'ACTIVE' ? 'danger' : 'primary'}
        title={target?.status === 'ACTIVE' ? `Suspendre l’accès de ${target?.fullName ?? target?.email} ?` : `Réactiver ${target?.fullName ?? target?.email} ?`}
        description={
          target?.status === 'ACTIVE'
            ? 'Toutes ses permissions sont retirées immédiatement. Son compte JËND PRO reste utilisable comme commerçant.'
            : 'La personne retrouve les permissions de son rôle.'
        }
        confirmLabel={target?.status === 'ACTIVE' ? 'Suspendre' : 'Réactiver'}
        onConfirm={async () => {
          if (!target) return
          await setStatus.mutateAsync({ userId: target.userId, status: target.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' })
          toast.success(target.status === 'ACTIVE' ? 'Accès suspendu' : 'Accès réactivé')
        }}
      />
    </>
  )
}

function MatrixTab() {
  const matrix = useRoleMatrix()
  if (matrix.isPending) return <Skeleton className="h-96 rounded-2xl" />
  if (matrix.isError)
    return (
      <Card>
        <ErrorState error={matrix.error} onRetry={() => void matrix.refetch()} />
      </Card>
    )
  const granted = new Set(matrix.data.map((g) => `${g.role}:${g.permission}`))
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border bg-surface-2">
              <th className="px-4 py-3 text-left text-[11px] font-bold tracking-wider text-fg-subtle uppercase">Permission</th>
              {ROLES.map((r) => (
                <th key={r} className="px-3 py-3 text-center text-[11px] font-bold tracking-wider whitespace-nowrap text-fg-subtle uppercase">
                  {PLATFORM_ROLE[r].label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PLATFORM_PERMISSIONS.map((p) => (
              <tr key={p} className="border-b border-border last:border-0">
                <td className="px-4 py-2.5">
                  <p className="font-medium text-fg">{PERMISSION_LABELS[p]}</p>
                  <p className="font-mono text-[11px] text-fg-subtle">{p}</p>
                </td>
                {ROLES.map((r) => (
                  <td key={r} className="px-3 py-2.5 text-center">
                    {granted.has(`${r}:${p}`) ? (
                      <Check className="mx-auto size-4 text-success" aria-label="Accordée" />
                    ) : (
                      <Minus className="mx-auto size-4 text-fg-subtle/50" aria-label="Refusée" />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="border-t border-border bg-surface-2 px-4 py-3 text-xs text-fg-subtle">
        Matrice lue en base (table platform_role_permissions). Elle évolue uniquement par migration backend revue et testée.
      </p>
    </Card>
  )
}

type Tab = 'profile' | 'team' | 'roles'

export default function SettingsPage() {
  const { can } = useAuth()
  const [state, update] = useUrlState({ tab: 'profile' })
  const canTeam = can('admins.manage')
  const tab = (state.tab === 'team' && !canTeam ? 'profile' : state.tab) as Tab

  return (
    <>
      <PageHeader title="Paramètres" description="Votre compte, l’équipe plateforme et les droits d’accès." />
      <Tabs<Tab>
        className="mb-5"
        value={tab}
        onChange={(t) => update({ tab: t })}
        items={[
          { value: 'profile', label: 'Mon compte' },
          { value: 'team', label: 'Équipe', hidden: !canTeam },
          { value: 'roles', label: 'Rôles & permissions' },
        ]}
      />
      <div key={tab} className="animate-fade-in">
        {tab === 'profile' && <ProfileTab />}
        {tab === 'team' && canTeam && <TeamTab />}
        {tab === 'roles' && <MatrixTab />}
      </div>
    </>
  )
}
