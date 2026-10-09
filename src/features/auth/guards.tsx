import type { ReactNode } from 'react'
import { Link, Navigate, useLocation } from 'react-router'
import { LogOut, RotateCw, ShieldOff } from 'lucide-react'
import { LogoMark } from '@/components/layout/Logo'
import { Button } from '@/components/ui/Button'
import { buttonClass } from '@/components/ui/buttonStyles'
import { EmptyState } from '@/components/ui/States'
import { useAuth } from '@/core/auth'
import type { PermissionRequirement } from '@/core/permissions/permissions'
import { paths } from '@/core/router/navigation'
import { MfaChallenge } from './MfaChallenge'

function Splash() {
  return (
    <div className="grid min-h-dvh place-items-center" aria-busy="true" aria-label="Vérification de l’accès">
      <div className="flex flex-col items-center gap-4">
        <LogoMark className="size-12 animate-pulse" />
        <p className="text-[13px] font-medium text-fg-subtle">Vérification de l’accès…</p>
      </div>
    </div>
  )
}

function FullScreenMessage({ icon, title, description, actions }: { icon: ReactNode; title: string; description: ReactNode; actions: ReactNode }) {
  return (
    <div className="grid min-h-dvh place-items-center px-6">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl bg-danger-soft text-danger [&_svg]:size-6">{icon}</div>
        <h1 className="text-xl font-extrabold tracking-tight text-fg">{title}</h1>
        <div className="mt-2 text-sm text-fg-muted">{description}</div>
        <div className="mt-7 flex justify-center gap-2">{actions}</div>
      </div>
    </div>
  )
}

/**
 * Gate of the whole console: signed-in AND active JËND PRO staff.
 * UX only — every admin_* RPC re-checks the permission server-side.
 */
export function RequireStaff({ children }: { children: ReactNode }) {
  const { status, user, error, signOut, refreshAccess } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <Splash />
  if (status === 'anonymous') return <Navigate to={paths.login} replace state={{ from: location.pathname + location.search }} />
  if (status === 'error') {
    return (
      <FullScreenMessage
        icon={<RotateCw />}
        title="Impossible de vérifier votre accès"
        description={error?.message}
        actions={
          <>
            <Button variant="ghost" onClick={() => void signOut()}>
              Se déconnecter
            </Button>
            <Button variant="primary" onClick={() => void refreshAccess()}>
              Réessayer
            </Button>
          </>
        }
      />
    )
  }
  if (status === 'mfa') return <MfaChallenge />
  if (status === 'forbidden') {
    return (
      <FullScreenMessage
        icon={<ShieldOff />}
        title="Accès réservé à l’équipe JËND PRO"
        description={
          <>
            Le compte <span className="font-semibold text-fg">{user?.email}</span> n’a pas (ou plus) d’accès à la console. Si vous êtes commerçant, utilisez
            l’application JËND PRO.
          </>
        }
        actions={
          <Button leftIcon={<LogOut className="size-4" />} onClick={() => void signOut()}>
            Se déconnecter
          </Button>
        }
      />
    )
  }
  return <>{children}</>
}

/** Route-level permission gate, rendered inside the shell. */
export function RequirePermission({ permission, children }: { permission: PermissionRequirement; children: ReactNode }) {
  const { can } = useAuth()
  if (can(permission)) return <>{children}</>
  return (
    <EmptyState
      icon={<ShieldOff />}
      title="Accès non autorisé"
      description="Votre rôle ne donne pas accès à cette section. Contactez un super administrateur si vous en avez besoin."
      action={
        <Link to={paths.dashboard} className={buttonClass('secondary', 'sm')}>
          Retour au tableau de bord
        </Link>
      }
    />
  )
}

export function NotFoundPage() {
  return (
    <EmptyState
      title="Page introuvable"
      description="Cette adresse ne correspond à aucune page de la console."
      action={
        <Link to={paths.dashboard} className={buttonClass('secondary', 'sm')}>
          Retour au tableau de bord
        </Link>
      }
    />
  )
}
