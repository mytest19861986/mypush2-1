import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAnyPermission } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'
import { createAuditLog, AuditActions } from '@/lib/audit'
import { db } from '@/lib/db'
import { getClientIp } from '../../../auth/_helpers'

const passwordLoginSchema = z.object({
  enabled: z.boolean(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, payload, error } = await requireAnyPermission(request, [
      'manage_user_passwords',
      'manage_users',
    ])

    if (!authorized) {
      return errorResponse('FORBIDDEN', error ?? 'Forbidden', payload ? 403 : 401)
    }

    const { id } = await params
    const body = await request.json()
    const parsed = passwordLoginSchema.safeParse(body)

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
      select: {
        id: true,
        passwordHash: true,
        isPasswordLoginEnabled: true,
      },
    })

    if (!user) {
      return errorResponse('NOT_FOUND', 'User not found', 404)
    }

    const { enabled } = parsed.data

    if (enabled && !user.passwordHash) {
      return errorResponse(
        'BAD_REQUEST',
        'Reset password before enabling password login',
        400
      )
    }

    const updatedUser = await db.user.update({
      where: { id },
      data: {
        isPasswordLoginEnabled: enabled,
      },
      select: {
        id: true,
        isPasswordLoginEnabled: true,
      },
    })

    createAuditLog({
      userId: payload!.sub,
      action: enabled
        ? AuditActions.PASSWORD_LOGIN_ENABLED
        : AuditActions.PASSWORD_LOGIN_DISABLED,
      entity: 'User',
      entityId: id,
      details: {
        previousEnabled: user.isPasswordLoginEnabled,
        enabled,
      },
      ip: getClientIp(request),
      device: request.headers.get('user-agent') || undefined,
    })

    return successResponse(updatedUser, 'Password login updated successfully')
  } catch {
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500)
  }
}
