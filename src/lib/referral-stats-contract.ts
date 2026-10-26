export const REFERRAL_MEMBER_LABEL = 'عضو معرفی‌شده' as const
export interface ReferralStats {
  totalReferrals: number
  referrals: Array<{ label: typeof REFERRAL_MEMBER_LABEL }>
}

// The client treats a malformed/identifying response as unavailable, never as zero.
export function isReferralStats(value: unknown): value is ReferralStats {
  if (!value || typeof value !== 'object') return false
  const data = value as Record<string, unknown>
  if (Object.keys(data).some(key => key !== 'totalReferrals' && key !== 'referrals')) return false
  if (!Number.isSafeInteger(data.totalReferrals) || (data.totalReferrals as number) < 0) return false
  if (!Array.isArray(data.referrals) || data.referrals.length !== data.totalReferrals) return false
  return data.referrals.every(member => member && typeof member === 'object'
    && Object.keys(member).length === 1 && member.label === REFERRAL_MEMBER_LABEL)
}
