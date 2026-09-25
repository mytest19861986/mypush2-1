import { NextRequest } from 'next/server'
import { z } from 'zod'
import { successResponse, errorResponse } from '@/lib/api-response'
import { db } from '@/lib/db'
import { verifyOTP } from '@/lib/otp'
import { hashPassword } from '@/lib/password'
import { rateLimit } from '@/lib/rate-limit'
import { createAuditLog, AuditActions } from '@/lib/audit'
import { buildUserResponse, generateAuthTokens, getClientIp } from '../_helpers'
import { DEMO_SCOPE_PHASE_1 } from '@/config/demo-scope'
import { generateAccessToken, generateRefreshToken } from '@/lib/jwt'

// Rate limiter: 5 registration attempts per 15 minutes per IP
const registerLimiter = rateLimit({ limitPerWindow: 5, windowMs: 15 * 60 * 1000 })

const registerSchema = z.object({
  mobile: z
    .string()
    .regex(/^09\d{9}$/, 'فرمت شماره موبایل نامعتبر است (مثال: 09121234567)'),
  otpCode: z
    .string()
    .length(5, 'کد تایید باید ۵ رقم باشد')
    .regex(/^\d{5}$/, 'کد تایید فقط باید شامل اعداد باشد'),
  password: z
    .string()
    .min(6, 'رمز عبور باید حداقل ۶ کاراکتر باشد'),
  firstName: z
    .string()
    .trim()
    .min(2, 'نام باید حداقل ۲ حرف باشد')
    .max(50, 'نام نباید بیشتر از ۵۰ حرف باشد'),
  lastName: z
    .string()
    .trim()
    .min(2, 'نام خانوادگی باید حداقل ۲ حرف باشد')
    .max(50, 'نام خانوادگی نباید بیشتر از ۵۰ حرف باشد'),
  nationalCode: z
    .string()
    .trim()
    .regex(/^\d{10}$/, 'کد ملی باید ۱۰ رقم باشد')
    .optional()
    .or(z.literal('')),
  referralCode: z
    .string()
    .trim()
    .max(50)
    .optional()
    .or(z.literal('')),
  device: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    const { allowed, retryAfter } = registerLimiter.check(`register:${ip}`)
    if (!allowed) {
      return errorResponse(
        'RATE_LIMITED',
        `تعداد درخواست‌های ثبت‌نام بیش از حد مجاز است. لطفاً ${retryAfter} ثانیه دیگر تلاش کنید`,
        429
      )
    }

    const body = await request.json()
    const parsed = registerSchema.safeParse(body)

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]
      return errorResponse(
        'VALIDATION_ERROR',
        firstError?.message ?? 'اطلاعات وارد شده نامعتبر است',
        422
      )
    }

    const {
      mobile,
      otpCode,
      password,
      firstName,
      lastName,
      nationalCode,
      referralCode,
      device,
    } = parsed.data

    const cleanNationalCode = nationalCode && nationalCode.length === 10 ? nationalCode : null

    // 1. In DEMO_SCOPE_PHASE_1 mode
    if (DEMO_SCOPE_PHASE_1) {
      if (otpCode !== '12345') {
        return errorResponse('OTP_INVALID', 'کد تایید وارد شده نادرست است', 401)
      }

      // Check if user already exists
      const existingUser = await db.user.findUnique({
        where: { mobile },
      })
      if (existingUser) {
        return errorResponse('CONFLICT', 'این شماره موبایل قبلاً در سامانه ثبت شده است', 409)
      }

      const passwordHash = await hashPassword(password)

      // Ensure 'USER' role exists
      let userRole = await db.role.findUnique({ where: { name: 'USER' } })
      if (!userRole) {
        userRole = await db.role.create({
          data: {
            name: 'USER',
            title: 'کاربر عادی',
            description: 'دسترسی پایه کاربران عادی',
          },
        })
      }

      // Create user and profile in transaction
      const newUser = await db.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            mobile,
            passwordHash,
            status: 'ACTIVE',
            isMobileVerified: true,
            isPasswordLoginEnabled: true,
          },
        })

        await tx.userRole.create({
          data: {
            userId: user.id,
            roleId: userRole.id,
          },
        })

        await tx.userProfile.create({
          data: {
            userId: user.id,
            firstName,
            lastName,
            nationalCode: cleanNationalCode,
          },
        })

        // Initialize zero-balance wallet
        await tx.wallet.create({
          data: {
            userId: user.id,
            balance: 0,
            currency: 'IRR',
          },
        })

        return user
      })

      createAuditLog({
        userId: newUser.id,
        action: AuditActions.USER_CREATED,
        entity: 'User',
        entityId: newUser.id,
        ip,
        details: { method: 'SELF_REGISTER', referralCode: referralCode || null },
      })

      const accessToken = await generateAccessToken(newUser.id, ['USER'], [])
      const refreshToken = await generateRefreshToken()

      const demoUserData = {
        id: newUser.id,
        mobile: newUser.mobile,
        email: null,
        isMobileVerified: true,
        status: 'ACTIVE',
        roles: ['USER'],
        permissions: [],
        profile: {
          firstName,
          lastName,
          nationalCode: cleanNationalCode,
          avatar: null,
        },
      }

      return successResponse(
        {
          accessToken,
          refreshToken,
          user: demoUserData,
        },
        'ثبت‌نام با موفقیت انجام شد'
      )
    }

    // 2. Production/Live Mode: verify real OTP
    const otpResult = await verifyOTP(mobile, otpCode)
    if (!otpResult.valid) {
      return errorResponse('OTP_INVALID', otpResult.error!, 401)
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { mobile },
    })
    if (existingUser) {
      return errorResponse('CONFLICT', 'این شماره موبایل قبلاً در سامانه ثبت شده است', 409)
    }

    // Check national code uniqueness if provided
    if (cleanNationalCode) {
      const existingProfile = await db.userProfile.findUnique({
        where: { nationalCode: cleanNationalCode },
      })
      if (existingProfile) {
        return errorResponse('CONFLICT', 'این کد ملی قبلاً در سامانه ثبت شده است', 409)
      }
    }

    const passwordHash = await hashPassword(password)

    // Ensure 'USER' role exists
    let userRole = await db.role.findUnique({ where: { name: 'USER' } })
    if (!userRole) {
      userRole = await db.role.create({
        data: {
          name: 'USER',
          title: 'کاربر عادی',
          description: 'دسترسی پایه کاربران عادی',
        },
      })
    }

    // Create user and profile in transaction
    const newUser = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          mobile,
          passwordHash,
          status: 'ACTIVE',
          isMobileVerified: true,
          isPasswordLoginEnabled: true,
        },
      })

      await tx.userRole.create({
        data: {
          userId: user.id,
          roleId: userRole.id,
        },
      })

      await tx.userProfile.create({
        data: {
          userId: user.id,
          firstName,
          lastName,
          nationalCode: cleanNationalCode,
        },
      })

      // Initialize zero-balance wallet
      await tx.wallet.create({
        data: {
          userId: user.id,
          balance: 0,
          currency: 'IRR',
        },
      })

      return user
    })

    createAuditLog({
      userId: newUser.id,
      action: AuditActions.USER_CREATED,
      entity: 'User',
      entityId: newUser.id,
      ip,
      details: { method: 'SELF_REGISTER', referralCode: referralCode || null },
    })

    const { accessToken, refreshToken } = await generateAuthTokens({
      userId: newUser.id,
      device,
      ip,
      createLogs: true,
      mobile: newUser.mobile,
    })

    const fullUser = await db.user.findUnique({
      where: { id: newUser.id },
      include: {
        profile: true,
        agent: {
          select: { id: true, businessName: true, status: true },
        },
      },
    })

    const userData = await buildUserResponse(fullUser!)

    return successResponse(
      {
        accessToken,
        refreshToken,
        user: userData,
      },
      'ثبت‌نام با موفقیت انجام شد'
    )
  } catch (error) {
    console.error('[REGISTER ERROR]', error)
    return errorResponse('INTERNAL_ERROR', 'خطای داخلی سرور در پردازش ثبت‌نام', 500)
  }
}
