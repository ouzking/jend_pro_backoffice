import { useState } from 'react'
import { Link } from 'react-router'
import { ChevronDown } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/States'
import { paths } from '@/core/router/navigation'
import { cn } from '@/core/utils/cn'
import { formatDateTime, formatRelative } from '@/core/utils/format'
import { actionLabel, actionTone, actorRoleLabel } from './actions'
import type { AuditEntry } from './audit.repository'

const DOT: Record<string, string> = {
  neutral: 'bg-fg-subtle',
  danger: 'bg-danger',
  success: 'bg-success',
  accent: 'bg-accent',
  warning: 'bg-warning',
  brand: 'bg-brand-500',
  info: 'bg-info',
}

/** Metadata is shown as-is (already minimal by backend rule: no secrets). */
function Metadata({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data)
  if (entries.length === 0) return <p className="text-xs text-fg-subtle">Aucune donnée complémentaire.</p>
  return (
    <pre className="max-h-64 overflow-auto rounded-lg border border-border bg-surface-2 p-3 font-mono text-[11px] leading-relaxed text-fg-muted">
      {JSON.stringify(data, null, 2)}
    </pre>
  )
}

export function AuditFeedItem({ entry, showBusiness = true }: { entry: AuditEntry; showBusiness?: boolean }) {
  const [open, setOpen] = useState(false)
  const tone = actionTone(entry.action)
  const reason = typeof entry.metadata.reason === 'string' ? entry.metadata.reason : null
  return (
    <li className="relative pl-6">
      <span className={cn('absolute top-[7px] left-0 size-2 rounded-full ring-4 ring-surface', DOT[tone])} aria-hidden />
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <p className="text-[13px] font-semibold text-fg">{actionLabel(entry.action)}</p>
        <time className="text-xs text-fg-subtle tabular" dateTime={entry.createdAt} title={formatDateTime(entry.createdAt)}>
          {formatRelative(entry.createdAt)}
        </time>
      </div>
      <p className="mt-0.5 text-xs text-fg-muted">
        {entry.actorName || entry.actorEmail || actorRoleLabel(entry.actorRole)}
        {showBusiness && entry.businessId && (
          <>
            {' · '}
            <Link to={paths.business(entry.businessId)} className="font-medium text-fg hover:text-brand-600 hover:underline">
              {entry.businessName ?? 'Entreprise'}
            </Link>
          </>
        )}
        {!entry.businessId && (
          <Badge tone="accent" className="ml-1.5">
            Plateforme
          </Badge>
        )}
      </p>
      {reason && <p className="mt-1 text-xs text-fg-muted italic">« {reason} »</p>}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-fg-subtle hover:text-fg"
        aria-expanded={open}
      >
        Détails <ChevronDown className={cn('size-3 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="mt-2 animate-fade-in space-y-2">
          <p className="font-mono text-[11px] text-fg-subtle">
            {entry.action} · {entry.resourceType}
            {entry.resourceId ? ` · ${entry.resourceId}` : ''} · {actorRoleLabel(entry.actorRole)}
          </p>
          <Metadata data={entry.metadata} />
        </div>
      )}
    </li>
  )
}

export function AuditFeed({ entries, loading, showBusiness = true }: { entries: AuditEntry[] | undefined; loading?: boolean; showBusiness?: boolean }) {
  if (loading) {
    return (
      <ul className="space-y-5">
        {Array.from({ length: 5 }, (_, i) => (
          <li key={i} className="pl-6">
            <Skeleton className="h-3.5 w-48" />
            <Skeleton className="mt-2 h-3 w-32" />
          </li>
        ))}
      </ul>
    )
  }
  return (
    <ul className="relative space-y-4 before:absolute before:top-2 before:bottom-2 before:left-[3.5px] before:w-px before:bg-border">
      {entries?.map((e) => (
        <AuditFeedItem key={e.id} entry={e} showBusiness={showBusiness} />
      ))}
    </ul>
  )
}
