export interface AuditFilters {
  businessId?: string
  /** Exact action or domain prefix ("member" matches member.*). */
  action?: string
  resourceType?: string
  actorId?: string
  from?: string
  to?: string
}

export interface AuditEntry {
  id: string
  createdAt: string
  businessId: string | null
  businessName: string | null
  action: string
  resourceType: string
  resourceId: string | null
  actorId: string | null
  actorName: string | null
  actorEmail: string | null
  /** authenticated · service_role · postgres (migrations, jobs) */
  actorRole: string | null
  metadata: Record<string, unknown>
}

export interface AuditCursor {
  before: string
  beforeId: string
}

export interface AuditPage {
  entries: AuditEntry[]
  next: AuditCursor | null
}

/** Immutable, platform-wide journal (keyset pagination: newest first). */
export interface AuditRepository {
  list(filters: AuditFilters, cursor: AuditCursor | null, limit?: number): Promise<AuditPage>
}
