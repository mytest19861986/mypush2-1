/**
 * Effective discount % for a visit: doctor-specific rate from admin, else patient's plan rate.
 */
export function getEffectiveDiscountPercent(
  doctorDiscountPercent: number | null | undefined,
  planDiscountPercent: number | null | undefined
): number {
  if (typeof doctorDiscountPercent === 'number' && doctorDiscountPercent > 0) {
    return Math.min(100, Math.max(0, doctorDiscountPercent))
  }
  return Math.min(100, Math.max(0, planDiscountPercent ?? 0))
}

export function calculateDiscountAmount(totalAmount: number, discountPercent: number): number {
  if (totalAmount <= 0 || discountPercent <= 0) return 0
  return Math.round((totalAmount * discountPercent) / 100)
}
