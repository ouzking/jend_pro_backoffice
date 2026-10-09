import type { Page, PageRequest } from '@/core/api/paging'
import type { AnnouncementAudience, AnnouncementStatus } from '@/core/config/domain'

export interface Announcement {
  id: string
  title: string
  body: string
  audience: AnnouncementAudience
  /** PLAN: plan code · BUSINESS: business id · ROLE: system role code · ALL: null */
  audienceValue: string | null
  audienceLabel: string | null
  status: AnnouncementStatus
  recipientsCount: number | null
  createdByName: string | null
  sentByName: string | null
  sentAt: string | null
  createdAt: string
}

export interface AnnouncementDraft {
  id?: string
  title: string
  body: string
  audience: AnnouncementAudience
  audienceValue?: string | null
}

/**
 * Platform announcements, delivered by the backend as SYSTEM notifications
 * (in-app + Realtime) to active members of the audience.
 */
export interface AnnouncementsRepository {
  list(page: PageRequest): Promise<Page<Announcement>>
  save(draft: AnnouncementDraft): Promise<string>
  remove(id: string): Promise<void>
  countRecipients(audience: AnnouncementAudience, audienceValue: string | null | undefined): Promise<number>
  send(id: string): Promise<number>
}
