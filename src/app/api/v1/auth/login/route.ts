import { NextRequest } from 'next/server'
import { z } from 'zod'
import { compare } from 'bcryptjs'
import { successResponse, errorResponse } from '@/lib/api-response'
import { db } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'
import { createAuditLog, AuditActions } from '@/lib/audit'
import { buildUserResponse, generateAuthTokens, getClientIp } from '../_helpers'

// Rate limiter: 5 attempts per 15 minutes per mobile
const loginLimiter = rateLimit({ limitPerWindow: 5, windowMs: 15 * 60 * 1000 })

// Zod schema for request body
const loginSchema = z.object({
  mobile: z
    .string()
    .regex(/^09\d{9}$/, 'فرمت شماره موبایل نامعتبر است'),
  password: z
    .string()
    .min(6, 'رمز عبور باید حداقل ۶ کاراکتر باشد'),
})

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json()
    const parsed = loginSchema.safeParse(body)

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]
      return errorResponse(
        'VALIDATION_ERROR',
        firstError?.message ?? 'اطلاعات وارد شده نامعتبر است',
        422
      )
    }

    const { mobile, password } = parsed.data
    const ip = getClientIp(request)

    // Rate limit check
    const { allowed, retryAfter } = loginLimiter.check(`login:${mobile}`)
    if (!allowed) {
      return errorResponse(
        'RATE_LIMITED',
        `تعداد دفعات تلاش بیش از حد مجاز است. لطفاً ${retryAfter} ثانیه دیگر تلاش کنید`,
        429
      )
    }

    // Find user by mobile
    const user = await db.user.findUnique({
      where: { mobile },
      include: {
        profile: {
          select: {
            firstName: true,
            lastName: true,
            avatar: true,
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

    if (!user) {
      // Audit log for failed login
      createAuditLog({
        action: AuditActions.USER_LOGIN_FAILED,
        entity: 'User',
        details: { mobile, reason: 'NOT_FOUND' },
        ip,
      })

      return errorResponse('INVALID_CREDENTIALS', 'شماره موبایل یا رمز عبور اشتباه است', 401)
    }

    if (user.status === 'BLOCKED') {
      return errorResponse('USER_BLOCKED', 'حساب کاربری شما مسدود شده است', 403)
    }

    // Check if user has a password set
    if (!user.password) {
      return errorResponse(
        'PASSWORD_NOT_SET',
        'رمز عبور تنظیم نشده است. لطفاً ابتدا با شماره موبایل وارد شوید',
        401
      )
    }

    // Verify password
    const isPasswordValid = await compare(password, user.password)
    if (!isPasswordValid) {
      // Audit log for failed login
      createAuditLog({
        userId: user.id,
        action: AuditActions.USER_LOGIN_FAILED,
        entity: 'User',
        entityId: user.id,
        details: { mobile, reason: 'WRONG_PASSWORD' },
        ip,
      })

      // Create failed login log
      await db.loginLog.create({
        data: {
          userId: user.id,
          mobile,
          ip,
          status: 'FAILED',
        },
      })

      return errorResponse('INVALID_CREDENTIALS', 'شماره موبایل یا رمز عبور اشتباه است', 401)
    }

    // Generate tokens
    const { accessToken, refreshToken } = await generateAuthTokens({
      userId: user.id,
      ip,
      createLogs: true,
      mobile,
    })

    // Build user response
    const userData = await buildUserResponse(user)

    return successResponse(
      {
        accessToken,
        refreshToken,
        user: userData,
      },
      'ورود با موفقیت انجام شد'
    )
  } catch {
    return errorResponse('INTERNAL_ERROR', 'خطای داخلی سرور', 500)
  }
}
