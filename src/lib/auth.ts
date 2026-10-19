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

  if (!payload) {
    return {
      authenticated: false,
      payload: null,
      error: 'Invalid or expired token',
    }
  }

  // Workstream C: Ensure disabled/blocked users immediately lose access
  // bypassing stale JWT expiry.
  try {
    const user = await db.user.findUnique({
      where: { id: payload.sub },
      select: { status: true },
    })

    if (user && user.status !== 'ACTIVE') {
      return {
        authenticated: false,
        payload: null,
        error: 'حساب کاربری مسدود یا غیرفعال شده است',
      }
    }
  } catch (err) {
    // If DB fails transiently in test/dev, continue or log error
    console.error('[auth.ts:authenticateRequest] user status check error:', err)
  }

  return {
    authenticated: true,
    payload,
    error: null,
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
