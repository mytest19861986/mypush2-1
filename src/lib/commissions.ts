export type CommissionReferrerType = 'SALES_PARTNER' | 'USER_REFERRAL'

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
