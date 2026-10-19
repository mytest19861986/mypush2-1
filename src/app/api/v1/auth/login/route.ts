import { NextRequest } from 'next/server'
import { z } from 'zod'
import { compare } from 'bcryptjs'
import { successResponse, errorResponse } from '@/lib/api-response'
import { db } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'
import { createAuditLog, AuditActions } from '@/lib/audit'
import { buildUserResponse, generateAuthTokens, getClientIp } from '../_helpers'
import { DEMO_SCOPE_PHASE_1 } from '@/config/demo-scope'
import { generateAccessToken, generateRefreshToken } from '@/lib/jwt'

import { normalizeMobile } from '@/lib/phone'

// Rate limiter: 5 attempts per 15 minutes per mobile
const loginLimiter = rateLimit({ limitPerWindow: 5, windowMs: 15 * 60 * 1000 })

// Zod schema for request body
const loginSchema = z.object({
  mobile: z
    .string()
    .transform(normalizeMobile)
    .refine((val) => /^09\d{9}$/.test(val), {
      message: 'فرمت شماره موبایل نامعتبر است (مثال: 09121234567)',
    }),
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

    if (DEMO_SCOPE_PHASE_1 && process.env.NODE_ENV !== 'production') {
      const DEMO_PERSONAS_AUTH: Record<string, { pass: string; user: any }> = {
        '09999999999': {
          pass: 'Admin@123456',
          user: {
            id: 'cmpuxovcg004iuwc4ot7ugrry',
            mobile: '09999999999',
            email: 'admin@hamicard.ir',
            isMobileVerified: true,
            status: 'ACTIVE',
            roles: ['SUPER_ADMIN'],
            permissions: ['*', 'manage_users', 'manage_doctors', 'approve_doctors', 'manage_plans', 'manage_reviews', 'manage_agents', 'view_reports', 'manage_settings'],
            profile: { firstName: 'مدیر کل', lastName: 'سیستم', nationalCode: '0011223344', avatar: null },
          },
        },
        '09222222222': {
          pass: 'Doctor@123456',
          user: {
            id: 'cmpuxovsf004nuwc4qco7jldm',
            mobile: '09222222222',
            email: 'doctor@hamicard.ir',
            isMobileVerified: true,
            status: 'ACTIVE',
            roles: ['DOCTOR'],
            permissions: ['view_doctor_dashboard', 'manage_patients'],
            profile: { firstName: 'دکتر رضا', lastName: 'احمدی', nationalCode: '0022334455', avatar: null },
          },
        },
        '09123456789': {
          pass: 'Agent@123456',
          user: {
            id: 'cmpuxowem004uuwc43okm1mlm',
            mobile: '09123456789',
            email: 'agent@hamicard.ir',
            isMobileVerified: true,
            status: 'ACTIVE',
            roles: ['AGENT'],
            permissions: ['view_agent_dashboard', 'manage_referrals'],
            profile: { firstName: 'علی', lastName: 'کریمی', nationalCode: '0033445566', avatar: null },
          },
        },
        '09111111111': {
          pass: 'User@123456',
          user: {
            id: 'cmpuxox9s0051uwc456grejdn',
            mobile: '09111111111',
            email: 'user@hamicard.ir',
            isMobileVerified: true,
            status: 'ACTIVE',
            roles: ['USER'],
            permissions: [],
            profile: { firstName: 'مهدی', lastName: 'رضایی', nationalCode: '0044556677', avatar: null },
          },
        },
        '09333333333': {
          pass: 'Support@123456',
          user: {
            id: 'cmpuxoxs5005cuwc4uzpy2oa8',
            mobile: '09333333333',
            email: 'support@hamicard.ir',
            isMobileVerified: true,
            status: 'ACTIVE',
            roles: ['SUPPORT'],
            permissions: ['view_users', 'view_reports'],
            profile: { firstName: 'پشتیبان', lastName: 'سامانه', nationalCode: '0055667788', avatar: null },
          },
        },
      }

      const match = DEMO_PERSONAS_AUTH[mobile]
      if (match) {
        if (password === match.pass) {
          const accessToken = await generateAccessToken(match.user.id, match.user.roles, match.user.permissions)
          const refreshToken = `demo-refresh-token:${match.user.id}`
          return successResponse(
            { accessToken, refreshToken, user: match.user },
            'ورود با موفقیت انجام شد'
          )
        } else {
          return errorResponse('INVALID_CREDENTIALS', 'شماره موبایل یا رمز عبور اشتباه است', 401)
        }
      }
    }

    // Find user by mobile
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
    if (!user.passwordHash) {
      return errorResponse(
        'PASSWORD_NOT_SET',
        'رمز عبور تنظیم نشده است. لطفاً ابتدا با شماره موبایل وارد شوید',
        401
      )
    }

    // Verify password
    const isPasswordValid = await compare(password, user.passwordHash)
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
  } catch (err: any) {
    console.error('LOGIN_POST_ERROR:', err)
    return errorResponse('INTERNAL_ERROR', err?.message || 'خطای داخلی سرور', 500)
  }
}
