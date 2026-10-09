import type { PlatformAdminStatus, PlatformRole } from '@/core/config/domain'

export interface PlatformAdmin {
  userId: string
  email: string
  fullName: string | null
  role: PlatformRole
  status: PlatformAdminStatus
  createdAt: string
  lastSignInAt: string | null
}

/** JËND PRO staff management (admins.manage — SUPER_ADMIN only). */
export interface TeamRepository {
  list(): Promise<PlatformAdmin[]>
  /** The account must already exist (the person signs up first). */
  grantRole(email: string, role: PlatformRole): Promise<void>
  setStatus(userId: string, status: PlatformAdminStatus): Promise<void>
  /** Read-only matrix role → permissions (table platform_role_permissions). */
  roleMatrix(): Promise<Array<{ role: PlatformRole; permission: string }>>
}
