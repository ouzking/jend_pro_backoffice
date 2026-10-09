import type { ReactNode } from 'react'
import { AlertTriangle, Inbox, Lock, RotateCw, WifiOff } from 'lucide-react'
import { toApiError } from '@/core/api/errors'
import { cn } from '@/core/utils/cn'
import { Button } from './Button'

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-md', className)} aria-hidden />
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  compact = false,
}: {
  icon?: ReactNode
  title: string
  description?: ReactNode
  action?: ReactNode
  className?: string
  compact?: boolean
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center', compact ? 'px-4 py-8' : 'px-6 py-14', className)}>
      <div className="relative mb-4">
        <div className="absolute inset-0 scale-150 rounded-full bg-brand-500/10 blur-xl" aria-hidden />
        <div className="relative grid size-12 place-items-center rounded-2xl border border-border bg-surface text-fg-subtle shadow-card [&_svg]:size-5">
          {icon ?? <Inbox />}
        </div>
      </div>
      <p className="text-[15px] font-bold text-fg">{title}</p>
      {description && <p className="mt-1 max-w-sm text-[13px] text-fg-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

/** Error panel for failed queries: maps the error kind to the right message + retry. */
export function ErrorState({ error, onRetry, className, compact = false }: { error: unknown; onRetry?: () => void; className?: string; compact?: boolean }) {
  const apiError = toApiError(error)
  const icon = apiError.kind === 'network' ? <WifiOff /> : apiError.kind === 'forbidden' ? <Lock /> : <AlertTriangle />
  const title = apiError.kind === 'network' ? 'Connexion impossible' : apiError.kind === 'forbidden' ? 'Accès refusé' : 'Chargement impossible'
  return (
    <div role="alert" className={cn('flex flex-col items-center justify-center text-center', compact ? 'px-4 py-8' : 'px-6 py-14', className)}>
      <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-danger-soft text-danger [&_svg]:size-5">{icon}</div>
      <p className="text-[15px] font-bold text-fg">{title}</p>
      <p className="mt-1 max-w-sm text-[13px] text-fg-muted">{apiError.message}</p>
      {onRetry && apiError.kind !== 'forbidden' && (
        <Button className="mt-5" size="sm" leftIcon={<RotateCw className="size-3.5" />} onClick={onRetry}>
          Réessayer
        </Button>
      )}
    </div>
  )
}

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-surface-2 px-1 font-mono text-[10px] font-medium text-fg-subtle',
        className,
      )}
    >
      {children}
    </kbd>
  )
}

export { Spinner } from './Spinner'
