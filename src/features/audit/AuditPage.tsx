import { useState } from 'react'
import { Link } from 'react-router'
import { FilterX, Info, ScrollText } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, type Column } from '@/components/tables/DataTable'
import { Identity } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { DescriptionList } from '@/components/ui/Card'
import { Field, Input, Select } from '@/components/ui/Field'
import { Drawer } from '@/components/ui/Overlay'
import { LoadMore } from '@/components/ui/Pagination'
import { blankToUndefined } from '@/core/api/paging'
import { paths } from '@/core/router/navigation'
import { formatDateTime, formatRelative, shortId } from '@/core/utils/format'
import { useUrlState } from '@/core/utils/hooks'
import { BusinessPicker } from '@/features/businesses/BusinessPicker'
import { ACTION_DOMAINS, actionLabel, actionTone, actorRoleLabel } from './actions'
import { useAuditLog } from './api'
import type { AuditEntry } from './audit.repository'

const columns: Column<AuditEntry>[] = [
  {
    id: 'date',
    header: 'Date',
    hideable: false,
    cell: (e) => (
      <div className="text-xs whitespace-nowrap">
        <p className="font-medium text-fg">{formatDateTime(e.createdAt)}</p>
        <p className="text-fg-subtle">{formatRelative(e.createdAt)}</p>
      </div>
    ),
  },
  {
    id: 'action',
    header: 'Action',
    hideable: false,
    cell: (e) => (
      <div className="min-w-0">
        <Badge tone={actionTone(e.action)} dot>
          {actionLabel(e.action)}
        </Badge>
        <p className="mt-1 font-mono text-[11px] text-fg-subtle">{e.action}</p>
      </div>
    ),
  },
  {
    id: 'actor',
    header: 'Auteur',
    cell: (e) =>
      e.actorId ? <Identity name={e.actorName} secondary={e.actorEmail} seed={e.actorId} /> : <Badge tone="neutral">{actorRoleLabel(e.actorRole)}</Badge>,
  },
  {
    id: 'business',
    header: 'Entreprise',
    hideBelow: 'md',
    cell: (e) =>
      e.businessId ? (
        <Link to={paths.business(e.businessId)} onClick={(ev) => ev.stopPropagation()} className="font-medium text-fg hover:text-brand-600 hover:underline">
          {e.businessName ?? shortId(e.businessId)}
        </Link>
      ) : (
        <Badge tone="accent">Plateforme</Badge>
      ),
  },
  {
    id: 'resource',
    header: 'Ressource',
    hideBelow: 'lg',
    cell: (e) => (
      <span className="font-mono text-xs text-fg-muted">
        {e.resourceType}
        {e.resourceId && <span className="text-fg-subtle"> · {shortId(e.resourceId)}</span>}
      </span>
    ),
  },
  {
    id: 'detail',
    header: 'Détail',
    hideBelow: 'xl',
    cell: (e) => {
      const reason = typeof e.metadata.reason === 'string' ? e.metadata.reason : null
      return (
        <span className="line-clamp-1 max-w-56 text-xs text-fg-muted">{reason ? `« ${reason} »` : Object.keys(e.metadata).slice(0, 3).join(', ') || '—'}</span>
      )
    },
  },
]

const DEFAULTS = { domain: '', business: '', businessName: '', actor: '', from: '', to: '' }

