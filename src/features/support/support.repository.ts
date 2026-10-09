import type { Page, PageRequest } from '@/core/api/paging'
import type { TicketPriority, TicketStatus } from '@/core/config/domain'

export interface TicketFilters {
  status?: TicketStatus
  priority?: TicketPriority
  assignedTo?: string
  unassigned?: boolean
  businessId?: string
  search?: string
  /** OPEN + IN_PROGRESS + WAITING */
  openOnly?: boolean
}

export interface TicketListItem {
  id: string
  number: number
  subject: string
  status: TicketStatus
  priority: TicketPriority
  businessId: string | null
  businessName: string | null
  requesterId: string | null
  requesterName: string | null
  requesterEmail: string | null
  assignedTo: string | null
  assigneeName: string | null
  messagesCount: number
  lastMessageAt: string
  createdAt: string
}

export interface TicketMessage {
  id: string
  authorId: string | null
  authorName: string | null
  isStaff: boolean
  isInternal: boolean
  body: string
  createdAt: string
}

export interface TicketDetail extends Omit<TicketListItem, 'messagesCount'> {
  resolvedAt: string | null
  closedAt: string | null
  messages: TicketMessage[]
}

export interface TicketUpdate {
  status?: TicketStatus
  priority?: TicketPriority
  assignedTo?: string
  unassign?: boolean
}

export interface SupportRepository {
  list(filters: TicketFilters, page: PageRequest): Promise<Page<TicketListItem>>
  get(id: string): Promise<TicketDetail>
  reply(id: string, body: string, internal: boolean): Promise<void>
  update(id: string, update: TicketUpdate): Promise<void>
}

export const OPEN_TICKET_STATUSES: readonly TicketStatus[] = ['OPEN', 'IN_PROGRESS', 'WAITING']
