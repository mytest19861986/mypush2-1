import type { NextRequest } from 'next/server'
import { authenticateRequest } from './auth'
import { db } from './db'

export async function getCurrentCommissionPaymentAccess(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (!auth.authenticated || !auth.payload) return { payload: null, error: auth.error || 'Invalid authentication' }
  // Fail closed on lookup failure, missing/deleted users and revoked permissions.
  // A signed but stale JWT cannot retain payment privileges after a DB revocation.
  const user = await db.user.findUnique({ where: { id: auth.payload.sub }, select: {
    id: true, status: true, deletedAt: true,
    roles: { select: { role: { select: { name: true, rolePermissions: { select: { permission: { select: { name: true } } } } } } } },
  } })
  if (!user || user.status !== 'ACTIVE' || user.deletedAt) return { payload: null, error: 'Inactive or missing account' }
  return { payload: {
    ...auth.payload,
    roles: user.roles.map(link => link.role.name),
    permissions: [...new Set(user.roles.flatMap(link => link.role.rolePermissions.map(grant => grant.permission.name)))],
  }, error: null }
}
