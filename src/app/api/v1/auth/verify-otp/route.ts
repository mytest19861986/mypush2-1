import { NextRequest } from 'next/server'
import { z } from 'zod'
import { successResponse, errorResponse } from '@/lib/api-response'
import { db } from '@/lib/db'
import { verifyOTP } from '@/lib/otp'
import { buildUserResponse, generateAuthTokens, getClientIp } from '../_helpers'
import { DEMO_SCOPE_PHASE_1 } from '@/config/demo-scope'
import { generateAccessToken, generateRefreshToken } from '@/lib/jwt'

// Zod schema for request body
const verifyOtpSchema = z.object({
  mobile: z
    .string()
    .regex(/^09\d{9}$/, 'فرمت شماره موبایل نامعتبر است'),
  code: z
    .string()
    .length(5, 'کد تایید باید ۵ رقم باشد')
    .regex(/^\d{5}$/, 'کد تایید فقط باید شامل اعداد باشد'),
  device: z.string().optional(),
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

    const { mobile, code, device } = parsed.data

    if (DEMO_SCOPE_PHASE_1) {
      if (code !== '12345') {
        return errorResponse('OTP_INVALID', 'کد تایید وارد شده نادرست است', 401)
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

    const ip = getClientIp(request)

    // Verify OTP (includes rate limiting: 5 attempts per OTP, stored in DB)
    const otpResult = await verifyOTP(mobile, code)
    if (!otpResult.valid) {
      return errorResponse('OTP_INVALID', otpResult.error!, 401)
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

    if (user.status === 'BLOCKED') {
      return errorResponse('USER_BLOCKED', 'حساب کاربری شما مسدود شده است', 403)
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
