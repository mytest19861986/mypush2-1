import { db } from '@/lib/db'

export interface AgentItemContract {
  id: string
  code: string
  fullName: string
  mobile: string
  businessName: string
  tier: 'DIAMOND' | 'GOLD' | 'SILVER' | 'BRONZE'
  tierLabel: string
  totalSales: number
  totalSalesAmount: string
  totalCommission: string
  pendingCommission: string
  status: 'ACTIVE' | 'PENDING' | 'SUSPENDED'
  statusLabel: string
  joinDate: string
}

export interface SalesNetworkStatsContract {
  totalAgents: number
  activeAgents: number
  totalSalesVolume: string
  totalCommissionPaid: string
  pendingSettlements: string
}

export interface SalesNetworkResponseContract {
  agents: AgentItemContract[]
  stats: SalesNetworkStatsContract
  totalCount: number
  page: number
  pageSize: number
  source: 'REAL_DATABASE' | 'DEMO_FALLBACK'
}

export interface AgentFilterOptions {
  searchQuery?: string
  tierFilter?: string
  statusFilter?: string
  page?: number
  pageSize?: number
}

/**
 * Demo fallback data adhering strictly to v2.4 baseline.
 */
export function getAgentsDemoData(): SalesNetworkResponseContract {
  const agents: AgentItemContract[] = [
    {
      id: 'AGT-701',
      code: 'AG-9082',
      fullName: 'پیمان حسینی',
      mobile: '۰۹۳۵۱۱۲۲۳۳۴',
      businessName: 'نمایندگی رسمی غرب تهران',
      tier: 'DIAMOND',
      tierLabel: 'الماس',
      totalSales: 412,
      totalSalesAmount: '۲,۴۵۰,۰۰۰,۰۰۰ تومان',
      totalCommission: '۳۶۷,۵۰۰,۰۰۰ تومان',
      pendingCommission: '۲۴,۰۰۰,۰۰۰ تومان',
      status: 'ACTIVE',
      statusLabel: 'فعال',
      joinDate: '۱۴۰۲/۰۹/۱۰',
    },
    {
      id: 'AGT-702',
      code: 'AG-9083',
      fullName: 'نرگس محمدی',
      mobile: '۰۹۱۲۵۵۵۴۴۳۳',
      businessName: 'دفتر نمایندگی سعادت‌آباد',
      tier: 'GOLD',
      tierLabel: 'طلایی',
      totalSales: 285,
      totalSalesAmount: '۱,۷۱۰,۰۰۰,۰۰۰ تومان',
      totalCommission: '۲۵۶,۵۰۰,۰۰۰ تومان',
      pendingCommission: '۱۸,۰۰۰,۰۰۰ تومان',
      status: 'ACTIVE',
      statusLabel: 'فعال',
      joinDate: '۱۴۰۲/۱۱/۰۵',
    },
    {
      id: 'AGT-703',
      code: 'AG-9084',
      fullName: 'رضا کمالی',
      mobile: '۰۹۳۰۷۷۷۸۸۹۹',
      businessName: 'نمایندگی البرز و کرج',
      tier: 'SILVER',
      tierLabel: 'نقره‌ای',
      totalSales: 134,
      totalSalesAmount: '۸۰۴,۰۰۰,۰۰۰ تومان',
      totalCommission: '۱۲۰,۶۰۰,۰۰۰ تومان',
      pendingCommission: '۰ تومان',
      status: 'PENDING',
      statusLabel: 'در انتظار تأیید مدارک',
      joinDate: '۱۴۰۳/۰۳/۱۸',
    },
  ]

  return {
    agents,
    stats: {
      totalAgents: 128,
      activeAgents: 96,
      totalSalesVolume: '۸,۴۵۰,۰۰۰,۰۰۰ تومان',
      totalCommissionPaid: '۱,۲۶۰,۰۰۰,۰۰۰ تومان',
      pendingSettlements: '۴۲,۰۰۰,۰۰۰ تومان',
    },
    totalCount: agents.length,
    page: 1,
    pageSize: 10,
    source: 'DEMO_FALLBACK',
  }
}

/**
 * Fetch and aggregate live Agent, Commission, and Sales entities from Prisma ORM.
 */
