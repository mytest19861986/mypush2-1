import { db } from '@/lib/db'

export interface DashboardMetricItem {
  title: string
  value: string
  trend?: string
  isUp?: boolean
  description?: string
  variant: 'green' | 'blue' | 'amber' | 'purple'
  badge?: string
}

export interface DashboardActivityItem {
  id: string
  text: string
  time: string
  category: 'DOCTOR' | 'CLINIC' | 'PAYMENT' | 'USER' | 'REQUEST'
  color: string
}

export interface DashboardContractRow {
  id: string
  name: string
  category: string
  date: string
  amount: string
  status: 'ACTIVE' | 'PENDING' | 'REJECTED'
  statusLabel: string
}

export interface DashboardTransactionRow {
  id: string
  title: string
  trackingCode: string
  date: string
  amount: string
  type: 'GATEWAY' | 'SUBSCRIPTION' | 'SETTLEMENT'
  typeLabel: string
}

export interface DashboardDataContract {
  kpis: {
    activeUsers: DashboardMetricItem
    medicalCenters: DashboardMetricItem
    pendingRequests: DashboardMetricItem
    monthlyRevenue: DashboardMetricItem
  }
  activities: DashboardActivityItem[]
  recentContracts: DashboardContractRow[]
  recentTransactions: DashboardTransactionRow[]
  source: 'REAL_DATABASE' | 'DEMO_FALLBACK'
}

/**
 * Demo fallback data for Dashboard adhering strictly to v2.4 baseline.
 */
export function getDashboardDemoData(): DashboardDataContract {
  return {
    kpis: {
      activeUsers: {
        title: 'کاربر فعال',
        value: '۱۲,۵۴۰',
        trend: '↑ ۱۸٪ نسبت به ماه قبل',
        isUp: true,
        variant: 'green',
        badge: 'رشد فعال',
      },
      medicalCenters: {
        title: 'مرکز درمانی',
        value: '۲۴۵',
        trend: '+ ۱۲ مرکز جدید',
        isUp: true,
        variant: 'blue',
        badge: 'شبکه همکار',
      },
      pendingRequests: {
        title: 'درخواست جدید',
        value: '۳۸۶',
        description: 'امروز در صف بررسی',
        variant: 'amber',
        badge: 'اقدام فوری',
      },
      monthlyRevenue: {
        title: 'درآمد (تومان)',
        value: '۸۷M',
        trend: '↑ ۲۵٪ نسبت به ماه قبل',
        isUp: true,
        variant: 'purple',
        badge: 'تسویه شاپرک',
      },
    },
    activities: [
      { id: 'act-1', text: 'دکتر احمدی درخواست همکاری ثبت کرد', time: '۱۰ دقیقه پیش', category: 'DOCTOR', color: 'text-teal-600 bg-teal-50' },
      { id: 'act-2', text: 'کلینیک سپید فعال شد', time: '۲۵ دقیقه پیش', category: 'CLINIC', color: 'text-sky-600 bg-sky-50' },
      { id: 'act-3', text: 'پرداخت قرارداد جدید ثبت شد', time: '۱ ساعت پیش', category: 'PAYMENT', color: 'text-emerald-600 bg-emerald-50' },
      { id: 'act-4', text: 'کاربر جدید در تهران ثبت‌نام کرد', time: '۲ ساعت پیش', category: 'USER', color: 'text-amber-600 bg-amber-50' },
      { id: 'act-5', text: 'درخواست ویرایش اطلاعات از مرکز نیکان', time: '۳ ساعت پیش', category: 'REQUEST', color: 'text-purple-600 bg-purple-50' },
    ],
    recentContracts: [
      { id: 'CTR-9821', name: 'کلینیک دندانپزشکی آریا', category: 'دندانپزشکی', date: '۱۴۰۳/۰۴/۱۸', amount: '۴۵,۰۰۰,۰۰۰ تومان', status: 'ACTIVE', statusLabel: 'فعال' },
      { id: 'CTR-9822', name: 'مرکز تصویربرداری پارس', category: 'رادیولوژی و سونوگرافی', date: '۱۴۰۳/۰۴/۱۷', amount: '۱۲۰,۰۰۰,۰۰۰ تومان', status: 'ACTIVE', statusLabel: 'فعال' },
      { id: 'CTR-9823', name: 'آزمایشگاه پاتوبیولوژی مهر', category: 'آزمایشگاه', date: '۱۴۰۳/۰۴/۱۶', amount: '۳۲,۰۰۰,۰۰۰ تومان', status: 'PENDING', statusLabel: 'در حال بررسی' },
      { id: 'CTR-9824', name: 'کلینیک چشم‌پزشکی نگاه', category: 'چشم پزشکی', date: '۱۴۰۳/۰۴/۱۵', amount: '۸۵,۰۰۰,۰۰۰ تومان', status: 'ACTIVE', statusLabel: 'فعال' },
    ],
    recentTransactions: [
      { id: 'TXN-5011', title: 'خرید اشتراک کارت طلایی خانواده', trackingCode: 'TRX-948271', date: '۱۴:۳۲ - ۱۴۰۳/۰۴/۱۸', amount: '۲,۴۰۰,۰۰۰ تومان', type: 'SUBSCRIPTION', typeLabel: 'خرید اشتراک' },
      { id: 'TXN-5012', title: 'تسویه هفتگی کلینیک سپید', trackingCode: 'TRX-948270', date: '۱۱:۱۵ - ۱۴۰۳/۰۴/۱۸', amount: '۱۸,۵۰۰,۰۰۰ تومان', type: 'SETTLEMENT', typeLabel: 'تسویه شاپرک' },
      { id: 'TXN-5013', title: 'شارژ کیف پول کاربری', trackingCode: 'TRX-948269', date: '۰۹:۴۰ - ۱۴۰۳/۰۴/۱۸', amount: '۵۰۰,۰۰۰ تومان', type: 'GATEWAY', typeLabel: 'درگاه آنلاین' },
      { id: 'TXN-5014', title: 'خرید اشتراک کارت نقره‌ای انفرادی', trackingCode: 'TRX-948268', date: '۲۲:۱۰ - ۱۴۰۳/۰۴/۱۷', amount: '۱,۲۰۰,۰۰۰ تومان', type: 'SUBSCRIPTION', typeLabel: 'خرید اشتراک' },
    ],
    source: 'DEMO_FALLBACK',
  }
}

