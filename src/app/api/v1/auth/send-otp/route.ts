import { NextRequest } from 'next/server'
import { z } from 'zod'
import { successResponse, errorResponse } from '@/lib/api-response'
import { db } from '@/lib/db'
import {
  getOTPForSend,
  storeOTP,
  canResendOTP,
  recordOTPSend,
  getOTPAttempts,
  isTestFixedOTPAllowedForMobile,
  isDemoFixedOTPEnabled,
} from '@/lib/otp'
import { rateLimit } from '@/lib/rate-limit'
import { createAuditLog, AuditActions } from '@/lib/audit'
import { DEMO_SCOPE_PHASE_1 } from '@/config/demo-scope'

import { normalizeMobile } from '@/lib/phone'
import { getClientIp } from '../_helpers'

// Rate limiter: 3 requests per 5 minutes per mobile
const sendOtpLimiter = rateLimit({ limitPerWindow: 3, windowMs: 5 * 60 * 1000 })
// Rate limiter: 10 requests per 5 minutes per IP
const sendOtpIpLimiter = rateLimit({ limitPerWindow: 10, windowMs: 5 * 60 * 1000 })

// Zod schema for request body
const sendOtpSchema = z.object({
  mobile: z
    .string()
    .transform(normalizeMobile)
    .refine((val) => /^09\d{9}$/.test(val), {
      message: 'فرمت شماره موبایل نامعتبر است (مثال: 09121234567)',
    }),
  purpose: z.enum(['login', 'register']).optional(),
})

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json()
    const parsed = sendOtpSchema.safeParse(body)

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]
      return errorResponse(
        'VALIDATION_ERROR',
        firstError?.message ?? 'اطلاعات وارد شده نامعتبر است',
        422
      )
    }

    const { mobile } = parsed.data

    const purpose = parsed.data.purpose ?? 'login'

    // Rate limit check: IP and Mobile (enforced in all modes including Test fixed OTP)
    const ip = getClientIp(request)
    const ipLimit = sendOtpIpLimiter.check(`send-otp-ip:${ip}`)
    if (!ipLimit.allowed) {
      return errorResponse(
        'RATE_LIMITED',
        `تعداد درخواست‌های بیش از حد از این آدرس اینترنتی. لطفاً ${ipLimit.retryAfter} ثانیه دیگر تلاش کنید`,
        429
      )
    }

    const { allowed, retryAfter } = sendOtpLimiter.check(`send-otp:${mobile}`)
    if (!allowed) {
      return errorResponse(
        'RATE_LIMITED',
        `لطفاً ${retryAfter} ثانیه دیگر تلاش کنید`,
        429
      )
    }

    // OTP resend check (async — uses DB)
    const canResend = await canResendOTP(mobile)
    if (!canResend) {
      const { remaining } = await getOTPAttempts(mobile)
      return errorResponse(
        'OTP_RATE_LIMITED',
        `حداکثر تعداد ارسال کد تایید رد شده است. ${remaining} بار ارسال باقیمانده`,
        429
      )
    }

    // Demo Mode Isolation: strictly forbidden in real production environment
    // When Test Fixed OTP is enabled, use the real DB-backed flow below so OTP records, rate limits, and roles are verified.
    if (DEMO_SCOPE_PHASE_1 && process.env.NODE_ENV !== 'production' && !isDemoFixedOTPEnabled()) {
      const DEMO_ACCOUNTS: Record<string, string> = {
        '09999999999': '12345',
        '09222222222': '12345',
        '09123456789': '12345',
        '09111111111': '12345',
        '09333333333': '12345',
      }

      if (DEMO_ACCOUNTS[mobile] || purpose === 'register') {
        return successResponse(
          {
            canResend: true,
            expiresIn: 120,
          },
          'کد تایید ارسال شد'
        )
      }

      return errorResponse(
        'USER_NOT_FOUND',
        'در محیط دمو لطفاً از شماره‌های تاییدشده آزمایشی (مانند 09999999999) استفاده کنید',
        400
      )
    }

    // Demo accounts must exist from seed — do not auto-create as plain USER
    const SEEDED_DEMO_MOBILES = [
      '09999999999',
      '09222222222',
      '09123456789',
      '09111111111',
      '09333333333',
    ]

    // When Test Fixed OTP is enabled, reject non-allowlisted mobile numbers on login
    if (isDemoFixedOTPEnabled() && !isTestFixedOTPAllowedForMobile(mobile)) {
      return errorResponse(
        'FORBIDDEN',
        'در حالت آزمون OTP ثابت، فقط حساب‌های آزمایشی مجاز چهار نقش قابل استفاده هستند',
        403
      )
    }

    // Find or create user
    let user = await db.user.findUnique({
      where: { mobile },
    })

    if (!user && (SEEDED_DEMO_MOBILES.includes(mobile) || isTestFixedOTPAllowedForMobile(mobile))) {
      return errorResponse(
        'USER_NOT_FOUND',
        'این شماره حساب آزمایشی در دیتابیس یافت نشد یا غیرفعال است',
        404
      )
    }

    if (!user && purpose === 'register') {
      // For registration requests, do NOT create an ACTIVE completed User prematurely.
      // Verification and completion will occur securely in /api/v1/auth/register.
    } else if (!user) {
      user = await db.user.create({
        data: {
          mobile,
          status: 'ACTIVE',
        },
      })

      // Assign default USER role to new user
      try {
        const userRole = await db.role.findUnique({
          where: { name: 'USER' },
        })
        if (userRole) {
          await db.userRole.create({
            data: {
              userId: user.id,
              roleId: userRole.id,
            },
          })
        } else {
          // Create USER role if it doesn't exist
          const newRole = await db.role.create({
            data: {
              name: 'USER',
              title: 'کاربر عادی',
              description: 'دسترسی پایه کاربران عادی',
            },
          })
          await db.userRole.create({
            data: {
              userId: user.id,
              roleId: newRole.id,
            },
          })
        }
      } catch (roleError) {
        console.error('[AUTH] Failed to assign USER role:', roleError)
      }

      // Audit log for user creation (fire-and-forget)
      createAuditLog({
        userId: user.id,
        action: AuditActions.USER_CREATED,
        entity: 'User',
        entityId: user.id,
      })
    } else {
      // If user exists but has no roles, assign USER role
      try {
        const existingRoles = await db.userRole.count({
          where: { userId: user.id },
        })
        if (existingRoles === 0) {
          const userRole = await db.role.findUnique({
            where: { name: 'USER' },
          })
          if (userRole) {
            await db.userRole.create({
              data: {
                userId: user.id,
                roleId: userRole.id,
              },
            })
          }
        }
      } catch (roleError) {
        console.error('[AUTH] Failed to assign missing USER role:', roleError)
      }
    }

    // Check user status
    if (user && (user.status !== 'ACTIVE' || user.deletedAt)) {
      return errorResponse(
        'USER_BLOCKED',
        'حساب کاربری شما مسدود یا غیرفعال شده است',
        403
      )
    }

    // Generate and store OTP in database. Test fixed OTP is strictly gated per allowlisted mobile in getOTPForSend(mobile).
    const otp = getOTPForSend(mobile)
    await storeOTP(mobile, otp)
    await recordOTPSend(mobile)

    const { remaining } = await getOTPAttempts(mobile)
    const canResendFlag = remaining > 0

    return successResponse(
      {
        canResend: canResendFlag,
        expiresIn: 120,
        // Development only: never expose OTP in production responses
        otp: process.env.NODE_ENV !== 'production' ? otp : undefined,
      },
      'کد تایید ارسال شد'
    )
  } catch (e) {
    console.error('[SEND-OTP ERROR]', e)
    return errorResponse('INTERNAL_ERROR', 'خطای داخلی سرور', 500)
  }
}
