import { db } from '@/lib/db'

export interface UserItemContract {
  id: string
  fullName: string
  mobile: string
  nationalCode?: string
  role: 'USER' | 'DOCTOR' | 'AGENT' | 'ADMIN'
  roleLabel: string
  status: 'ACTIVE' | 'PENDING' | 'SUSPENDED'
  statusLabel: string
  plan: string
  joinDate: string
  lastActivity: string
  avatarInitial: string
}

export interface UserStatsContract {
  totalUsers: number
  activeUsers: number
  pendingKyc: number
  suspendedUsers: number
}

export interface UserListResponseContract {
  users: UserItemContract[]
  stats: UserStatsContract
  totalCount: number
  page: number
  pageSize: number
  source: 'REAL_DATABASE' | 'DEMO_FALLBACK'
}

export interface UserFilterOptions {
  searchQuery?: string
  roleFilter?: string
  statusFilter?: string
  page?: number
  pageSize?: number
}

/**
 * Demo fallback data for Users adhering strictly to v2.4 baseline.
 */
export function getUserDemoData(): UserListResponseContract {
  const users: UserItemContract[] = [
    {
      id: 'USR-8910',
      fullName: 'سارا میرزایی',
      mobile: '۰۹۱۲۳۴۵۶۷۸۹',
      nationalCode: '۰۰۱۲۳۴۵۶۷۸',
      role: 'USER',
      roleLabel: 'کاربر عادی (بیمه شده)',
      status: 'ACTIVE',
      statusLabel: 'فعال',
      plan: 'طرح طلایی سلامت',
      joinDate: '۱۴۰۳/۰۴/۱۲',
      lastActivity: '۱۰ دقیقه پیش',
      avatarInitial: 'س',
    },
    {
      id: 'USR-8911',
      fullName: 'دکتر علیرضا افشارزاده',
      mobile: '۰۹۱۹۸۷۶۵۴۳۲',
      nationalCode: '۰۴۵۱۱۲۲۳۳۴',
      role: 'DOCTOR',
      roleLabel: 'پزشک همکار متخصص',
      status: 'ACTIVE',
      statusLabel: 'فعال',
      plan: 'طرف قرارداد ونک',
      joinDate: '۱۴۰۳/۰۳/۰۱',
      lastActivity: 'امروز ۱۷:۳۰',
      avatarInitial: 'ع',
    },
    {
      id: 'USR-8912',
      fullName: 'پیمان حسینی',
      mobile: '۰۹۳۵۱۱۲۲۳۳۴',
      nationalCode: '۰۳۲۴۴۵۵۶۶۷',
      role: 'AGENT',
      roleLabel: 'نماینده رسمی فروش',
      status: 'PENDING',
      statusLabel: 'در انتظار تأیید',
      plan: 'شعبه غرب تهران',
      joinDate: '۱۴۰۳/۰۵/۱۰',
      lastActivity: 'دیروز',
      avatarInitial: 'پ',
    },
    {
      id: 'USR-8913',
      fullName: 'مهسا کاظمی',
      mobile: '۰۹۱۸۲۲۲۳۳۴۴',
      nationalCode: '۰۶۵۸۸۹۹۰۰۱',
      role: 'USER',
      roleLabel: 'کاربر عادی',
      status: 'ACTIVE',
      statusLabel: 'فعال',
      plan: 'طرح نقره‌ای دندانپزشکی',
      joinDate: '۱۴۰۳/۰۶/۱۵',
      lastActivity: '۲ ساعت پیش',
      avatarInitial: 'م',
    },
    {
      id: 'USR-8914',
      fullName: 'امید سعادت',
      mobile: '۰۹۳۰۵۵۵۶۶۷۷',
      nationalCode: '۰۰۷۶۵۴۳۲۱۰',
      role: 'USER',
      roleLabel: 'کاربر عادی',
      status: 'SUSPENDED',
      statusLabel: 'معلق شده',
      plan: 'منقضی شده',
      joinDate: '۱۴۰۲/۱۱/۲۰',
      lastActivity: '۳ هفته پیش',
      avatarInitial: 'ا',
    },
  ]

  return {
    users,
    stats: {
      totalUsers: 14250,
      activeUsers: 12540,
      pendingKyc: 386,
      suspendedUsers: 1324,
    },
    totalCount: users.length,
    page: 1,
    pageSize: 10,
    source: 'DEMO_FALLBACK',
  }
}

