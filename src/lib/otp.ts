// OTP management using SQLite database for persistence.
// Survives server restarts, HMR, and multi-process deployments.

import { randomInt } from 'node:crypto'
import { db } from './db'

// Configuration
const OTP_EXPIRY_MS = 2 * 60 * 1000 // 2 minutes
const MAX_VERIFY_ATTEMPTS = 5
const MAX_RESEND_ATTEMPTS = 3
const RESEND_WINDOW_MS = 5 * 60 * 1000 // 5 minutes
const OTP_CODE_PATTERN = /^\d{5}$/

/**
 * Authorized synthetic test accounts for the four required roles in Test environment:
 * - 09999999999: ADMIN / SUPER_ADMIN
 * - 09222222222: DOCTOR
 * - 09111111111: USER
 * - 09123456789: AGENT (Sales Partner / همکار فروش)
 */
export const DEFAULT_TEST_OTP_ALLOWLIST = [
  '09999999999',
  '09222222222',
  '09111111111',
  '09123456789',
] as const

/**
 * Check whether Test Fixed OTP is explicitly enabled AND the runtime is verified as the Test environment.
 * Fails closed (returns false) in production or when environment is unspecified/ambiguous.
 *
 * Environment validation rules (Stage22J / F-22I-01 fix):
 * - HAMI_ENV and APP_ENV are read and normalized independently.
 * - If EITHER variable is explicitly 'production' or 'prod', fixed OTP is disabled immediately.
 * - If BOTH variables are defined and non-empty, they must agree (no conflict); otherwise fail closed.
 * - If neither variable indicates production, fixed OTP is allowed only if:
 *   - At least one of HAMI_ENV or APP_ENV is explicitly 'test', OR
 *   - Neither is set and NODE_ENV is explicitly 'test' or 'development'.
 * - Must always have TEST_FIXED_OTP_ENABLED or DEMO_FIXED_OTP_ENABLED set to 'true'.
 */
export function isDemoFixedOTPEnabled(): boolean {
  const enabledFlag =
    process.env['TEST_FIXED_OTP_ENABLED'] === 'true' ||
    process.env['DEMO_FIXED_OTP_ENABLED'] === 'true'
  if (!enabledFlag) {
    return false
  }

  const rawHamiEnv = process.env['HAMI_ENV']
  const rawAppEnv = process.env['APP_ENV']
  const hamiEnv = (rawHamiEnv ?? '').trim().toLowerCase()
  const appEnv = (rawAppEnv ?? '').trim().toLowerCase()
  const nodeEnv = (process.env['NODE_ENV'] || '').trim().toLowerCase()

  const isHamiProd = hamiEnv === 'production' || hamiEnv === 'prod'
  const isAppProd = appEnv === 'production' || appEnv === 'prod'

  // Fail closed if either variable explicitly marks production
  if (isHamiProd || isAppProd) {
    return false
  }

  // If both are defined and non-empty, fail closed if they conflict
  if (hamiEnv && appEnv && hamiEnv !== appEnv) {
    return false
  }

  // Allow only when explicitly marked as 'test' in HAMI_ENV or APP_ENV
  if (hamiEnv === 'test' || appEnv === 'test') {
    return true
  }

  // In local test/development where neither custom env is defined
  if (!hamiEnv && !appEnv && (nodeEnv === 'test' || nodeEnv === 'development')) {
    return true
  }

  // Ambiguous, conflicting, or production NODE_ENV without explicit verified test env -> fail closed
  return false
}

export function getAllowedTestOTPMobiles(): Set<string> {
  const raw = process.env['TEST_FIXED_OTP_ALLOWED_MOBILES']?.trim()
  if (raw) {
    return new Set(
      raw
        .split(',')
        .map((m) => m.trim())
        .filter((m) => /^09\d{9}$/.test(m))
    )
  }
  return new Set(DEFAULT_TEST_OTP_ALLOWLIST)
}

export function isTestFixedOTPAllowedForMobile(mobile: string): boolean {
  if (!isDemoFixedOTPEnabled()) {
    return false
  }
  return getAllowedTestOTPMobiles().has(mobile)
}

/**
 * Demo/Test only: use a fixed OTP from the environment ONLY when explicitly enabled in Test
 * and ONLY for allowlisted test mobile numbers.
 * Never enable for real production users or arbitrary mobile numbers.
 */
