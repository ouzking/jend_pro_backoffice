import { unwrap } from '@/core/api/errors'
import { toLimitOffset, toPage } from '@/core/api/paging'
import type { SupabaseClient } from '@/core/api/supabase'
import type { BusinessStatus, MemberStatus, PlatformAdminStatus, PlatformRole } from '@/core/config/domain'
import type { UserDetail, UsersRepository } from './users.repository'

/** Shape of admin_get_user (jsonb). */
interface UserDetailJson {
  id: string
  email: string
  phone: string | null
  full_name: string | null
  locale: string | null
  created_at: string
  last_sign_in_at: string | null
  email_confirmed: boolean
  banned_until: string | null
  platform_role: PlatformRole | null
  platform_status: PlatformAdminStatus | null
  memberships: Array<{
    business_id: string
    business_name: string
    business_status: BusinessStatus
    role_code: string
    role_name: string
    status: MemberStatus
    joined_at: string | null
    created_at: string
  }>
}

export function mapUserDetail(j: UserDetailJson): UserDetail {
  return {
    id: j.id,
    email: j.email,
    phone: j.phone,
    fullName: j.full_name,
    locale: j.locale,
    createdAt: j.created_at,
    lastSignInAt: j.last_sign_in_at,
    emailConfirmed: j.email_confirmed,
    bannedUntil: j.banned_until,
    platformRole: j.platform_role,
    platformStatus: j.platform_status,
    memberships: (j.memberships ?? []).map((m) => ({
      businessId: m.business_id,
      businessName: m.business_name,
      businessStatus: m.business_status,
      roleCode: m.role_code,
      roleName: m.role_name,
      status: m.status,
      joinedAt: m.joined_at,
      createdAt: m.created_at,
    })),
  }
}

export function createSupabaseUsersRepository(client: SupabaseClient): UsersRepository {
  return {
    async list(search, page) {
      const rows = unwrap(await client.rpc('admin_list_users', { p_search: search || undefined, ...toLimitOffset(page) }))
      return toPage(rows, (r) => ({
        id: r.id,
        email: r.email,
        phone: r.phone ?? null,
        fullName: r.full_name ?? null,
        createdAt: r.created_at,
        lastSignInAt: r.last_sign_in_at ?? null,
        emailConfirmed: Boolean(r.email_confirmed),
        businessesCount: Number(r.businesses_count ?? 0),
        platformRole: r.platform_role ?? null,
      }))
    },
    async get(id) {
      const json = unwrap(await client.rpc('admin_get_user', { p_user_id: id }))
      return mapUserDetail(json as unknown as UserDetailJson)
    },
  }
}
