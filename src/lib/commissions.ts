export type CommissionReferrerType = 'SALES_PARTNER' | 'USER_REFERRAL'
export type CommissionSourceType = CommissionReferrerType

type PlanCommissionSettings = {
  salesPartnerCommissionPercent?: number | null
  referralCommissionPercent?: number | null
}

function normalizeCommissionPercent(value?: number | null) {
  if (value === null || value === undefined) return null

  const percent = Number(value)
  return Number.isFinite(percent) && percent > 0 && percent <= 100 ? percent : null
}

export function getPlanCommissionPercent(
  plan: PlanCommissionSettings,
  referrerType: CommissionReferrerType
) {
  return normalizeCommissionPercent(
    referrerType === 'SALES_PARTNER'
      ? plan.salesPartnerCommissionPercent
      : plan.referralCommissionPercent
  )
}

export function calculateCommissionAmount(amount: number, percent: number) {
  return Math.round((amount * percent) / 100)
}

type CommissionSourceLookup = {
  userPlan: { source?: string | null }
  agent?: { agent?: { status?: string | null } | null } | null
}

export function getCommissionSourceType(commission: CommissionSourceLookup): CommissionSourceType {
  if (commission.userPlan.source === 'SALES_CONFIRMED') return 'SALES_PARTNER'
  if (commission.agent?.agent?.status === 'APPROVED') return 'SALES_PARTNER'
  return 'USER_REFERRAL'
}
