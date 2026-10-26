import { NextRequest } from 'next/server'
import { authenticateRequest } from '@/lib/auth'
import { db } from '@/lib/db'
import { errorResponse } from '@/lib/api-response'

// Used by new admin features; current database permissions, not stale JWT claims,
// decide access. Existing application-wide authorization is not replaced here.
export async function requireCurrentPermission(request: NextRequest, permission: string, alternatives: string[] = []) {
  try {
    const auth = await authenticateRequest(request)
    if (!auth.authenticated || !auth.payload) return { denied: errorResponse('UNAUTHORIZED', 'ورود به حساب لازم است.', 401) }
    const user = await db.user.findUnique({
      where: { id: auth.payload.sub },
      select: { id: true, status: true, deletedAt: true, roles: { select: { role: { select: {
        name: true, rolePermissions: { select: { permission: { select: { name: true } } } },
      } } } } },
    })
    if (!user || user.deletedAt || user.status !== 'ACTIVE') return { denied: errorResponse('UNAUTHORIZED', 'حساب فعال و معتبر لازم است.', 401) }
    const roles = user.roles.map(item => item.role.name)
    const permissions = user.roles.flatMap(item => item.role.rolePermissions.map(link => link.permission.name))
    const allowed = roles.includes('SUPER_ADMIN') || roles.includes('ADMIN') || permissions.includes('*') ||
      [permission, ...alternatives].some(name => permissions.includes(name))
    if (!allowed) return { denied: errorResponse('FORBIDDEN', 'مجوز لازم برای این بخش را ندارید.', 403) }
    return { userId: user.id }
  } catch {
    return { denied: errorResponse('AUTHORIZATION_UNAVAILABLE', 'بررسی دسترسی فعلاً امکان‌پذیر نیست.', 503) }
  }
}