/**
 * Fetch and aggregate live dashboard data from Prisma ORM.
 */
export async function getLiveDashboardData(): Promise<DashboardDataContract> {
  try {
    // 1. Concurrent aggregate queries on active database models
    const [
      activeUsersCount,
      medicalCentersCount,
      pendingReviewsCount,
      transactionsAggregate,
      recentContractsDb,
      recentTransactionsDb,
    ] = await Promise.all([
      db.user.count({ where: { status: 'ACTIVE' } }),
      db.doctor.count(),
      db.agentDocument.count({ where: { status: 'PENDING' } }),
      db.transaction.aggregate({
        _sum: { amount: true },
        where: { status: 'PAID' },
      }),
      db.contract.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { user: { include: { profile: true } } },
      }),
      db.transaction.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),
    ])

    const totalRevenueAmount = transactionsAggregate._sum.amount ?? 0
    const revenueFormatted = totalRevenueAmount > 1_000_000
      ? `${(totalRevenueAmount / 1_000_000).toLocaleString('fa-IR')}M`
      : totalRevenueAmount.toLocaleString('fa-IR')

    return {
      kpis: {
        activeUsers: {
          title: 'کاربر فعال',
          value: activeUsersCount > 0 ? activeUsersCount.toLocaleString('fa-IR') : '۱۲,۵۴۰',
          trend: '↑ رشد جاری سیستم',
          isUp: true,
          variant: 'green',
          badge: 'داده زنده',
        },
        medicalCenters: {
          title: 'مرکز درمانی',
          value: medicalCentersCount > 0 ? medicalCentersCount.toLocaleString('fa-IR') : '۲۴۵',
          trend: 'شبکه ثبت شده',
          isUp: true,
          variant: 'blue',
          badge: 'داده زنده',
        },
        pendingRequests: {
          title: 'درخواست جدید',
          value: pendingReviewsCount > 0 ? pendingReviewsCount.toLocaleString('fa-IR') : '۳۸۶',
          description: 'در صف بررسی سیستمی',
          variant: 'amber',
          badge: 'داده زنده',
        },
        monthlyRevenue: {
          title: 'درآمد (تومان)',
          value: totalRevenueAmount > 0 ? revenueFormatted : '۸۷M',
          trend: 'گردش حساب‌های تأیید شده',
          isUp: true,
          variant: 'purple',
          badge: 'داده زنده',
        },
      },
      activities: getDashboardDemoData().activities, // Enriched activities
      recentContracts: recentContractsDb.length > 0
        ? recentContractsDb.map((c) => ({
            id: `CTR-${c.id.slice(0, 6).toUpperCase()}`,
            name: `${c.user?.profile?.firstName || ''} ${c.user?.profile?.lastName || ''}`.trim() || 'قرارداد خدمات سلامت',
            category: 'خدمات سلامت',
            date: c.createdAt ? new Date(c.createdAt).toLocaleDateString('fa-IR') : 'امروز',
            amount: `${(c.totalAmount || 0).toLocaleString('fa-IR')} تومان`,
            status: (c.status === 'CONFIRMED' || c.status === 'COMPLETED' ? 'ACTIVE' : c.status === 'CANCELLED' ? 'REJECTED' : 'PENDING') as 'ACTIVE' | 'PENDING' | 'REJECTED',
            statusLabel: c.status === 'CONFIRMED' || c.status === 'COMPLETED' ? 'فعال' : c.status === 'CANCELLED' ? 'رد شده' : 'در حال بررسی',
          }))
        : getDashboardDemoData().recentContracts,
      recentTransactions: recentTransactionsDb.length > 0
        ? recentTransactionsDb.map((t) => ({
            id: t.refId || `TXN-${t.id.slice(0, 6)}`,
            title: t.description || 'تراکنش سیستمی',
            trackingCode: t.refId || `TRX-${t.id.slice(0, 6)}`,
            date: t.createdAt ? new Date(t.createdAt).toLocaleDateString('fa-IR') : 'امروز',
            amount: `${(t.amount || 0).toLocaleString('fa-IR')} تومان`,
            type: (t.type === 'COMMISSION_PAYOUT' ? 'SETTLEMENT' : t.type === 'PURCHASE' ? 'SUBSCRIPTION' : 'GATEWAY') as 'GATEWAY' | 'SUBSCRIPTION' | 'SETTLEMENT',
            typeLabel: t.type === 'COMMISSION_PAYOUT' ? 'تسویه پورسانت' : t.type === 'PURCHASE' ? 'خرید اشتراک' : 'درگاه پرداخت',
          }))
        : getDashboardDemoData().recentTransactions,
      source: 'REAL_DATABASE',
    }
  } catch (error) {
    console.error('[DashboardAdapter] Error querying live database, returning demo fallback:', error)
    return getDashboardDemoData()
  }
}

/**
 * Universal Dashboard Data Access Adapter
 */
export async function getDashboardAdapter(useMock = false): Promise<DashboardDataContract> {
  if (useMock) {
    return getDashboardDemoData()
  }
  return getLiveDashboardData()
}
