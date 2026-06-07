import { NextRequest } from 'next/server'
import { z } from 'zod'
import { successResponse, errorResponse } from '@/lib/api-response'
import { createAuditLog, AuditActions } from '@/lib/audit'
import { db } from '@/lib/db'
import { verifyPassword } from '@/lib/password'
import { rateLimit } from '@/lib/rate-limit'
import { buildUserResponse, generateAuthTokens, getClientIp } from '../_helpers'

const MAX_FAILED_ATTEMPTS = 5
const LOCK_DURATION_MS = 15 * 60 * 1000

const loginLimiter = rateLimit({ limitPerWindow: 5, windowMs: 15 * 60 * 1000 })

const loginPasswordSchema = z
  .object({
    nationalCode: z.string().optional(),
    nationalId: z.string().optional(),
    password: z.string().min(1, 'Password is required'),
    device: z.string().optional(),
  })
  .transform((data) => ({
    nationalCode: data.nationalCode ?? data.nationalId,
    password: data.password,
    device: data.device,
  }))
  .refine((data) => !!data.nationalCode, {
    message: 'National code is required',
    path: ['nationalCode'],
  })
  .refine((data) => /^\d{10}$/.test(data.nationalCode ?? ''), {
    message: 'National code must be 10 digits',
    path: ['nationalCode'],
  })

const invalidCredentials = () =>
  errorResponse('INVALID_CREDENTIALS', 'Invalid national code or password', 401)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = loginPasswordSchema.safeParse(body)

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]
      return errorResponse(
        'VALIDATION_ERROR',
        firstError?.message ?? 'Invalid request body',
        422
      )
    }

    const { nationalCode, password, device } = parsed.data
    const ip = getClientIp(request)
    const { allowed, retryAfter } = loginLimiter.check(`login-password:${nationalCode}`)

    if (!allowed) {
      return errorResponse(
        'RATE_LIMITED',
        `Too many attempts. Try again in ${retryAfter} seconds`,
        429
      )
    }

    const user = await db.user.findFirst({
      where: {
        deletedAt: null,
        profile: {
          nationalCode,
        },
      },
      include: {
        profile: {
          select: {
            firstName: true,
            lastName: true,
            nationalCode: true,
            avatar: true,
            payoutCardNumber: true,
            payoutSheba: true,
            payoutAccountOwnerName: true,
          },
        },
        agent: {
          select: {
            id: true,
            businessName: true,
            status: true,
          },
        },
      },
    })

    if (
      !user ||
      user.status !== 'ACTIVE' ||
      !user.isPasswordLoginEnabled ||
      !user.passwordHash
    ) {
      return invalidCredentials()
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return errorResponse(
        'ACCOUNT_LOCKED',
        'Account is temporarily locked. Try again later',
        423
      )
    }

    const isPasswordValid = await verifyPassword(password, user.passwordHash)

    if (!isPasswordValid) {
      const failedUser = await db.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: { increment: 1 },
        },
        select: {
          failedLoginAttempts: true,
        },
      })

      const lockedUntil =
        failedUser.failedLoginAttempts >= MAX_FAILED_ATTEMPTS
          ? new Date(Date.now() + LOCK_DURATION_MS)
          : null

      if (lockedUntil) {
        await db.user.update({
          where: { id: user.id },
          data: { lockedUntil },
        })
      }

      await db.loginLog.create({
        data: {
          userId: user.id,
          mobile: user.mobile,
          ip,
          device,
          status: 'FAILED',
        },
      })

      createAuditLog({
        userId: user.id,
        action: AuditActions.PASSWORD_LOGIN_FAILED,
        entity: 'User',
        entityId: user.id,
        details: {
          reason: 'WRONG_PASSWORD',
          failedLoginAttempts: failedUser.failedLoginAttempts,
          locked: !!lockedUntil,
        },
        ip,
        device,
      })

      return invalidCredentials()
    }

    await db.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    })

    const { accessToken, refreshToken } = await generateAuthTokens({
      userId: user.id,
      device,
      ip,
      createLogs: true,
      mobile: user.mobile,
    })

    const userData = await buildUserResponse(user)

    createAuditLog({
      userId: user.id,
      action: AuditActions.PASSWORD_LOGIN_SUCCESS,
      entity: 'User',
      entityId: user.id,
      ip,
      device,
    })

    return successResponse(
      {
        accessToken,
        refreshToken,
        user: {
          ...userData,
          mustChangePassword: user.mustChangePassword,
        },
      },
      'Login successful'
    )
  } catch {
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500)
  }
}
