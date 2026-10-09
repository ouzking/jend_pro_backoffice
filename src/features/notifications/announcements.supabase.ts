import { unwrap } from '@/core/api/errors'
import { toLimitOffset, toPage } from '@/core/api/paging'
import type { SupabaseClient } from '@/core/api/supabase'
import type { AnnouncementsRepository } from './announcements.repository'

export function createSupabaseAnnouncementsRepository(client: SupabaseClient): AnnouncementsRepository {
  return {
    async list(page) {
      const rows = unwrap(await client.rpc('admin_list_announcements', toLimitOffset(page)))
      return toPage(rows, (r) => ({
        id: r.id,
        title: r.title,
        body: r.body,
        audience: r.audience,
        audienceValue: r.audience_value ?? null,
        audienceLabel: r.audience_label ?? null,
        status: r.status,
        recipientsCount: r.recipients_count ?? null,
        createdByName: r.created_by_name ?? null,
        sentByName: r.sent_by_name ?? null,
        sentAt: r.sent_at ?? null,
        createdAt: r.created_at,
      }))
    },
    async save(draft) {
      const id = unwrap(
        await client.rpc('admin_save_announcement', {
          // The RPC creates when p_id is NULL (generated types mark it as required).
          p_id: (draft.id ?? null) as unknown as string,
          p_title: draft.title,
          p_body: draft.body,
          p_audience: draft.audience,
          p_audience_value: draft.audience === 'ALL' ? undefined : (draft.audienceValue ?? undefined),
        }),
      )
      if (!id) throw new Error('Enregistrement impossible.')
      return id
    },
    async remove(id) {
      unwrap(await client.rpc('admin_delete_announcement', { p_id: id }))
    },
    async countRecipients(audience, audienceValue) {
      const count = unwrap(
        await client.rpc('admin_count_announcement_recipients', {
          p_audience: audience,
          p_audience_value: audience === 'ALL' ? undefined : (audienceValue ?? undefined),
        }),
      )
      return count ?? 0
    },
    async send(id) {
      return unwrap(await client.rpc('admin_send_announcement', { p_id: id })) ?? 0
    },
  }
}
