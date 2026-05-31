import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAnyPermission } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'
import { createAuditLog, AuditActions } from '@/lib/audit'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/password'
import { getClientIp } from '../../../auth/_helpers'

const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, payload, error } = await requireAnyPermission(request, [
      'manage_user_passwords',
      'reset_user_password',
    ])

    if (!authorized) {
      return errorResponse('FORBIDDEN', error ?? 'Forbidden', payload ? 403 : 401)
    }

    const { id } = await params
    const body = await request.json()
    const parsed = resetPasswordSchema.safeParse(body)

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]
      return errorResponse(
        'VALIDATION_ERROR',
        firstError?.message ?? 'Invalid request body',
        422
      )
    }

    const user = await db.user.findUnique({
      where: { id, deletedAt: null },
      select: { id: true },
    })

    if (!user) {
      return errorResponse('NOT_FOUND', 'User not found', 404)
    }

    const passwordHash = await hashPassword(parsed.data.newPassword)
    const passwordChangedAt = new Date()

    const updatedUser = await db.user.update({
      where: { id },
      data: {
        passwordHash,
        isPasswordLoginEnabled: true,
        mustChangePassword: true,
        passwordChangedAt,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
      select: {
        id: true,
        isPasswordLoginEnabled: true,
        mustChangePassword: true,
        passwordChangedAt: true,
      },
    })

    createAuditLog({
      userId: payload!.sub,
      action: AuditActions.PASSWORD_RESET_BY_ADMIN,
      entity: 'User',
      entityId: id,
      ip: getClientIp(request),
      device: request.headers.get('user-agent') || undefined,
    })

    return successResponse(updatedUser, 'Password reset successfully')
  } catch {
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500)
  }
}
