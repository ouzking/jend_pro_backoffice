import { unwrap } from '@/core/api/errors'
import type { SupabaseClient } from '@/core/api/supabase'
import type { TeamRepository } from './team.repository'

export function createSupabaseTeamRepository(client: SupabaseClient): TeamRepository {
  return {
    async list() {
      const rows = unwrap(await client.rpc('admin_list_admins'))
      return (rows ?? []).map((r) => ({
        userId: r.user_id,
        email: r.email,
        fullName: r.full_name ?? null,
        role: r.role,
        status: r.status,
        createdAt: r.created_at,
        lastSignInAt: r.last_sign_in_at ?? null,
      }))
    },
    async grantRole(email, role) {
      unwrap(await client.rpc('admin_grant_platform_role', { p_email: email.trim(), p_role: role }))
    },
    async setStatus(userId, status) {
      unwrap(await client.rpc('admin_set_admin_status', { p_user_id: userId, p_status: status }))
    },
    async roleMatrix() {
      const rows = unwrap(await client.from('platform_role_permissions').select('role, permission_code'))
      return (rows ?? []).map((r) => ({ role: r.role, permission: r.permission_code }))
    },
  }
}
