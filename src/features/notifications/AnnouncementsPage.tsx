import { useState } from 'react'
import { Bell, Megaphone, MoreHorizontal, Pencil, Plus, Send, Trash2, Users } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, type Column } from '@/components/tables/DataTable'
import { Badge, StatusBadge } from '@/components/ui/Badge'
import { Button, IconButton } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { Menu } from '@/components/ui/Menu'
import { Drawer } from '@/components/ui/Overlay'
import { Pagination } from '@/components/ui/Pagination'
import { Spinner } from '@/components/ui/States'
import { useToast } from '@/components/ui/Toast'
import { toApiError } from '@/core/api/errors'
import { useAuth } from '@/core/auth'
import { ANNOUNCEMENT_AUDIENCE, ANNOUNCEMENT_STATUS, BUSINESS_ROLE_LABEL, type AnnouncementAudience } from '@/core/config/domain'
import { formatDateTime, formatNumber, formatRelative } from '@/core/utils/format'
import { useDebouncedValue, useUrlState } from '@/core/utils/hooks'
import { BusinessPicker, type PickedBusiness } from '@/features/businesses/BusinessPicker'
import { usePlanOptions } from '@/features/subscriptions/api'
import type { Announcement } from './announcements.repository'
import { useAnnouncements, useDeleteAnnouncement, useRecipientCount, useSaveAnnouncement, useSendAnnouncement } from './api'

const ROLE_OPTIONS = Object.entries(BUSINESS_ROLE_LABEL).map(([value, label]) => ({ value, label }))

function audienceText(a: Pick<Announcement, 'audience' | 'audienceLabel' | 'audienceValue'>): string {
  if (a.audience === 'ALL') return ANNOUNCEMENT_AUDIENCE.ALL.label
  const target = a.audienceLabel ?? a.audienceValue ?? ''
  if (a.audience === 'PLAN') return `Plan ${target}`
  if (a.audience === 'ROLE') return `Rôle : ${BUSINESS_ROLE_LABEL[a.audienceValue ?? ''] ?? target}`
  return target
}

interface ComposerState {
  id?: string
  title: string
  body: string
  audience: AnnouncementAudience
  plan: string
  role: string
  business: PickedBusiness | null
}

const EMPTY: ComposerState = { title: '', body: '', audience: 'ALL', plan: '', role: '', business: null }

function audienceValueOf(c: ComposerState): string | null {
  if (c.audience === 'PLAN') return c.plan || null
  if (c.audience === 'ROLE') return c.role || null
  if (c.audience === 'BUSINESS') return c.business?.id ?? null
  return null
}

