import type { LucideIcon } from 'lucide-react'
import type { AuthUser } from '@/types'
import {
  BarChart3,
  Briefcase,
  CreditCard,
  FileText,
  LayoutDashboard,
  MessageSquareText,
  Shield,
  ShoppingBag,
  Stethoscope,
  User,
  UserCircle,
  UserSearch,
  Users,
  Wallet,
} from 'lucide-react'
import { hasFullAdminRole, userCanAccessAdmin } from '@/lib/admin-access'

export interface DashboardNavItem {
  href: string
  label: string
  icon: LucideIcon
  badge?: string
  requiredPermissions?: string[]
  requiresAdminAccess?: boolean
  adminOnly?: boolean
}

export const adminDashboardNav: DashboardNavItem[] = [
  { href: '/admin/dashboard', label: '\u062f\u0627\u0634\u0628\u0648\u0631\u062f', icon: LayoutDashboard, requiresAdminAccess: true },
  { href: '/admin/users', label: '\u06a9\u0627\u0631\u0628\u0631\u0627\u0646', icon: Users, requiredPermissions: ['manage_users'] },
  { href: '/admin/doctors', label: '\u067e\u0632\u0634\u06a9\u0627\u0646', icon: Stethoscope, requiredPermissions: ['manage_doctors'] },
  { href: '/admin/agents', label: '\u0647\u0645\u06a9\u0627\u0631\u0627\u0646 \u0641\u0631\u0648\u0634', icon: Briefcase, requiredPermissions: ['manage_agents'] },
  { href: '/admin/plans', label: '\u0637\u0631\u062d\u200c\u0647\u0627', icon: CreditCard, requiredPermissions: ['manage_plans'] },
  { href: '/admin/financial-management', label: '\u0645\u062f\u06cc\u0631\u06cc\u062a \u0645\u0627\u0644\u06cc', icon: CreditCard, adminOnly: true },
  { href: '/admin/commissions', label: '\u0645\u062f\u06cc\u0631\u06cc\u062a \u067e\u0648\u0631\u0633\u0627\u0646\u062a\u200c\u0647\u0627', icon: Wallet, requiredPermissions: ['manage_commissions'] },
  {
    href: '/admin/sales-customers',
    label: '\u0645\u0634\u062a\u0631\u06cc\u0627\u0646 \u0641\u0631\u0648\u0634',
    icon: ShoppingBag,
    requiredPermissions: ['manage_sales_customers'],
  },
  { href: '/admin/reviews', label: '\u0645\u062f\u06cc\u0631\u06cc\u062a \u0646\u0638\u0631\u0627\u062a', icon: MessageSquareText, requiredPermissions: ['manage_reviews'] },
  { href: '/admin/roles', label: '\u0646\u0642\u0634\u200c\u0647\u0627', icon: Shield, requiredPermissions: ['manage_roles'] },
  { href: '/admin/permissions', label: '\u062f\u0633\u062a\u0631\u0633\u06cc\u200c\u0647\u0627', icon: Shield, requiredPermissions: ['manage_permissions'] },
  { href: '/admin/audit-logs', label: '\u06af\u0632\u0627\u0631\u0634 \u0641\u0639\u0627\u0644\u06cc\u062a\u200c\u0647\u0627', icon: BarChart3, requiredPermissions: ['view_audit_logs'] },
]

export function canViewAdminNavItem(
  item: DashboardNavItem,
  user: Pick<AuthUser, 'roles' | 'permissions'> | null | undefined
) {
  if (!user) return false
  if (hasFullAdminRole(user.roles || [])) return true
  if (item.adminOnly) return false
  if (item.requiresAdminAccess) return userCanAccessAdmin(user)

  const requiredPermissions = item.requiredPermissions || []
  if (requiredPermissions.length === 0) return false

  const permissions = user.permissions || []
  return requiredPermissions.some((permission) => permissions.includes(permission))
}

export function getAdminDashboardNavForUser(
  user: Pick<AuthUser, 'roles' | 'permissions'> | null | undefined
) {
  return adminDashboardNav.filter((item) => canViewAdminNavItem(item, user))
}

export function getAdminNavItemForPath(pathname: string) {
  return [...adminDashboardNav]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => pathname === item.href || pathname.startsWith(item.href + '/'))
}

