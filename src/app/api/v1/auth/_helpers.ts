// Shared helpers for auth API routes

import { db } from '@/lib/db'
import { generateAccessToken, generateRefreshToken } from '@/lib/jwt'
import { getUserPermissions, getUserRoles } from '@/lib/permissions'
import { createAuditLog, AuditActions } from '@/lib/audit'

/**
 * Build the standard user response object with roles, permissions, and profile.
 */
export async function buildUserResponse(user: {
  id: string
  mobile: string
  email: string | null
  isMobileVerified: boolean
  status: string
  profile: { firstName: string | null; lastName: string | null; nationalCode: string | null; avatar: string | null } | null
  agent: { id: string; businessName: string | null; status: string } | null
}) {
  const [roles, permissions] = await Promise.all([
    getUserRoles(user.id),
    getUserPermissions(user.id),
  ])

  return {
    id: user.id,
    mobile: user.mobile,
    email: user.email,
    isMobileVerified: user.isMobileVerified,
    status: user.status,
    roles,
    permissions,
    profile: user.profile
      ? {
          firstName: user.profile.firstName,
          lastName: user.profile.lastName,
          nationalCode: user.profile.nationalCode,
          avatar: user.profile.avatar,
        }
      : null,
  }
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

/**
 * Generate access + refresh tokens, store the refresh token in the DB,
 * and optionally create audit & login logs.
 */
export async function generateAuthTokens(params: {
  userId: string
  device?: string | null
  ip?: string | null
  createLogs?: boolean
  mobile?: string
}): Promise<AuthTokens> {
  const { userId, device, ip, createLogs = true, mobile } = params

  const [roles, permissions] = await Promise.all([
    getUserRoles(userId),
    getUserPermissions(userId),
  ])

  const accessToken = await generateAccessToken(userId, roles, permissions)
  const refreshToken = await generateRefreshToken()

  // Store refresh token in DB (expires in 30 days)
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  await db.refreshToken.create({
    data: {
      userId,
      token: refreshToken,
      expiresAt,
      device: device ?? undefined,
      ip: ip ?? undefined,
    },
  })

  if (createLogs) {
    // Create login log
    await db.loginLog.create({
      data: {
        userId,
        mobile,
        ip: ip ?? undefined,
        device: device ?? undefined,
        status: 'SUCCESS',
      },
    })

    // Create audit log (fire-and-forget)
    createAuditLog({
      userId,
      action: AuditActions.USER_LOGIN,
      entity: 'User',
      entityId: userId,
      ip: ip ?? undefined,
      device: device ?? undefined,
    })
  }

  return { accessToken, refreshToken }
}

/**
 * Extract client IP from the request.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() ?? 'unknown'
  }
  return 'unknown'
}