export function getOTPForSend(mobile?: string): string {
  if (!mobile || !isTestFixedOTPAllowedForMobile(mobile)) {
    return generateOTP()
  }

  const fixedOTP = (process.env['TEST_FIXED_OTP'] || process.env['DEMO_FIXED_OTP'] || '12345').trim()
  if (!OTP_CODE_PATTERN.test(fixedOTP)) {
    throw new Error('Fixed OTP must be exactly 5 digits when Test Fixed OTP is enabled')
  }

  return fixedOTP
}

/**
 * Generate a random 5-digit OTP code.
 */
export function generateOTP(): string {
  const min = 10000
  const max = 100000
  return String(randomInt(min, max))
}

/**
 * Store an OTP code for a given mobile number in the database.
 * Deletes any previous unexpired OTP for that mobile first.
 */
export async function storeOTP(mobile: string, code: string): Promise<void> {
  // Delete any existing OTP for this mobile
  await db.otpCode.deleteMany({
    where: {
      mobile,
      expiresAt: { gt: new Date() },
    },
  })

  // Create new OTP
  await db.otpCode.create({
    data: {
      mobile,
      code,
      expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
    },
  })
}

/**
 * Verify an OTP code for a given mobile number.
 * Returns an error if the OTP is expired, invalid, or max attempts exceeded.
 */
export async function verifyOTP(
  mobile: string,
  code: string,
  options?: { keepRecord?: boolean }
): Promise<{ valid: boolean; error?: string }> {
  // Find the latest OTP for this mobile
  const otp = await db.otpCode.findFirst({
    where: { mobile },
    orderBy: { createdAt: 'desc' },
  })

  if (!otp) {
    return { valid: false, error: 'کد تاییدی یافت نشد. لطفاً کد جدیدی درخواست کنید.' }
  }

  // Check expiry
  if (new Date() > otp.expiresAt) {
    // Clean up expired OTP
    await db.otpCode.delete({ where: { id: otp.id } })
    return { valid: false, error: 'کد تایید منقضی شده است. لطفاً کد جدیدی درخواست کنید.' }
  }

  // Check max verify attempts
  if (otp.verifyAttempts >= MAX_VERIFY_ATTEMPTS) {
    await db.otpCode.delete({ where: { id: otp.id } })
    return {
      valid: false,
      error: 'تعداد دفعات تلاش بیش از حد مجاز است. لطفاً کد جدیدی درخواست کنید.',
    }
  }

  // Increment attempt counter
  await db.otpCode.update({
    where: { id: otp.id },
    data: { verifyAttempts: { increment: 1 } },
  })

  // Check code
  if (otp.code !== code) {
    const remaining = MAX_VERIFY_ATTEMPTS - otp.verifyAttempts - 1
    return {
      valid: false,
      error: `کد تایید نادرست است. ${remaining} بار تلاش باقیمانده.`,
    }
  }

  // Valid — clean up the OTP unless keepRecord is true
  if (!options?.keepRecord) {
    await db.otpCode.delete({ where: { id: otp.id } })
  }
  return { valid: true }
}

/**
 * Check if the user can request a new OTP (resend).
 * Rate-limited to MAX_RESEND_ATTEMPTS per RESEND_WINDOW_MS.
 */
export async function canResendOTP(mobile: string): Promise<boolean> {
  const windowStart = new Date(Date.now() - RESEND_WINDOW_MS)

  const count = await db.otpCode.count({
    where: {
      mobile,
      createdAt: { gte: windowStart },
    },
  })

  return count < MAX_RESEND_ATTEMPTS
}

/**
 * Record context for a resend — storeOTP already handles creation.
 * This function is kept for API compatibility but the actual record
 * is created by storeOTP.
 */
export async function recordOTPSend(_mobile: string): Promise<void> {
  // No-op: storeOTP creates the record
}

/**
 * Get remaining OTP send attempts for a mobile number.
 */
export async function getOTPAttempts(mobile: string): Promise<{ remaining: number }> {
  const windowStart = new Date(Date.now() - RESEND_WINDOW_MS)

  const count = await db.otpCode.count({
    where: {
      mobile,
      createdAt: { gte: windowStart },
    },
  })

  return { remaining: Math.max(0, MAX_RESEND_ATTEMPTS - count) }
}

/**
 * Clean up expired OTP codes from the database.
 * Run periodically (e.g., every 10 minutes).
 */
export async function cleanupExpiredOTPs(): Promise<number> {
  const result = await db.otpCode.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  })
  return result.count
}
