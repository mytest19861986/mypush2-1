import type { AuthUser } from '@/types'

export const FULL_ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN'] as const

export const ADMIN_ACCESS_PERMISSIONS = [
  'manage_users',
  'manage_doctors',
  'manage_agents',
  'manage_sales_customers',
  'manage_commissions',
  'view_reports',
  'upload_documents',
] as const

export function hasFullAdminRole(roles: readonly string[] = []) {
  return FULL_ADMIN_ROLES.some((role) => roles.includes(role))
}

export function userCanAccessAdmin(user: Pick<AuthUser, 'roles' | 'permissions'> | null | undefined) {
  if (!user) return false

  const roles = user.roles || []
  const permissions = user.permissions || []

  if (hasFullAdminRole(roles)) return true

  const matchedPermissions = permissions.filter((permission) =>
    (ADMIN_ACCESS_PERMISSIONS as readonly string[]).includes(permission)
  )

  if (matchedPermissions.length === 0) return false

  const hasOnlyUploadDocuments =
    matchedPermissions.length === 1 && matchedPermissions[0] === 'upload_documents'

  if (hasOnlyUploadDocuments && !roles.includes('SUPPORT')) {
    return false
  }

  return true
}
