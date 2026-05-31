import { NextRequest } from 'next/server'
import { z } from 'zod'
import { authenticateRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'
import { createAuditLog, AuditActions } from '@/lib/audit'
import { db } from '@/lib/db'
import { hashPassword, verifyPassword } from '@/lib/password'
import { getClientIp } from '../_helpers'

const changePasswordSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
})

export async function POST(request: NextRequest) {
  try {
    const { authenticated, payload, error } = await authenticateRequest(request)

    if (!authenticated || !payload) {
      return errorResponse('UNAUTHORIZED', error ?? 'Unauthorized', 401)
    }

    const body = await request.json()
    const parsed = changePasswordSchema.safeParse(body)

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]
      return errorResponse(
        'VALIDATION_ERROR',
        firstError?.message ?? 'Invalid request body',
        422
      )
    }

    const user = await db.user.findUnique({
      where: { id: payload.sub, deletedAt: null },
      select: {
        id: true,
        passwordHash: true,
        mustChangePassword: true,
      },
    })

    if (!user) {
      return errorResponse('USER_NOT_FOUND', 'User not found', 404)
    }

    const { currentPassword, newPassword } = parsed.data

    // Admin-reset passwords are changed by an already authenticated user, so currentPassword is not required.
    if (!user.mustChangePassword) {
      if (!user.passwordHash) {
        return errorResponse('PASSWORD_NOT_SET', 'Password is not set', 400)
      }

      if (!currentPassword) {
        return errorResponse(
          'CURRENT_PASSWORD_REQUIRED',
          'Current password is required',
          400
        )
      }

      const isCurrentPasswordValid = await verifyPassword(
        currentPassword,
        user.passwordHash
      )

      if (!isCurrentPasswordValid) {
        return errorResponse('INVALID_CREDENTIALS', 'Current password is invalid', 401)
      }
    }

    const passwordHash = await hashPassword(newPassword)
    const passwordChangedAt = new Date()

    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        mustChangePassword: false,
        ...(user.passwordHash ? {} : { isPasswordLoginEnabled: true }),
        passwordChangedAt,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
      select: {
        id: true,
        mustChangePassword: true,
        isPasswordLoginEnabled: true,
        passwordChangedAt: true,
      },
    })

    createAuditLog({
      userId: user.id,
      action: AuditActions.PASSWORD_CHANGED,
      entity: 'User',
      entityId: user.id,
      ip: getClientIp(request),
      device: request.headers.get('user-agent') || undefined,
    })

    return successResponse(
      updatedUser,
      'Password changed successfully'
    )
  } catch {
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500)
  }
}