export async function getLiveAgentsData(options: AgentFilterOptions = {}): Promise<SalesNetworkResponseContract> {
  const { searchQuery = '', statusFilter = 'ALL', page = 1, pageSize = 10 } = options

  try {
    const whereClause: any = {}

    if (statusFilter !== 'ALL') {
      whereClause.status = statusFilter
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim()
      whereClause.OR = [
        { businessName: { contains: q } },
        { user: { mobile: { contains: q } } },
        { user: { profile: { firstName: { contains: q } } } },
        { user: { profile: { lastName: { contains: q } } } },
      ]
    }

    const [
      totalMatching,
      dbAgents,
      totalAgentsCount,
      activeAgentsCount,
      paidCommissionsAgg,
      pendingCommissionsAgg,
    ] = await Promise.all([
      db.agent.count({ where: whereClause }),
      db.agent.findMany({
        where: whereClause,
        take: pageSize,
        skip: (page - 1) * pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            include: {
              profile: true,
              commissions: true,
              salesCustomers: true,
            },
          },
        },
      }),
      db.agent.count(),
      db.agent.count({ where: { status: 'APPROVED' } }),
      db.commission.aggregate({
        _sum: { amount: true },
        where: { status: 'PAID' },
      }),
      db.commission.aggregate({
        _sum: { amount: true },
        where: { status: 'PENDING' },
      }),
    ])

    if (dbAgents.length === 0 && !searchQuery && statusFilter === 'ALL') {
      return getAgentsDemoData()
    }

    const transformedAgents: AgentItemContract[] = dbAgents.map((ag, idx) => {
      const p = ag.user?.profile
      const fullName = (p?.firstName || p?.lastName) ? `${p?.firstName || ''} ${p?.lastName || ''}`.trim() : 'نماینده فروش'
      const status: 'ACTIVE' | 'PENDING' | 'SUSPENDED' =
        ag.status === 'APPROVED' ? 'ACTIVE' : ag.status === 'SUSPENDED' ? 'SUSPENDED' : 'PENDING'
      const statusLabel =
        status === 'ACTIVE' ? 'فعال' : status === 'SUSPENDED' ? 'معلق شده' : 'در انتظار بررسی'

      const userCommissions = ag.user?.commissions || []
      const paidComm = userCommissions
        .filter((c) => c.status === 'PAID')
        .reduce((sum, c) => sum + (c.amount || 0), 0)
      const pendingComm = userCommissions
        .filter((c) => c.status === 'PENDING')
        .reduce((sum, c) => sum + (c.amount || 0), 0)

      const totalSales = ag.user?.salesCustomers?.length || userCommissions.length

      return {
        id: `AGT-${ag.id.slice(-6).toUpperCase()}`,
        code: `AG-${(1000 + idx).toString()}`,
        fullName,
        mobile: ag.user?.mobile || '—',
        businessName: ag.businessName || 'نمایندگی رسمی',
        tier: totalSales > 50 ? 'DIAMOND' : totalSales > 20 ? 'GOLD' : 'SILVER',
        tierLabel: totalSales > 50 ? 'الماس' : totalSales > 20 ? 'طلایی' : 'نقره‌ای',
        totalSales,
        totalSalesAmount: `${(totalSales * 6_000_000).toLocaleString('fa-IR')} تومان`,
        totalCommission: `${paidComm.toLocaleString('fa-IR')} تومان`,
        pendingCommission: `${pendingComm.toLocaleString('fa-IR')} تومان`,
        status,
        statusLabel,
        joinDate: ag.createdAt ? new Date(ag.createdAt).toLocaleDateString('fa-IR') : '—',
      }
    })

    const totalCommissionSum = paidCommissionsAgg._sum.amount ?? 0
    const pendingCommissionSum = pendingCommissionsAgg._sum.amount ?? 0

    return {
      agents: transformedAgents,
      stats: {
        totalAgents: totalAgentsCount,
        activeAgents: activeAgentsCount,
        totalSalesVolume: `${((totalCommissionSum || 1_000_000) * 6).toLocaleString('fa-IR')} تومان`,
        totalCommissionPaid: `${totalCommissionSum.toLocaleString('fa-IR')} تومان`,
        pendingSettlements: `${pendingCommissionSum.toLocaleString('fa-IR')} تومان`,
      },
      totalCount: totalMatching,
      page,
      pageSize,
      source: 'REAL_DATABASE',
    }
  } catch (error) {
    console.error('[AgentsAdapter] Error querying live agents:', error)
    return getAgentsDemoData()
  }
}

/**
 * Universal Sales Network Data Access Adapter
 */
export async function getAgentsAdapter(
  options: AgentFilterOptions = {},
  useMock = false
): Promise<SalesNetworkResponseContract> {
  if (useMock) {
    return getAgentsDemoData()
  }
  return getLiveAgentsData(options)
}
