import type { Database } from '@/core/api/database.types'
import { unwrap } from '@/core/api/errors'
import type { SupabaseClient } from '@/core/api/supabase'
import type { AuditEntry, AuditRepository } from './audit.repository'

type Row = Database['public']['Functions']['admin_get_audit_log']['Returns'][number]

export const AUDIT_PAGE_SIZE = 50

export function mapAuditRow(r: Row): AuditEntry {
  const metadata = r.metadata
  return {
    id: r.id,
    createdAt: r.created_at,
    businessId: r.business_id ?? null,
    businessName: r.business_name ?? null,
    action: r.action,
    resourceType: r.resource_type,
    resourceId: r.resource_id ?? null,
    actorId: r.actor_id ?? null,
    actorName: r.actor_name ?? null,
    actorEmail: r.actor_email ?? null,
    actorRole: r.actor_role ?? null,
    metadata: typeof metadata === 'object' && metadata !== null && !Array.isArray(metadata) ? (metadata as Record<string, unknown>) : {},
  }
}

export function createSupabaseAuditRepository(client: SupabaseClient): AuditRepository {
  return {
    async list(filters, cursor, limit = AUDIT_PAGE_SIZE) {
      const rows = unwrap(
        await client.rpc('admin_get_audit_log', {
          p_limit: limit,
          p_before: cursor?.before,
          p_before_id: cursor?.beforeId,
          p_business_id: filters.businessId,
          p_action: filters.action || undefined,
          p_resource_type: filters.resourceType || undefined,
          p_actor_id: filters.actorId,
          p_from: filters.from,
          p_to: filters.to,
        }),
      )
      const entries = (rows ?? []).map(mapAuditRow)
      const last = entries.at(-1)
      return { entries, next: entries.length === limit && last ? { before: last.createdAt, beforeId: last.id } : null }
    },
  }
}