function Composer({ open, initial, onClose }: { open: boolean; initial: ComposerState; onClose: () => void }) {
  const toast = useToast()
  const save = useSaveAnnouncement()
  const sendMutation = useSendAnnouncement()
  const planOptions = usePlanOptions()
  // Mounted per opening (keyed by the parent): the initial state is the props.
  const [c, setC] = useState<ComposerState>(initial)
  const [confirmSend, setConfirmSend] = useState(false)

  const value = audienceValueOf(c)
  const audienceReady = c.audience === 'ALL' || Boolean(value)
  const debouncedValue = useDebouncedValue(value, 250)
  const recipients = useRecipientCount(c.audience, debouncedValue, open && audienceReady)
  const valid = c.title.trim().length >= 3 && c.body.trim().length >= 1 && audienceReady

  const persist = async (): Promise<string> => {
    const id = await save.mutateAsync({ id: c.id, title: c.title.trim(), body: c.body.trim(), audience: c.audience, audienceValue: value })
    setC((s) => ({ ...s, id }))
    return id
  }

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        width="lg"
        title={c.id ? 'Modifier le brouillon' : 'Nouvelle annonce'}
        description="Diffusée comme notification dans l’application JËND PRO (temps réel)."
        footer={
          <>
            <Button variant="ghost" onClick={onClose}>
              Fermer
            </Button>
            <Button
              disabled={!valid}
              loading={save.isPending && !confirmSend}
              onClick={async () => {
                try {
                  await persist()
                  toast.success('Brouillon enregistré')
                  onClose()
                } catch (e) {
                  toast.error(e)
                }
              }}
            >
              Enregistrer le brouillon
            </Button>
            <Button variant="primary" leftIcon={<Send className="size-4" />} disabled={!valid || recipients.isError} onClick={() => setConfirmSend(true)}>
              Envoyer…
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <Field label="Titre" required hint={`${c.title.length}/150`}>
            <Input
              value={c.title}
              maxLength={150}
              onChange={(e) => setC({ ...c, title: e.target.value })}
              placeholder="Nouvelle fonctionnalité : rapports mensuels"
              data-autofocus
            />
          </Field>
          <Field label="Message" required hint={`${c.body.length}/1000`}>
            <Textarea
              rows={5}
              value={c.body}
              maxLength={1000}
              onChange={(e) => setC({ ...c, body: e.target.value })}
              placeholder="Ce que les commerçants doivent savoir…"
            />
          </Field>

          <fieldset>
            <legend className="mb-2 text-[13px] font-semibold text-fg">Audience</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(Object.keys(ANNOUNCEMENT_AUDIENCE) as AnnouncementAudience[]).map((a) => (
                <label
                  key={a}
                  className={`flex cursor-pointer items-center justify-center rounded-xl border px-3 py-2.5 text-center text-[13px] font-semibold transition-colors ${
                    c.audience === a
                      ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300'
                      : 'border-border text-fg-muted hover:border-border-strong'
                  }`}
                >
                  <input type="radio" name="audience" value={a} className="sr-only" checked={c.audience === a} onChange={() => setC({ ...c, audience: a })} />
                  {ANNOUNCEMENT_AUDIENCE[a].label}
                </label>
              ))}
            </div>
            <div className="mt-3">
              {c.audience === 'PLAN' && (
                <Field label="Plan ciblé" required>
                  <Select value={c.plan} onValueChange={(v) => setC({ ...c, plan: v })} options={planOptions} placeholder="Choisir un plan" />
                </Field>
              )}
              {c.audience === 'ROLE' && (
                <Field label="Rôle ciblé" required hint="Tous les membres actifs ayant ce rôle, dans toutes les entreprises.">
                  <Select value={c.role} onValueChange={(v) => setC({ ...c, role: v })} options={ROLE_OPTIONS} placeholder="Choisir un rôle" />
                </Field>
              )}
              {c.audience === 'BUSINESS' && (
                <Field label="Entreprise ciblée" required>
                  <BusinessPicker value={c.business} onChange={(b) => setC({ ...c, business: b })} />
                </Field>
              )}
            </div>
            <p className="mt-3 flex items-center gap-2 rounded-lg bg-surface-3 px-3 py-2 text-[13px] text-fg-muted">
              <Users className="size-4" />
              {!audienceReady ? (
                'Précisez la cible pour estimer l’audience.'
              ) : recipients.isFetching ? (
                <>
                  <Spinner className="size-3.5" /> Calcul…
                </>
              ) : recipients.isError ? (
                <span className="text-danger">{toApiError(recipients.error).message}</span>
              ) : (
                <span>
                  <span className="font-bold text-fg tabular">{formatNumber(recipients.data)}</span> destinataire(s) actif(s)
                </span>
              )}
            </p>
          </fieldset>

          <div>
            <p className="mb-2 text-[13px] font-semibold text-fg">Aperçu</p>
            <div className="rounded-2xl border border-border bg-surface-2 p-4">
              <div className="flex gap-3 rounded-xl border border-border bg-surface p-3 shadow-card">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-500/15 text-brand-600 dark:text-brand-300">
                  <Bell className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-bold text-fg">{c.title || 'Titre de l’annonce'}</p>
                  <p className="mt-0.5 line-clamp-3 text-xs text-fg-muted whitespace-pre-wrap">{c.body || 'Le message apparaîtra ici.'}</p>
                  <p className="mt-1 text-[10px] text-fg-subtle">JËND PRO · à l’instant</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Drawer>
      <ConfirmDialog
        open={confirmSend}
        onClose={() => setConfirmSend(false)}
        tone="primary"
        title="Envoyer l’annonce ?"
        description={
          <>
            <span className="font-semibold text-fg">{formatNumber(recipients.data ?? 0)} utilisateur(s)</span> la recevront immédiatement. Un envoi ne peut pas
            être annulé.
          </>
        }
        confirmLabel="Envoyer maintenant"
        onConfirm={async () => {
          const id = await persist()
          const count = await sendMutation.mutateAsync(id)
          toast.success('Annonce envoyée', `${formatNumber(count)} destinataire(s).`)
          onClose()
        }}
      />
    </>
  )
}

const DEFAULTS = { page: 1, size: 25 }

