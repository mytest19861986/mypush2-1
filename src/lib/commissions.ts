const ONLINE_PLAN_COMMISSION_PERCENT_ENV = 'ONLINE_PLAN_COMMISSION_PERCENT'

export function getOnlinePlanCommissionPercent(): number | null {
  // Business-owned commission config comes from server env; unset or invalid values disable creation.
  const rawValue = process.env[ONLINE_PLAN_COMMISSION_PERCENT_ENV]?.trim()

  if (!rawValue) {
    return null
  }

  const percent = Number(rawValue)
  return Number.isFinite(percent) && percent > 0 && percent <= 100 ? percent : null
}