/**
 * Fetch and transform live user entities from Prisma ORM into View Contracts.
 */
export async function getLiveUsersData(options: UserFilterOptions = {}): Promise<UserListResponseContract> {
  const { searchQuery = '', roleFilter = 'ALL', statusFilter = 'ALL', page = 1, pageSize = 10 } = options

  try {
    const whereClause: any = {
      deletedAt: null,
    }

    if (statusFilter !== 'ALL') {
      whereClause.status = statusFilter === 'SUSPENDED' ? 'BLOCKED' : statusFilter
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim()
      whereClause.OR = [
        { mobile: { contains: q } },
        { profile: { firstName: { contains: q } } },
        { profile: { lastName: { contains: q } } },
        { profile: { nationalCode: { contains: q } } },
      ]
    }

    if (roleFilter !== 'ALL') {
      whereClause.roles = {
        some: {
          role: {
            name: roleFilter,
          },
        },
      }
    }

    const [totalMatching, dbUsers, totalCount, activeCount, blockedCount] = await Promise.all([
      db.user.count({ where: whereClause }),
      db.user.findMany({
        where: whereClause,
        take: pageSize,
        skip: (page - 1) * pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          profile: true,
          roles: { include: { role: true } },
          userPlans: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            include: { plan: true },
          },
        },
      }),
      db.user.count({ where: { deletedAt: null } }),
      db.user.count({ where: { status: 'ACTIVE', deletedAt: null } }),
      db.user.count({ where: { status: 'BLOCKED', deletedAt: null } }),
    ])

    if (dbUsers.length === 0 && !searchQuery && roleFilter === 'ALL' && statusFilter === 'ALL') {
      // In development if table is completely unseeded, fall back gracefully
      return getUserDemoData()
    }

    const transformedUsers: UserItemContract[] = dbUsers.map((u) => {
      const p = u.profile
      const fullName = (p?.firstName || p?.lastName) ? `${p?.firstName || ''} ${p?.lastName || ''}`.trim() : 'کاربر بدون نام'
      const primaryRole = u.roles[0]?.role?.name || 'USER'
      
      let mappedRole: 'USER' | 'DOCTOR' | 'AGENT' | 'ADMIN' = 'USER'
      let roleLabel = 'کاربر عادی'
      if (primaryRole.includes('ADMIN')) {
        mappedRole = 'ADMIN'
        roleLabel = 'مدیر سیستم'
      } else if (primaryRole.includes('DOCTOR')) {
        mappedRole = 'DOCTOR'
        roleLabel = 'پزشک همکار'
      } else if (primaryRole.includes('AGENT')) {
        mappedRole = 'AGENT'
        roleLabel = 'نماینده فروش'
      }

      const status: 'ACTIVE' | 'PENDING' | 'SUSPENDED' =
        u.status === 'ACTIVE' ? 'ACTIVE' : u.status === 'BLOCKED' ? 'SUSPENDED' : 'PENDING'

      const statusLabel =
        status === 'ACTIVE' ? 'فعال' : status === 'SUSPENDED' ? 'معلق شده' : 'در انتظار تأیید'

      const joinDate = u.createdAt ? new Date(u.createdAt).toLocaleDateString('fa-IR') : '—'
      const avatarInitial = fullName.charAt(0) || 'ک'

      return {
        id: `USR-${u.id.slice(-6).toUpperCase()}`,
        fullName,
        mobile: u.mobile || '—',
        nationalCode: p?.nationalCode || '—',
        role: mappedRole,
        roleLabel,
        status,
        statusLabel,
        plan: u.userPlans[0]?.plan?.name || 'طرح طلایی سلامت',
        joinDate,
        lastActivity: 'امروز',
        avatarInitial,
      }
    })

    return {
      users: transformedUsers,
      stats: {
        totalUsers: totalCount,
        activeUsers: activeCount,
        pendingKyc: Math.max(0, totalCount - activeCount - blockedCount),
        suspendedUsers: blockedCount,
      },
      totalCount: totalMatching,
      page,
      pageSize,
      source: 'REAL_DATABASE',
    }
  } catch (error) {
    console.error('[UserAdapter] Error querying live user entities, returning demo fallback:', error)
    return getUserDemoData()
  }
}

/**
 * Universal User Data Access Adapter
 */
export async function getUserAdapter(options: UserFilterOptions = {}, useMock = false): Promise<UserListResponseContract> {
  if (useMock) {
    return getUserDemoData()
  }
  return getLiveUsersData(options)
}
