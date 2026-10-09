import { unwrap } from '@/core/api/errors'
import { toLimitOffset, toPage } from '@/core/api/paging'
import type { SupabaseClient } from '@/core/api/supabase'
import type { TicketPriority, TicketStatus } from '@/core/config/domain'
import type { SupportRepository, TicketDetail } from './support.repository'

/** Shape of admin_get_support_ticket (jsonb). */
interface TicketJson {
  id: string
  number: number
  subject: string
  status: TicketStatus
  priority: TicketPriority
  business_id: string | null
  business_name: string | null
  created_by: string | null
  requester_name: string | null
  requester_email: string | null
  assigned_to: string | null
  assignee_name: string | null
  last_message_at: string
  resolved_at: string | null
  closed_at: string | null
  created_at: string
  messages: Array<{
    id: string
    author_id: string | null
    author_name: string | null
    is_staff: boolean
    is_internal: boolean
    body: string
    created_at: string
  }>
}

export function mapTicketDetail(j: TicketJson): TicketDetail {
  return {
    id: j.id,
    number: Number(j.number),
    subject: j.subject,
    status: j.status,
    priority: j.priority,
    businessId: j.business_id,
    businessName: j.business_name,
    requesterId: j.created_by,
    requesterName: j.requester_name,
    requesterEmail: j.requester_email,
    assignedTo: j.assigned_to,
    assigneeName: j.assignee_name,
    lastMessageAt: j.last_message_at,
    resolvedAt: j.resolved_at,
    closedAt: j.closed_at,
    createdAt: j.created_at,
    messages: (j.messages ?? []).map((m) => ({
      id: m.id,
      authorId: m.author_id,
      authorName: m.author_name,
      isStaff: m.is_staff,
      isInternal: m.is_internal,
      body: m.body,
      createdAt: m.created_at,
    })),
  }
}

export function createSupabaseSupportRepository(client: SupabaseClient): SupportRepository {
  return {
    async list(filters, page) {
      const rows = unwrap(
        await client.rpc('admin_list_support_tickets', {
          p_status: filters.status,
          p_priority: filters.priority,
          p_assigned_to: filters.assignedTo,
          p_unassigned: filters.unassigned ?? false,
          p_business_id: filters.businessId,
          p_search: filters.search || undefined,
          p_open_only: filters.openOnly ?? false,
          ...toLimitOffset(page),
        }),
      )
      return toPage(rows, (r) => ({
        id: r.id,
        number: Number(r.number),
        subject: r.subject,
        status: r.status,
        priority: r.priority,
        businessId: r.business_id ?? null,
        businessName: r.business_name ?? null,
        requesterId: r.created_by ?? null,
        requesterName: r.requester_name ?? null,
        requesterEmail: r.requester_email ?? null,
        assignedTo: r.assigned_to ?? null,
        assigneeName: r.assignee_name ?? null,
        messagesCount: Number(r.messages_count ?? 0),
        lastMessageAt: r.last_message_at,
        createdAt: r.created_at,
      }))
    },
    async get(id) {
      const json = unwrap(await client.rpc('admin_get_support_ticket', { p_ticket_id: id }))
      return mapTicketDetail(json as unknown as TicketJson)
    },
    async reply(id, body, internal) {
      unwrap(await client.rpc('admin_reply_support_ticket', { p_ticket_id: id, p_body: body, p_internal: internal }))
    },
    async update(id, update) {
      unwrap(
        await client.rpc('admin_update_support_ticket', {
          p_ticket_id: id,
          p_status: update.status,
          p_priority: update.priority,
          p_assigned_to: update.assignedTo,
          p_unassign: update.unassign ?? false,
        }),
      )
    },
  }
}
