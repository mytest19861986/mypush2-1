export const COMMISSION_PAYMENT_PERMISSION = 'manage_commission_payments'
export const COMMISSION_REVIEW_PERMISSION = 'manage_commissions'

type Access = { roles: readonly string[]; permissions: readonly string[] }

export function canPayCommissions(access: Access) {
  // Preserve existing full-admin authority; review permission never implies payment.
  return access.roles.includes('SUPER_ADMIN') || access.roles.includes('ADMIN') ||
    access.permissions.includes(COMMISSION_PAYMENT_PERMISSION)
}
