import { NextRequest } from 'next/server'
import { z } from 'zod'
import { successResponse, errorResponse } from '@/lib/api-response'
import { db } from '@/lib/db'
import { generateAuthTokens, getClientIp } from '../_helpers'

// Zod schema for request body
const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'توکن بازنشانی الزامی است'),
})

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json()
    const parsed = refreshSchema.safeParse(body)

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]
      return errorResponse(
        'VALIDATION_ERROR',
        firstError?.message ?? 'اطلاعات وارد شده نامعتبر است',
        422
      )
    }

    const { refreshToken } = parsed.data
    const ip = getClientIp(request)

    // Find refresh token in database
    const storedToken = await db.refreshToken.findUnique({
      where: { token: refreshToken },
      include: {
        user: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    })

    if (!storedToken) {
      return errorResponse('INVALID_TOKEN', 'توکن بازنشانی نامعتبر است', 401)
    }

    // Check if token is already revoked
    if (storedToken.revokedAt) {
      return errorResponse('TOKEN_REVOKED', 'توکن بازنشانی ابطال شده است', 401)
    }

    // Check if token has expired
    if (storedToken.expiresAt < new Date()) {
      // Revoke expired token
      await db.refreshToken.update({
        where: { id: storedToken.id },
        data: { revokedAt: new Date() },
      })
      return errorResponse('TOKEN_EXPIRED', 'توکن بازنشانی منقضی شده است', 401)
    }

    // Verify user is still active
    if (!storedToken.user || storedToken.user.status !== 'ACTIVE') {
      // Revoke token for inactive users
      await db.refreshToken.update({
        where: { id: storedToken.id },
        data: { revokedAt: new Date() },
      })
      return errorResponse('USER_INACTIVE', 'حساب کاربری غیرفعال است', 403)
    }

    // Revoke old refresh token
    await db.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    })

    // Generate new tokens
    const tokens = await generateAuthTokens({
      userId: storedToken.userId,
      device: storedToken.device,
      ip,
      createLogs: false, // Don't create duplicate login logs for refresh
    })

    return successResponse(tokens, 'توکن‌ها با موفقیت بازنشانی شدند')
  } catch {
    return errorResponse('INTERNAL_ERROR', 'خطای داخلی سرور', 500)
  }
}
