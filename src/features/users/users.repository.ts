import type { Page, PageRequest } from '@/core/api/paging'
import type { BusinessStatus, MemberStatus, PlatformAdminStatus, PlatformRole } from '@/core/config/domain'

export interface UserListItem {
  id: string
  email: string
  phone: string | null
  fullName: string | null
  createdAt: string
  lastSignInAt: string | null
  emailConfirmed: boolean
  businessesCount: number
  platformRole: PlatformRole | null
}

export interface UserMembership {
  businessId: string
  businessName: string
  businessStatus: BusinessStatus
  roleCode: string
  roleName: string
  status: MemberStatus
  joinedAt: string | null
  createdAt: string
}

export interface UserDetail {
  id: string
  email: string
  phone: string | null
  fullName: string | null
  locale: string | null
  createdAt: string
  lastSignInAt: string | null
  emailConfirmed: boolean
  bannedUntil: string | null
  platformRole: PlatformRole | null
  platformStatus: PlatformAdminStatus | null
  memberships: UserMembership[]
}

export interface UsersRepository {
  list(search: string | undefined, page: PageRequest): Promise<Page<UserListItem>>
  get(id: string): Promise<UserDetail>
}
