import { NextRequest } from 'next/server'
import { verifyAccessToken, TokenPayload } from './jwt'
import { db } from './db'

interface AuthResult {
  authenticated: boolean
  payload: TokenPayload | null
  error: string | null
}

interface RequireAuthResult {
  user: TokenPayload
}

interface PermissionResult {
  authorized: boolean
  payload: TokenPayload | null
  error: string | null
}

/**
 * Extract and verify JWT from the Authorization header.
 *
 * Expects the header format: `Authorization: Bearer <token>`
 *
 * @example
 * ```ts
 * const { authenticated, payload, error } = await authenticateRequest(request)
 * if (!authenticated) return errorResponse('UNAUTHORIZED', error!, 401)
 * ```
 */
export async function authenticateRequest(
  request: NextRequest
): Promise<AuthResult> {
  let authHeader = request.headers.get('x-app-authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const standardHeader = request.headers.get('authorization')
    if (standardHeader && standardHeader.startsWith('Bearer ')) {
      authHeader = standardHeader
    }
  }

  if (!authHeader) {
    return {
      authenticated: false,
      payload: null,
      error: 'Missing authorization header',
    }
  }

  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return {
      authenticated: false,
      payload: null,
      error: 'Invalid authorization header format. Expected: Bearer <token>',
    }
  }

  const token = parts[1]
  const payload = await verifyAccessToken(token)

  if (!payload || typeof payload.sub !== 'string' || !payload.sub) {
    return {
      authenticated: false,
      payload: null,
      error: 'Invalid or expired token',
    }
  }

  // Signed claims bound the session; current database grants bound authority.
  // Revocation applies on the next check without granting new token privileges.
  try {
    const user = await db.user.findUnique({
      where: { id: payload.sub },
      select: {
        status: true, deletedAt: true,
        roles: { select: { role: { select: {
          name: true,
          rolePermissions: { select: { permission: { select: { name: true } } } },
        } } } },
      },
    })

    if (!user || user.deletedAt || user.status !== 'ACTIVE') {
      return {
        authenticated: false,
        payload: null,
        error: 'Invalid or inactive account authorization',
      }
    }

    const currentRoles = new Set(user.roles.map(link => link.role.name))
    const currentPermissions = new Set(user.roles.flatMap(link =>
      link.role.rolePermissions.map(grant => grant.permission.name)))
    const tokenRoles = Array.isArray(payload.roles) ? payload.roles : []
    const tokenPermissions = Array.isArray(payload.permissions) ? payload.permissions : []
    // Wildcards intersect semantically: neither side can widen the other.
    const permissions = currentPermissions.has('*')
      ? tokenPermissions
      : tokenPermissions.includes('*')
        ? [...currentPermissions]
        : tokenPermissions.filter(permission => currentPermissions.has(permission))

    return {
      authenticated: true,
      payload: {
        ...payload,
        roles: [...new Set(tokenRoles.filter(role => currentRoles.has(role)))],
        permissions: [...new Set(permissions)],
      },
      error: null,
    }
  } catch {
    // Never turn an authorization-store outage into authenticated access.
    // Keep credentials, identity and query details out of this error log.
    console.error('[auth.ts:authenticateRequest] authorization lookup unavailable')
    return { authenticated: false, payload: null, error: 'Account authorization unavailable' }
  }
}

/**
 * Authentication guard — verify JWT and return the user payload or throw.
 * Returns a `{ user }` object on success so callers can destructure directly.
 *
 * @example
 * ```ts
 * try {
 *   const { user } = await requireAuth(request)
 *   // user.sub is the userId, user.roles, user.permissions
 * } catch (e) {
 *   return errorResponse('UNAUTHORIZED', (e as Error).message, 401)
 * }
 * ```
 */
export async function requireAuth(
  request: NextRequest
): Promise<RequireAuthResult> {
  const { authenticated, payload, error } = await authenticateRequest(request)

  if (!authenticated || !payload) {
    throw new Error(error ?? 'توکن نامعتبر یا منقضی شده است')
  }

  return { user: payload }
}

/**
 * Role guard — authenticate and check if the user has a required role.
 *
 * @example
 * ```ts
 * const { authorized, payload, error } = await requireRole(request, 'DOCTOR')
 * if (!authorized) return errorResponse('FORBIDDEN', error!, 403)
 * ```
 */
export async function requireRole(
  request: NextRequest,
  role: string
): Promise<PermissionResult> {
  const { authenticated, payload, error } = await authenticateRequest(request)

  if (!authenticated || !payload) {
    return {
      authorized: false,
      payload: null,
      error,
    }
  }

  if (!payload.roles.includes(role)) {
    return {
      authorized: false,
      payload,
      error: `دسترسی محدود شده. نقش "${role}" مورد نیاز است`,
    }
  }

  return {
    authorized: true,
    payload,
    error: null,
  }
}

/**
 * Permission guard — authenticate and then check if the user has a required permission.
 *
 * @example
 * ```ts
 * const { authorized, payload, error } = await requirePermission(request, 'manage_users')
 * if (!authorized) return errorResponse('FORBIDDEN', error!, 403)
 * ```
 */
export async function requirePermission(
  request: NextRequest,
  permission: string
): Promise<PermissionResult> {
  const { authenticated, payload, error } = await authenticateRequest(request)

  if (!authenticated || !payload) {
    return {
      authorized: false,
      payload: null,
      error,
    }
  }

  const hasWildcard = payload.permissions.includes('*')
  const isSuperAdmin = payload.roles.includes('SUPER_ADMIN') || payload.roles.includes('ADMIN')

  if (!hasWildcard && !isSuperAdmin && !payload.permissions.includes(permission)) {
    return {
      authorized: false,
      payload,
      error: `Permission denied: required '${permission}'`,
    }
  }

  return {
    authorized: true,
    payload,
    error: null,
  }
}

/**
 * Permission guard for endpoints that accept any one of multiple permissions.
 */
export async function requireAnyPermission(
  request: NextRequest,
  permissions: string[]
): Promise<PermissionResult> {
  const { authenticated, payload, error } = await authenticateRequest(request)

  if (!authenticated || !payload) {
    return {
      authorized: false,
      payload: null,
      error,
    }
  }

  const hasWildcard = payload.permissions.includes('*')
  const isSuperAdmin = payload.roles.includes('SUPER_ADMIN') || payload.roles.includes('ADMIN')

  const hasPermission =
    hasWildcard ||
    isSuperAdmin ||
    permissions.some((permission) => payload.permissions.includes(permission))

  if (!hasPermission) {
    return {
      authorized: false,
      payload,
      error: `Permission denied: required one of '${permissions.join("', '")}'`,
    }
  }

  return {
    authorized: true,
    payload,
    error: null,
  }
}

export function canManagePayments(payload: { roles: string[]; permissions: string[] }): boolean {
  return (
    payload.roles.includes('SUPER_ADMIN') ||
    payload.roles.includes('ADMIN') ||
    payload.permissions.includes('manage_payments')
  )
}
