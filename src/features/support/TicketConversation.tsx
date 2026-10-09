import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Link } from 'react-router'
import { ArrowLeft, Building2, Lock, Send, StickyNote, UserCheck, UserMinus } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Badge, StatusBadge } from '@/components/ui/Badge'
import { Button, IconButton } from '@/components/ui/Button'
import { Select, Textarea } from '@/components/ui/Field'
import { ErrorState, Kbd, Skeleton } from '@/components/ui/States'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/core/auth'
import { enumOptions, TICKET_PRIORITY, TICKET_STATUS, type TicketPriority, type TicketStatus } from '@/core/config/domain'
import { paths } from '@/core/router/navigation'
import { cn } from '@/core/utils/cn'
import { formatDateTime, formatRelative } from '@/core/utils/format'
import { useReplyTicket, useTicket, useUpdateTicket } from './api'
import type { TicketMessage } from './support.repository'

function MessageBubble({ m }: { m: TicketMessage }) {
  return (
    <div className={cn('flex gap-3', m.isStaff && 'flex-row-reverse')}>
      <Avatar name={m.authorName} seed={m.authorId ?? undefined} size="sm" />
      <div className={cn('max-w-[85%] min-w-0 sm:max-w-[75%]', m.isStaff && 'items-end text-right')}>
        <p className="mb-1 text-[11px] text-fg-subtle">
          <span className="font-semibold text-fg-muted">{m.authorName ?? (m.isStaff ? 'Équipe JËND PRO' : 'Demandeur')}</span>
          {' · '}
          <time dateTime={m.createdAt} title={formatDateTime(m.createdAt)}>
            {formatRelative(m.createdAt)}
          </time>
        </p>
        <div
          className={cn(
            'inline-block rounded-2xl px-3.5 py-2.5 text-left text-[13px] leading-relaxed whitespace-pre-wrap break-words',
            m.isInternal
              ? 'border border-dashed border-accent/50 bg-accent-soft text-fg'
              : m.isStaff
                ? 'rounded-tr-md bg-brand-600 text-white dark:bg-brand-500 dark:text-brand-fg'
                : 'rounded-tl-md border border-border bg-surface-2 text-fg',
          )}
        >
          {m.isInternal && (
            <span className="mb-1 flex items-center gap-1 text-[10px] font-bold tracking-wider text-accent-fg uppercase">
              <Lock className="size-3" /> Note interne
            </span>
          )}
          {m.body}
        </div>
      </div>
    </div>
  )
}