export default function AnnouncementsPage() {
  const { can } = useAuth()
  const toast = useToast()
  const canManage = can('announcements.manage')
  const [state, update] = useUrlState(DEFAULTS)
  const query = useAnnouncements({ page: state.page, pageSize: state.size })
  const remove = useDeleteAnnouncement()
  const send = useSendAnnouncement()
  const [composer, setComposer] = useState<ComposerState | null>(null)
  const [toDelete, setToDelete] = useState<Announcement | null>(null)
  const [toSend, setToSend] = useState<Announcement | null>(null)

  const edit = (a: Announcement) =>
    setComposer({
      id: a.id,
      title: a.title,
      body: a.body,
      audience: a.audience,
      plan: a.audience === 'PLAN' ? (a.audienceValue ?? '') : '',
      role: a.audience === 'ROLE' ? (a.audienceValue ?? '') : '',
      business: a.audience === 'BUSINESS' && a.audienceValue ? { id: a.audienceValue, name: a.audienceLabel ?? 'Entreprise' } : null,
    })

  const columns: Column<Announcement>[] = [
    {
      id: 'title',
      header: 'Annonce',
      hideable: false,
      cell: (a) => (
        <div className="max-w-md min-w-0">
          <p className="truncate font-semibold text-fg">{a.title}</p>
          <p className="truncate text-xs text-fg-subtle">{a.body}</p>
        </div>
      ),
    },
    { id: 'audience', header: 'Audience', cell: (a) => <Badge tone={ANNOUNCEMENT_AUDIENCE[a.audience].tone}>{audienceText(a)}</Badge> },
    { id: 'status', header: 'Statut', cell: (a) => <StatusBadge value={a.status} map={ANNOUNCEMENT_STATUS} /> },
    {
      id: 'recipients',
      header: 'Destinataires',
      align: 'right',
      hideBelow: 'md',
      cell: (a) => (a.recipientsCount === null ? <span className="text-fg-subtle">—</span> : formatNumber(a.recipientsCount)),
    },
    {
      id: 'date',
      header: 'Date',
      hideBelow: 'sm',
      cell: (a) => (
        <div className="text-xs">
          <p className="text-fg" title={formatDateTime(a.sentAt ?? a.createdAt)}>
            {a.sentAt ? `Envoyée ${formatRelative(a.sentAt)}` : `Créée ${formatRelative(a.createdAt)}`}
          </p>
          <p className="text-fg-subtle">{a.sentByName ?? a.createdByName ?? ''}</p>
        </div>
      ),
    },
    {
      id: 'actions',
      header: '',
      hideable: false,
      align: 'right',
      cell: (a) =>
        canManage && a.status === 'DRAFT' ? (
          <div onClick={(e) => e.stopPropagation()}>
            <Menu
              trigger={(props) => (
                <IconButton label="Actions" size="sm" {...props}>
                  <MoreHorizontal className="size-4" />
                </IconButton>
              )}
              items={[
                { label: 'Modifier', icon: <Pencil />, onSelect: () => edit(a) },
                { label: 'Envoyer', icon: <Send />, onSelect: () => setToSend(a) },
                { label: 'Supprimer le brouillon', icon: <Trash2 />, danger: true, onSelect: () => setToDelete(a) },
              ]}
            />
          </div>
        ) : null,
    },
  ]

  return (
    <>
      <PageHeader
        title="Annonces"
        description="Informez les commerçants : nouveautés, maintenances, rappels. Ciblage par plan, entreprise ou rôle."
        actions={
          canManage && (
            <Button variant="primary" leftIcon={<Plus className="size-4" />} onClick={() => setComposer({ ...EMPTY })}>
              Nouvelle annonce
            </Button>
          )
        }
      />
      <DataTable
        id="announcements"
        columns={columns}
        rows={query.data?.items}
        getRowId={(a) => a.id}
        loading={query.isPending}
        fetching={query.isFetching}
        error={query.error}
        onRetry={() => void query.refetch()}
        onRowClick={canManage ? (a) => a.status === 'DRAFT' && edit(a) : undefined}
        empty={{
          icon: <Megaphone />,
          title: 'Aucune annonce',
          description: 'Les annonces envoyées et les brouillons apparaîtront ici.',
          action: canManage && (
            <Button size="sm" variant="primary" onClick={() => setComposer({ ...EMPTY })}>
              Rédiger une annonce
            </Button>
          ),
        }}
        footer={
          query.data &&
          query.data.total > state.size && (
            <Pagination page={state.page} pageSize={state.size} total={query.data.total} onPageChange={(p) => update({ page: p })} />
          )
        }
      />
      {composer && <Composer key={composer.id ?? 'new'} open initial={composer} onClose={() => setComposer(null)} />}
      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        title="Supprimer ce brouillon ?"
        description={toDelete?.title}
        confirmLabel="Supprimer"
        onConfirm={async () => {
          if (!toDelete) return
          await remove.mutateAsync(toDelete.id)
          toast.success('Brouillon supprimé')
        }}
      />
      <ConfirmDialog
        open={Boolean(toSend)}
        onClose={() => setToSend(null)}
        tone="primary"
        title="Envoyer l’annonce ?"
        description={
          <>
            « {toSend?.title} » sera envoyée à : <span className="font-semibold text-fg">{toSend ? audienceText(toSend) : ''}</span>. Un envoi ne peut pas être
            annulé.
          </>
        }
        confirmLabel="Envoyer maintenant"
        onConfirm={async () => {
          if (!toSend) return
          const count = await send.mutateAsync(toSend.id)
          toast.success('Annonce envoyée', `${formatNumber(count)} destinataire(s).`)
        }}
      />
    </>
  )
}