export const adminDashboardPageTitles: Record<string, string> = {
  '/admin/dashboard': '\u062f\u0627\u0634\u0628\u0648\u0631\u062f',
  '/admin/users': '\u0645\u062f\u06cc\u0631\u06cc\u062a \u06a9\u0627\u0631\u0628\u0631\u0627\u0646',
  '/admin/doctors': '\u0645\u062f\u06cc\u0631\u06cc\u062a \u067e\u0632\u0634\u06a9\u0627\u0646',
  '/admin/agents': '\u0645\u062f\u06cc\u0631\u06cc\u062a \u0647\u0645\u06a9\u0627\u0631\u0627\u0646 \u0641\u0631\u0648\u0634',
  '/admin/plans': '\u0637\u0631\u062d\u200c\u0647\u0627\u06cc \u062a\u062e\u0641\u06cc\u0641',
  '/admin/roles': '\u0646\u0642\u0634\u200c\u0647\u0627 \u0648 \u062f\u0633\u062a\u0631\u0633\u06cc\u200c\u0647\u0627',
  '/admin/permissions': '\u0645\u062f\u06cc\u0631\u06cc\u062a \u062f\u0633\u062a\u0631\u0633\u06cc\u200c\u0647\u0627',
  '/admin/audit-logs': '\u06af\u0632\u0627\u0631\u0634 \u062a\u063a\u06cc\u06cc\u0631\u0627\u062a',
  '/admin/reviews': '\u0645\u062f\u06cc\u0631\u06cc\u062a \u0646\u0638\u0631\u0627\u062a',
  '/admin/sales-customers': '\u0645\u0634\u062a\u0631\u06cc\u0627\u0646 \u0641\u0631\u0648\u0634',
  '/admin/financial-management': '\u0645\u062f\u06cc\u0631\u06cc\u062a \u0645\u0627\u0644\u06cc',
  '/admin/commissions': '\u0645\u062f\u06cc\u0631\u06cc\u062a \u067e\u0648\u0631\u0633\u0627\u0646\u062a\u200c\u0647\u0627',
}

export const userDashboardNav: DashboardNavItem[] = [
  { href: '/user/dashboard', label: '\u062f\u0627\u0634\u0628\u0648\u0631\u062f', icon: LayoutDashboard },
  { href: '/user/plans', label: '\u0637\u0631\u062d\u200c\u0647\u0627\u06cc \u0645\u0646', icon: CreditCard },
  { href: '/user/contracts', label: '\u0642\u0631\u0627\u0631\u062f\u0627\u062f\u0647\u0627', icon: FileText },
  { href: '/user/profile', label: '\u067e\u0631\u0648\u0641\u0627\u06cc\u0644', icon: User },
]

export const doctorDashboardNav: DashboardNavItem[] = [
  { href: '/doctor/dashboard', label: '\u062f\u0627\u0634\u0628\u0648\u0631\u062f', icon: LayoutDashboard },
  { href: '/doctor/patients', label: '\u0628\u0631\u0631\u0633\u06cc \u0628\u06cc\u0645\u0627\u0631\u0627\u0646', icon: UserSearch },
  { href: '/doctor/contracts', label: '\u0642\u0631\u0627\u0631\u062f\u0627\u062f\u0647\u0627', icon: FileText },
  { href: '/doctor/profile', label: '\u067e\u0631\u0648\u0641\u0627\u06cc\u0644', icon: UserCircle },
]

export const agentDashboardNav: DashboardNavItem[] = [
  { href: '/agent/dashboard', label: '\u062f\u0627\u0634\u0628\u0648\u0631\u062f', icon: LayoutDashboard },
  { href: '/agent/sales-customers', label: '\u0645\u0634\u062a\u0631\u06cc\u0627\u0646 \u0645\u0646', icon: ShoppingBag },
  { href: '/agent/commissions', label: '\u06a9\u06cc\u0641 \u067e\u0648\u0644 \u0648 \u067e\u0648\u0631\u0633\u0627\u0646\u062a', icon: Wallet },
  { href: '/agent/documents', label: '\u0645\u062f\u0627\u0631\u06a9', icon: FileText },
  { href: '/agent/profile', label: '\u067e\u0631\u0648\u0641\u0627\u06cc\u0644', icon: User },
]
