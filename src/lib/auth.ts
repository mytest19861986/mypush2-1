import { NextRequest } from 'next/server'
import { verifyAccessToken, TokenPayload } from './jwt'

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
  const authHeader = request.headers.get('authorization')

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

  if (!authenticated) {
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

  if (!authenticated) {
    return {
      authorized: false,
      payload: null,
      error,
    }
  }

  if (!payload.permissions.includes(permission)) {
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
