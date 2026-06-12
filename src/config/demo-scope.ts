export const DEMO_SCOPE_PHASE_1 = true

const PHASE_1_DEMO_HIDDEN_HREFS = new Set([
  '/agent/dashboard',
  '/agent/sales-customers',
  '/agent/commissions',
  '/agent/documents',
  '/agent/profile',
  '/admin/agents',
  '/admin/financial-management',
  '/admin/commissions',
  '/admin/sales-customers',
  '/admin/roles',
  '/admin/permissions',
  '/admin/audit-logs',
  '/register/agent',
])

export function isHiddenInPhase1Demo(href: string) {
  return DEMO_SCOPE_PHASE_1 && PHASE_1_DEMO_HIDDEN_HREFS.has(href)
}

export function phase1DemoVisibleItems<T extends { href: string }>(items: T[]) {
  if (!DEMO_SCOPE_PHASE_1) return items
  return items.filter((item) => !isHiddenInPhase1Demo(item.href))
}
