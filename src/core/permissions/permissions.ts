/**
 * Platform permissions of the back-office (jend_pro_backend, table
 * platform_permissions — docs/roles-and-permissions.md §6).
 *
 * The UI only uses them to hide / disable what the staff member cannot do.
 * The database is the authority: every admin_* RPC re-checks the permission.
 */
import type { PlatformAdminStatus, PlatformRole } from '@/core/config/domain'

export const PLATFORM_PERMISSIONS = [
  'businesses.read',
  'businesses.manage',
  'users.read',
  'subscriptions.read',
  'billing.read',
  'billing.manage',
  'support.read',
  'support.manage',
  'announcements.read',
  'announcements.manage',
  'audit.read',
  'analytics.read',
  'admins.manage',
] as const

export type PlatformPermission = (typeof PLATFORM_PERMISSIONS)[number]

export interface PlatformAccess {
  role: PlatformRole
  status: PlatformAdminStatus
  permissions: ReadonlySet<PlatformPermission>
}

export function isPlatformPermission(value: string): value is PlatformPermission {
  return (PLATFORM_PERMISSIONS as readonly string[]).includes(value)
}

/** Unknown codes (newer backend) are ignored rather than trusted. */
export function toPermissionSet(codes: readonly string[]): ReadonlySet<PlatformPermission> {
  return new Set(codes.filter(isPlatformPermission))
}

export type PermissionRequirement = PlatformPermission | readonly PlatformPermission[]

/** An array requirement means "any of". */
export function can(access: PlatformAccess | null | undefined, requirement: PermissionRequirement | undefined): boolean {
  if (!requirement) return true
  if (!access || access.status !== 'ACTIVE') return false
  const required: readonly PlatformPermission[] = typeof requirement === 'string' ? [requirement] : requirement
  return required.some((p) => access.permissions.has(p))
}
