import { NextRequest } from 'next/server'
import { successResponse, errorResponse } from '@/lib/api-response'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth'
import { createAuditLog, AuditActions } from '@/lib/audit'
import { getClientIp } from '../_helpers'

export async function POST(request: NextRequest) {
  try {
    // Authenticate the request
    const { authenticated, payload, error } = await authenticateRequest(request)

    if (!authenticated) {
      return errorResponse('UNAUTHORIZED', error!, 401)
    }

    const userId = payload!.sub
    const ip = getClientIp(request)

    // Revoke all refresh tokens for the user
    await db.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    })

    // Create audit log
    createAuditLog({
      userId,
      action: AuditActions.USER_LOGOUT,
      entity: 'User',
      entityId: userId,
      ip,
    })

    return successResponse(null, 'با موفقیت خارج شدید')
  } catch {
    return errorResponse('INTERNAL_ERROR', 'خطای داخلی سرور', 500)
  }
}
