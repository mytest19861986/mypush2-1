import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'

// GET /api/v1/dashboard/stats — Dashboard statistics
// Role-based stats: admin, doctor, agent, user
export async function GET(request: NextRequest) {
  try {
    const { authenticated, payload, error } = await authenticateRequest(request)
    if (!authenticated) return errorResponse('UNAUTHORIZED', error!, 401)

    const userId = payload!.sub
    const roles = payload!.roles
    const permissions = payload!.permissions

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Admin stats
    if (permissions.includes('manage_users') || roles.includes('SUPER_ADMIN') || roles.includes('ADMIN')) {
      const [
        totalUsers,
        totalDoctors,
        totalAgents,
        pendingAgents,
        totalPlans,
        contractsToday,
        totalContracts,
        totalRevenue,
        monthlyRevenue,
        pendingContracts,
        activeUserPlans,
        paidUsersLast30DaysRaw,
        successfulPaymentsLast30Days,
        successfulPaymentsAmountLast30Days,
        totalLogs,
        todayLogs,
        topActionsRaw,
        topUsersRaw,
        recentActions,
      ] = await Promise.all([
        db.user.count({ where: { deletedAt: null } }),
        db.doctor.count(),
        db.agent.count(),
        db.agent.count({ where: { status: 'PENDING' } }),
        db.discountPlan.count({ where: { status: 'ACTIVE' } }),
        db.contract.count({ where: { createdAt: { gte: todayStart } } }),
        db.contract.count(),
        db.transaction.aggregate({
          where: { type: 'PURCHASE', status: 'SUCCESS' },
          _sum: { amount: true },
        }),
        db.payment.aggregate({
          where: { status: 'SUCCESS', paidAt: { gte: monthStart } },
          _sum: { finalAmount: true },
        }),
        db.contract.count({ where: { status: 'PENDING' } }),
        db.userPlan.count({ where: { status: 'ACTIVE', endDate: { gte: new Date() } } }),
        db.payment.findMany({
          where: {
            status: 'SUCCESS',
            paidAt: { gte: thirtyDaysAgo },
            userId: { not: null },
          },
          select: { userId: true },
          distinct: ['userId'],
        }),
        db.payment.count({
          where: { status: 'SUCCESS', paidAt: { gte: thirtyDaysAgo } },
        }),
        db.payment.aggregate({
          where: { status: 'SUCCESS', paidAt: { gte: thirtyDaysAgo } },
          _sum: { finalAmount: true },
        }),
        db.auditLog.count(),
        db.auditLog.count({ where: { createdAt: { gte: todayStart } } }),
        db.auditLog.groupBy({
          by: ['action'],
          _count: { action: true },
          orderBy: { _count: { action: 'desc' } },
          take: 5,
        }),
        db.auditLog.groupBy({
          by: ['userId'],
          where: { userId: { not: null } },
          _count: { userId: true },
          orderBy: { _count: { userId: 'desc' } },
          take: 5,
        }),
        db.auditLog.findMany({
          include: {
            user: {
              select: {
                profile: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
      ])

      const topUserIds = topUsersRaw.map((item) => item.userId).filter(Boolean) as string[]
      const topUsersFromDb =
        topUserIds.length > 0
          ? await db.user.findMany({
              where: { id: { in: topUserIds } },
              select: {
                id: true,
                profile: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            })
          : []
      const userMap = new Map(topUsersFromDb.map((user) => [user.id, user]))

      const topActions = topActionsRaw.map((item) => ({
        action: item.action,
        count: item._count.action,
      }))

      const topUsers = topUsersRaw.map((item) => {
        const user = userMap.get(item.userId as string)
        const name = user
          ? `${user.profile?.firstName ?? ''} ${user.profile?.lastName ?? ''}`.trim() || null
          : null

        return {
          userId: item.userId as string,
          name,
          mobile: null,
          count: item._count.userId,
        }
      })

      const formattedRecentActions = recentActions.map((log) => ({
        id: log.id,
        userId: log.userId,
        action: log.action,
        entity: log.entity,
        createdAt: log.createdAt.toISOString(),
        user: log.user
          ? {
              profile: log.user.profile,
            }
          : undefined,
      }))

      return successResponse({
        totalUsers,
        totalDoctors,
        totalAgents,
        pendingAgents,
        totalPlans,
        contractsToday,
        todayContracts: contractsToday,
        totalContracts,
        totalRevenue: totalRevenue._sum.amount ?? 0,
        monthlyRevenue: monthlyRevenue._sum.finalAmount ?? 0,
        pendingContracts,
        activeUserPlans,
        activePlans: activeUserPlans,
        paidUsersLast30Days: paidUsersLast30DaysRaw.length,
        successfulPaymentsLast30Days,
        successfulPaymentsAmountLast30Days: successfulPaymentsAmountLast30Days._sum.finalAmount ?? 0,
        totalLogs,
        todayLogs,
        topActions,
        topUsers,
        recentActions: formattedRecentActions,
      })
    }

    // Doctor stats
    if (roles.includes('DOCTOR')) {
      const doctor = await db.doctor.findUnique({ where: { userId } })
      if (!doctor) {
        return errorResponse('NOT_FOUND', 'پرونده پزشکی یافت نشد', 404)
      }

      const [
        contractsToday,
        totalPatients,
        totalContracts,
        totalDiscountGiven,
        totalRevenue,
      ] = await Promise.all([
        db.contract.count({
          where: { doctorId: doctor.id, createdAt: { gte: todayStart } },
        }),
        db.contract.groupBy({
          by: ['userId'],
          where: { doctorId: doctor.id },
        }),
        db.contract.count({ where: { doctorId: doctor.id } }),
        db.contract.aggregate({
          where: { doctorId: doctor.id },
          _sum: { discountAmount: true },
        }),
        db.contract.aggregate({
          where: { doctorId: doctor.id },
          _sum: { totalAmount: true },
        }),
      ])

      return successResponse({
        contractsToday,
        totalPatients: totalPatients.length,
        totalContracts,
        totalDiscountGiven: totalDiscountGiven._sum.discountAmount ?? 0,
        totalRevenue: totalRevenue._sum.totalAmount ?? 0,
      })
    }

    // Agent stats
    if (roles.includes('AGENT')) {
      const [
        totalCommission,
        commissions,
        referralsCount,
        pendingCommissions,
        paidCommissions,
      ] = await Promise.all([
        db.commission.aggregate({
          where: { agentId: userId },
          _sum: { amount: true },
        }),
        db.commission.findMany({
          where: { agentId: userId },
          select: { amount: true, status: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
        db.userPlan.count({ where: { referrerId: userId } }),
        db.commission.count({ where: { agentId: userId, status: 'PENDING' } }),
        db.commission.count({ where: { agentId: userId, status: 'PAID' } }),
      ])

      return successResponse({
        totalCommission: totalCommission._sum.amount ?? 0,
        recentCommissions: commissions,
        referralsCount,
        pendingCommissions,
        paidCommissions,
      })
    }

    // Regular user stats
    const [
      activePlans,
      totalSaved,
      contractsCount,
      expiredPlans,
    ] = await Promise.all([
      db.userPlan.count({
        where: { userId, status: 'ACTIVE', endDate: { gte: new Date() } },
      }),
      db.contract.aggregate({
        where: { userId },
        _sum: { discountAmount: true },
      }),
      db.contract.count({ where: { userId } }),
      db.userPlan.count({
        where: { userId, status: 'EXPIRED' },
      }),
    ])

    return successResponse({
      activePlans,
      totalSaved: totalSaved._sum.discountAmount ?? 0,
      contractsCount,
      expiredPlans,
    })
  } catch (err) {
    console.error('[GET /api/v1/dashboard/stats]', err)
    return errorResponse('INTERNAL_ERROR', 'خطای داخلی سرور', 500)
  }
}
