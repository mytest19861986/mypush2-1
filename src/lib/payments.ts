import { db } from '@/lib/db'

interface PaymentMetadata {
  referralCode?: string
  referrerId?: string
  referrerType?: 'SALES_PARTNER' | 'USER_REFERRAL'
}

interface CreatePendingPaymentParams {
  userId: string
  planId: string
  amount: number
  discountAmount?: number
  gateway?: string
  metadata?: PaymentMetadata
}

function normalizeSafeString(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return undefined

  const trimmed = value.trim()
  if (!trimmed || trimmed.length > maxLength) return undefined

  return trimmed
}

function sanitizePaymentMetadata(metadata: PaymentMetadata) {
  const referralCode = normalizeSafeString(metadata.referralCode, 20)
  const referrerId = normalizeSafeString(metadata.referrerId, 100)
  const referrerType =
    metadata.referrerType === 'SALES_PARTNER' || metadata.referrerType === 'USER_REFERRAL'
      ? metadata.referrerType
      : undefined

  return {
    ...(referralCode ? { referralCode } : {}),
    ...(referrerId ? { referrerId } : {}),
    ...(referrerType ? { referrerType } : {}),
  }
}

export function buildPaymentMetadata(metadata: PaymentMetadata) {
  const safeMetadata = sanitizePaymentMetadata(metadata)
  return Object.keys(safeMetadata).length > 0 ? JSON.stringify(safeMetadata) : null
}

export function parsePaymentMetadata(metadata?: string | null): PaymentMetadata {
  if (!metadata) return {}

  try {
    const parsed = JSON.parse(metadata)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}

    return sanitizePaymentMetadata(parsed as PaymentMetadata)
  } catch {
    return {}
  }
}

export async function createPendingPayment(params: CreatePendingPaymentParams) {
  const discountAmount = params.discountAmount ?? 0
  const finalAmount = params.amount - discountAmount

  return db.payment.create({
    data: {
      userId: params.userId,
      planId: params.planId,
      amount: params.amount,
      discountAmount,
      finalAmount,
      gateway: params.gateway ?? 'MANUAL_DEV',
      status: 'PENDING',
      metadata: params.metadata ? buildPaymentMetadata(params.metadata) : null,
    },
  })
}