export default function AuditPage() {
  const [state, update, reset] = useUrlState(DEFAULTS)
  const [selected, setSelected] = useState<AuditEntry | null>(null)
  const filters = {
    action: blankToUndefined(state.domain),
    businessId: blankToUndefined(state.business),
    actorId: blankToUndefined(state.actor),
    from: blankToUndefined(state.from),
    to: blankToUndefined(state.to),
  }
  const query = useAuditLog(filters)
  const rows = query.data?.pages.flatMap((p) => p.entries)
  const hasFilters = Boolean(state.domain || state.business || state.actor || state.from || state.to)

  return (
    <>
      <PageHeader
        title="Journal d’audit"
        description="Trace immuable des actions sensibles de toute la plateforme : commerçants, équipe JËND PRO et système."
      />
      <p className="mb-3 flex items-start gap-2 text-xs text-fg-subtle">
        <Info className="mt-px size-3.5 shrink-0" />
        Le journal ne contient que des actions effectivement réalisées (une tentative refusée est annulée et n’est pas enregistrée). Il ne peut être ni modifié
        ni supprimé.
      </p>
      <DataTable
        id="audit"
        columns={columns}
        rows={rows}
        getRowId={(e) => e.id}
        loading={query.isPending}
        fetching={query.isFetching && !query.isFetchingNextPage}
        error={query.error}
        onRetry={() => void query.refetch()}
        onRowClick={setSelected}
        empty={{ icon: <ScrollText />, title: 'Aucune action enregistrée', description: hasFilters ? 'Aucune entrée ne correspond à ces filtres.' : undefined }}
        toolbar={
          <>
            <Select
              size="sm"
              className="w-40"
              value={state.domain}
              onValueChange={(v) => update({ domain: v })}
              options={ACTION_DOMAINS}
              placeholder="Tous domaines"
              aria-label="Type d’action"
            />
            <div className="w-56">
              <BusinessPicker
                placeholder="Entreprise…"
                value={state.business ? { id: state.business, name: state.businessName || shortId(state.business) } : null}
                onChange={(b) => update({ business: b?.id ?? '', businessName: b?.name ?? '' })}
              />
            </div>
            <div className="flex items-center gap-1.5 text-xs text-fg-subtle">
              <span>Du</span>
              <Input
                type="date"
                className="h-8 w-34 text-[13px]"
                value={state.from}
                max={state.to || undefined}
                onChange={(e) => update({ from: e.target.value })}
                aria-label="À partir du"
              />
              <span>au</span>
              <Input
                type="date"
                className="h-8 w-34 text-[13px]"
                value={state.to}
                min={state.from || undefined}
                onChange={(e) => update({ to: e.target.value })}
                aria-label="Jusqu’au"
              />
            </div>
            {state.actor && (
              <Badge tone="info" size="md">
                Auteur filtré{' '}
                <button type="button" className="ml-1 font-bold" onClick={() => update({ actor: '' })} aria-label="Retirer le filtre auteur">
                  ×
                </button>
              </Badge>
            )}
            {hasFilters && (
              <Button size="sm" variant="ghost" leftIcon={<FilterX className="size-4" />} onClick={reset}>
                Effacer
              </Button>
            )}
          </>
        }
        footer={
          rows && rows.length > 0 && <LoadMore hasMore={query.hasNextPage} loading={query.isFetchingNextPage} onLoadMore={() => void query.fetchNextPage()} />
        }
      />

      <Drawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? actionLabel(selected.action) : ''}
        description={selected ? formatDateTime(selected.createdAt) : undefined}
        width="lg"
      >
        {selected && (
          <div className="space-y-5">
            <DescriptionList
              items={[
                { label: 'Action', value: <span className="font-mono text-xs">{selected.action}</span> },
                { label: 'Type d’auteur', value: actorRoleLabel(selected.actorRole) },
                { label: 'Auteur', value: selected.actorName ?? selected.actorEmail ?? '—' },
                { label: 'E-mail', value: selected.actorEmail },
                {
                  label: 'Entreprise',
                  value: selected.businessId ? (
                    <Link className="text-brand-600 hover:underline" to={paths.business(selected.businessId)}>
                      {selected.businessName}
                    </Link>
                  ) : (
                    'Plateforme'
                  ),
                },
                {
                  label: 'Ressource',
                  value: (
                    <span className="font-mono text-xs">
                      {selected.resourceType}
                      {selected.resourceId ? ` · ${selected.resourceId}` : ''}
                    </span>
                  ),
                },
                { label: 'Identifiant', value: <span className="font-mono text-xs">{selected.id}</span> },
              ]}
            />
            <Field label="Données de l’action (metadata)">
              <pre className="max-h-[50vh] overflow-auto rounded-xl border border-border bg-surface-2 p-4 font-mono text-xs leading-relaxed text-fg-muted">
                {JSON.stringify(selected.metadata, null, 2)}
              </pre>
            </Field>
            {selected.actorId && (
              <Button
                size="sm"
                onClick={() => {
                  update({ actor: selected.actorId ?? '' })
                  setSelected(null)
                }}
              >
                Voir toutes les actions de cet auteur
              </Button>
            )}
          </div>
        )}
      </Drawer>
    </>
  )
}
