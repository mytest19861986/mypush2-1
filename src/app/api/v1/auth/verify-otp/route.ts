import { NextRequest } from 'next/server'
import { z } from 'zod'
import { successResponse, errorResponse } from '@/lib/api-response'
import { db } from '@/lib/db'
import { verifyOTP, isDemoFixedOTPEnabled, isTestFixedOTPAllowedForMobile } from '@/lib/otp'
import { buildUserResponse, generateAuthTokens, getClientIp } from '../_helpers'
import { DEMO_SCOPE_PHASE_1 } from '@/config/demo-scope'
import { generateAccessToken, generateRefreshToken } from '@/lib/jwt'

import { normalizeMobile } from '@/lib/phone'
import { rateLimit } from '@/lib/rate-limit'

// Rate limiter: 5 verification attempts per 10 minutes per mobile
const verifyOtpLimiter = rateLimit({ limitPerWindow: 5, windowMs: 10 * 60 * 1000 })
// Rate limiter: 15 verification attempts per 10 minutes per IP
const verifyOtpIpLimiter = rateLimit({ limitPerWindow: 15, windowMs: 10 * 60 * 1000 })

// Zod schema for request body
const verifyOtpSchema = z.object({
  mobile: z
    .string()
    .transform(normalizeMobile)
    .refine((val) => /^09\d{9}$/.test(val), {
      message: 'فرمت شماره موبایل نامعتبر است',
    }),
  code: z
    .string()
    .length(5, 'کد تایید باید ۵ رقم باشد')
    .regex(/^\d{5}$/, 'کد تایید فقط باید شامل اعداد باشد'),
  device: z.string().optional(),
  purpose: z.enum(['login', 'register']).optional(),
})

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json()
    const parsed = verifyOtpSchema.safeParse(body)

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]
      return errorResponse(
        'VALIDATION_ERROR',
        firstError?.message ?? 'اطلاعات وارد شده نامعتبر است',
        422
      )
    }

    const { mobile, code, device, purpose } = parsed.data
    const ip = getClientIp(request)

    // Rate limit check: IP and Mobile
    const ipLimit = verifyOtpIpLimiter.check(`verify-otp-ip:${ip}`)
    if (!ipLimit.allowed) {
      return errorResponse(
        'RATE_LIMITED',
        `تعداد دفعات تلاش بیش از حد مجاز از این آدرس اینترنتی. لطفاً ${ipLimit.retryAfter} ثانیه دیگر تلاش کنید`,
        429
      )
    }

    const mobileLimit = verifyOtpLimiter.check(`verify-otp:${mobile}`)
    if (!mobileLimit.allowed) {
      return errorResponse(
        'RATE_LIMITED',
        `تعداد دفعات تلاش برای این شماره بیش از حد مجاز است. لطفاً ${mobileLimit.retryAfter} ثانیه دیگر تلاش کنید`,
        429
      )
    }

    // Enforce Test Fixed OTP allowlist before verification when Test Fixed OTP mode is active
    if (isDemoFixedOTPEnabled() && !isTestFixedOTPAllowedForMobile(mobile)) {
      return errorResponse(
        'FORBIDDEN',
        'در حالت آزمون OTP ثابت، ورود فقط برای حساب‌های آزمایشی مجاز چهار نقش امکان‌پذیر است',
        403
      )
    }

    // Demo Mode Isolation: Only allowed if explicitly in non-production AND DEMO_SCOPE_PHASE_1 is true AND Test Fixed OTP DB flow is not active
    if (DEMO_SCOPE_PHASE_1 && process.env.NODE_ENV !== 'production' && !isDemoFixedOTPEnabled()) {
      if (code !== '12345') {
        return errorResponse('OTP_INVALID', 'کد تایید وارد شده نادرست است', 401)
      }

      // Check if user exists in DB first
      const dbUser = await db.user.findUnique({
        where: { mobile },
        include: {
          profile: true,
          agent: { select: { id: true, businessName: true, status: true } },
        },
      })

      if (dbUser) {
        if (dbUser.status !== 'ACTIVE' || dbUser.deletedAt) {
          return errorResponse('USER_BLOCKED', 'حساب کاربری شما مسدود یا غیرفعال شده است', 403)
        }
        const tokens = await generateAuthTokens({
          userId: dbUser.id,
          device,
          ip: getClientIp(request),
          createLogs: true,
          mobile: dbUser.mobile,
        })
        const userData = await buildUserResponse(dbUser)
        return successResponse(
          {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            user: userData,
          },
          'ورود با موفقیت انجام شد'
        )
      }

      const demoUser = {
        id: 'admin-demo-user-1',
        mobile: mobile,
        email: mobile === '09999999999' ? 'admin@hamicard.ir' : 'user@hamicard.ir',
        isMobileVerified: true,
        status: 'ACTIVE',
        roles: mobile === '09999999999' ? ['SUPER_ADMIN'] : ['USER'],
        permissions: mobile === '09999999999' ? ['*'] : [],
        profile: {
          firstName: mobile === '09999999999' ? 'مدیر کل' : 'کاربر',
          lastName: 'سیستم',
          nationalCode: '0011223344',
          avatar: null,
        },
      }

      const accessToken = await generateAccessToken(demoUser.id, demoUser.roles, demoUser.permissions)
      const refreshToken = await generateRefreshToken()

      return successResponse(
        {
          accessToken,
          refreshToken,
          user: demoUser,
        },
        'ورود با موفقیت انجام شد'
      )
    }

    // Verify OTP (keep record if purpose === 'register' so final step can verify it)
    const otpResult = await verifyOTP(mobile, code, { keepRecord: purpose === 'register' })
    if (!otpResult.valid) {
      return errorResponse('OTP_INVALID', otpResult.error!, 401)
    }

    // If purpose is registration and user does not exist yet, return success verification without tokens
    if (purpose === 'register') {
      const existingUser = await db.user.findUnique({
        where: { mobile },
      })
      if (!existingUser) {
        return successResponse(
          { verified: true, mobile },
          'شماره موبایل با موفقیت تایید شد'
        )
      }
    }

    // Find user
    const user = await db.user.findUnique({
      where: { mobile },
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

    if (!user) {
      return errorResponse('USER_NOT_FOUND', 'کاربر یافت نشد', 404)
    }

    if (user.status !== 'ACTIVE' || user.deletedAt) {
      return errorResponse('USER_BLOCKED', 'حساب کاربری شما مسدود یا غیرفعال شده است', 403)
    }

    // Update mobile verification status
    await db.user.update({
      where: { id: user.id },
      data: { isMobileVerified: true },
    })

    // Generate tokens
    const { accessToken, refreshToken } = await generateAuthTokens({
      userId: user.id,
      device,
      ip,
      createLogs: true,
      mobile,
    })

    // Track device if provided
    if (device) {
      const deviceId = device
      await db.userDevice.upsert({
        where: {
          userId_deviceId: {
            userId: user.id,
            deviceId,
          },
        },
        create: {
          userId: user.id,
          deviceId,
          deviceName: device,
          ip,
          lastLoginAt: new Date(),
        },
        update: {
          lastLoginAt: new Date(),
          ip,
        },
      })
    }

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
