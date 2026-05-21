// OTP management using SQLite database for persistence.
// Survives server restarts, HMR, and multi-process deployments.

import { db } from './db'

// Configuration
const OTP_EXPIRY_MS = 2 * 60 * 1000 // 2 minutes
const MAX_VERIFY_ATTEMPTS = 5
const MAX_RESEND_ATTEMPTS = 3
const RESEND_WINDOW_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Generate a random 5-digit OTP code.
 */
export function generateOTP(): string {
  const min = 10000
  const max = 99999
  return String(Math.floor(Math.random() * (max - min + 1)) + min)
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
  code: string
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

  // Valid — clean up the OTP
  await db.otpCode.delete({ where: { id: otp.id } })
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
