import { NextRequest } from 'next/server'
import { z } from 'zod'
import { successResponse, errorResponse } from '@/lib/api-response'
import { db } from '@/lib/db'
import { generateOTP, storeOTP, canResendOTP, recordOTPSend, getOTPAttempts } from '@/lib/otp'
import { rateLimit } from '@/lib/rate-limit'
import { createAuditLog, AuditActions } from '@/lib/audit'

// Rate limiter: 3 requests per 5 minutes per mobile
const sendOtpLimiter = rateLimit({ limitPerWindow: 3, windowMs: 5 * 60 * 1000 })

// Zod schema for request body
const sendOtpSchema = z.object({
  mobile: z
    .string()
    .regex(/^09\d{9}$/, 'فرمت شماره موبایل نامعتبر است'),
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

    // Rate limit check
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

    // Demo accounts must exist from seed (password login) — do not auto-create as plain USER
    const SEEDED_DEMO_MOBILES = [
      '09999999999',
      '09222222222',
      '09123456789',
      '09111111111',
      '09333333333',
    ]

    // Find or create user
    let user = await db.user.findUnique({
      where: { mobile },
    })

    if (!user && SEEDED_DEMO_MOBILES.includes(mobile)) {
      return errorResponse(
        'USER_NOT_FOUND',
        'این شماره حساب آزمایشی است. از تب «رمز عبور» با رمز seed وارد شوید (مدیر: Admin@123456)',
        404
      )
    }

    if (!user) {
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
    if (user.status === 'BLOCKED') {
      return errorResponse(
        'USER_BLOCKED',
        'حساب کاربری شما مسدود شده است',
        403
      )
    }

    // Generate and store OTP in database
    const otp = generateOTP()
    await storeOTP(mobile, otp)
    await recordOTPSend(mobile)

    // Log OTP for development (in production this would send SMS)
    console.log(`[DEV OTP] Mobile: ${mobile}, Code: ${otp}`)

    const { remaining } = await getOTPAttempts(mobile)
    const canResendFlag = remaining > 0

    return successResponse(
      {
        canResend: canResendFlag,
        expiresIn: 120,
        // Development only: return OTP in response
        otp: process.env.NODE_ENV !== 'production' ? otp : undefined,
      },
      'کد تایید ارسال شد'
    )
  } catch (e) {
    console.error('[SEND-OTP ERROR]', e)
    return errorResponse('INTERNAL_ERROR', 'خطای داخلی سرور', 500)
  }
}