export function TicketConversation({ ticketId, onBack }: { ticketId: string; onBack: () => void }) {
  const { can, user } = useAuth()
  const toast = useToast()
  const query = useTicket(ticketId)
  const reply = useReplyTicket(ticketId)
  const update = useUpdateTicket(ticketId)
  const [body, setBody] = useState('')
  const [internal, setInternal] = useState(false)
  const thread = useRef<HTMLDivElement>(null)
  const canManage = can('support.manage')
  const t = query.data

  useEffect(() => {
    thread.current?.scrollTo({ top: thread.current.scrollHeight, behavior: 'smooth' })
  }, [t?.messages.length])

  if (query.isPending) {
    return (
      <div className="space-y-4 p-5">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="mt-8 h-20 w-3/4" />
        <Skeleton className="ml-auto h-16 w-2/3" />
      </div>
    )
  }
  if (query.isError || !t) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />

  const closed = t.status === 'CLOSED'
  const send = async () => {
    const text = body.trim()
    if (!text) return
    try {
      await reply.mutateAsync({ body: text, internal })
      setBody('')
      toast.success(internal ? 'Note interne ajoutée' : 'Réponse envoyée', internal ? undefined : 'Le demandeur est notifié dans l’application.')
    } catch (e) {
      toast.error(e)
    }
  }
  const change = async (patch: Parameters<typeof update.mutateAsync>[0], label: string) => {
    try {
      await update.mutateAsync(patch)
      toast.success(label)
    } catch (e) {
      toast.error(e)
    }
  }
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      void send()
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-border px-4 py-3.5 sm:px-5">
        <div className="flex items-start gap-2">
          <IconButton label="Retour à la liste" size="sm" className="-ml-1 lg:hidden" onClick={onBack}>
            <ArrowLeft className="size-4" />
          </IconButton>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-xs font-semibold text-fg-subtle">#{t.number}</p>
            <h2 className="mt-0.5 text-base leading-snug font-bold text-fg">{t.subject}</h2>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-fg-muted">
              <span>{t.requesterName ?? t.requesterEmail}</span>
              {t.requesterEmail && t.requesterName && <span className="text-fg-subtle">{t.requesterEmail}</span>}
              {t.businessId && (
                <Link to={paths.business(t.businessId)} className="inline-flex items-center gap-1 font-semibold text-fg hover:text-brand-600">
                  <Building2 className="size-3.5" />
                  {t.businessName}
                </Link>
              )}
              <span className="text-fg-subtle">· ouvert {formatRelative(t.createdAt)}</span>
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {canManage ? (
            <>
              <Select<TicketStatus>
                size="sm"
                className="w-44"
                aria-label="Statut"
                value={t.status}
                onValueChange={(v) => v && v !== t.status && void change({ status: v }, `Statut : ${TICKET_STATUS[v].label}`)}
                options={enumOptions(TICKET_STATUS)}
                disabled={update.isPending}
              />
              <Select<TicketPriority>
                size="sm"
                className="w-32"
                aria-label="Priorité"
                value={t.priority}
                onValueChange={(v) => v && v !== t.priority && void change({ priority: v }, `Priorité : ${TICKET_PRIORITY[v].label}`)}
                options={enumOptions(TICKET_PRIORITY)}
                disabled={update.isPending}
              />
              {t.assignedTo === user?.id ? (
                <Button
                  size="sm"
                  variant="ghost"
                  leftIcon={<UserMinus className="size-4" />}
                  onClick={() => void change({ unassign: true }, 'Ticket désassigné')}
                  disabled={update.isPending}
                >
                  Me retirer
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="subtle"
                  leftIcon={<UserCheck className="size-4" />}
                  onClick={() => user && void change({ assignedTo: user.id }, 'Ticket assigné')}
                  disabled={update.isPending}
                >
                  {t.assignedTo ? 'Reprendre' : 'M’assigner'}
                </Button>
              )}
            </>
          ) : (
            <>
              <StatusBadge value={t.status} map={TICKET_STATUS} size="md" />
              <StatusBadge value={t.priority} map={TICKET_PRIORITY} size="md" />
            </>
          )}
          <span className="ml-auto text-xs text-fg-subtle">
            {t.assigneeName ? (
              <>
                Assigné à <span className="font-semibold text-fg-muted">{t.assigneeName}</span>
              </>
            ) : (
              <Badge tone="warning">Non assigné</Badge>
            )}
          </span>
        </div>
      </div>

      <div
        ref={thread}
        className="flex-1 space-y-5 overflow-y-auto bg-[radial-gradient(var(--border)_1px,transparent_1px)] [background-size:18px_18px] px-4 py-5 sm:px-5"
      >
        {t.messages.map((m) => (
          <MessageBubble key={m.id} m={m} />
        ))}
        {closed && <p className="text-center text-xs font-medium text-fg-subtle">— Ticket fermé {t.closedAt ? formatRelative(t.closedAt) : ''} —</p>}
      </div>

      {canManage && (
        <div className={cn('border-t border-border p-3 sm:p-4', internal && 'bg-accent-soft/60')}>
          <Textarea
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={onKeyDown}
            maxLength={5000}
            disabled={closed && !internal}
            placeholder={
              closed && !internal
                ? 'Ticket fermé : rouvrez-le pour répondre, ou ajoutez une note interne.'
                : internal
                  ? 'Note visible uniquement par l’équipe…'
                  : 'Votre réponse au demandeur…'
            }
            aria-label="Message"
          />
          <div className="mt-2.5 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-[13px] font-medium text-fg-muted">
              <input type="checkbox" className="size-4 accent-amber-500" checked={internal} onChange={(e) => setInternal(e.target.checked)} />
              <StickyNote className="size-4" /> Note interne
            </label>
            <span className="hidden items-center gap-1 text-[11px] text-fg-subtle sm:flex">
              <Kbd>Ctrl</Kbd>+<Kbd>Entrée</Kbd> pour envoyer
            </span>
            <Button
              className="ml-auto"
              variant={internal ? 'secondary' : 'primary'}
              size="sm"
              leftIcon={<Send className="size-4" />}
              loading={reply.isPending}
              disabled={!body.trim() || (closed && !internal)}
              onClick={() => void send()}
            >
              {internal ? 'Ajouter la note' : 'Envoyer'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
