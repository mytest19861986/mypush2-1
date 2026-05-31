export const SALES_CUSTOMER_STATUSES = [
  'PENDING_REVIEW',
  'APPROVED',
  'CARD_ISSUED',
  'SHIPPED',
  'DELIVERED',
  'PAID',
  'CONFIRMED',
  'RETURNED',
] as const

export type SalesCustomerStatus = (typeof SALES_CUSTOMER_STATUSES)[number]

export function canManageSalesCustomers(payload: { roles: string[]; permissions: string[] }) {
  return (
    payload.roles.includes('SUPER_ADMIN') ||
    payload.roles.includes('ADMIN') ||
    payload.permissions.includes('manage_sales_customers')
  )
}

export function canViewSalesCustomers(payload: { roles: string[]; permissions: string[] }) {
  return canManageSalesCustomers(payload) || payload.permissions.includes('view_sales_customers')
}

export function isSalesPartner(payload: { roles: string[] }) {
  return payload.roles.includes('AGENT')
}

export function isSafeId(value: string) {
  return value.length > 0 && value.length <= 100 && /^[a-zA-Z0-9_-]+$/.test(value)
}

export function parseBoundedInteger(value: string | null, defaultValue: number, maxValue: number) {
  if (value === null) return defaultValue

  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 0) return null

  return Math.min(parsed, maxValue)
}

export function maskNationalCode(nationalCode: string | null | undefined) {
  if (!nationalCode) return null
  return `${'*'.repeat(Math.max(nationalCode.length - 4, 0))}${nationalCode.slice(-4)}`
}

export function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000)
}

export function toSafeSalesCustomerResponse(salesCustomer: {
  id: string
  salesPartnerId: string
  planId: string
  userPlanId: string | null
  firstName: string | null
  lastName: string | null
  mobile: string | null
  nationalCode: string | null
  address: string | null
  postalCode: string | null
  status: string
  paymentRef: string | null
  paymentDescription: string | null
  paidAt: Date | null
  confirmedAt: Date | null
  returnedAt: Date | null
  returnReason: string | null
  createdAt: Date
  updatedAt: Date
  plan?: {
    id: string
    name: string
  }
}) {
  return {
    id: salesCustomer.id,
    salesPartnerId: salesCustomer.salesPartnerId,
    planId: salesCustomer.planId,
    userPlanId: salesCustomer.userPlanId,
    firstName: salesCustomer.firstName,
    lastName: salesCustomer.lastName,
    mobile: salesCustomer.mobile,
    nationalCode: maskNationalCode(salesCustomer.nationalCode),
    address: salesCustomer.address,
    postalCode: salesCustomer.postalCode,
    status: salesCustomer.status,
    paymentRef: salesCustomer.paymentRef,
    paymentDescription: salesCustomer.paymentDescription,
    paidAt: salesCustomer.paidAt?.toISOString() ?? null,
    confirmedAt: salesCustomer.confirmedAt?.toISOString() ?? null,
    returnedAt: salesCustomer.returnedAt?.toISOString() ?? null,
    returnReason: salesCustomer.returnReason,
    createdAt: salesCustomer.createdAt.toISOString(),
    updatedAt: salesCustomer.updatedAt.toISOString(),
    ...(salesCustomer.plan && {
      plan: {
        id: salesCustomer.plan.id,
        title: salesCustomer.plan.name,
      },
    }),
  }
}
