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

    // Admin stats
    if (permissions.includes('manage_users') || roles.includes('SUPER_ADMIN') || roles.includes('ADMIN')) {
      const [
        totalUsers,
        totalDoctors,
        totalAgents,
        totalPlans,
        contractsToday,
        totalContracts,
        totalRevenue,
        pendingContracts,
        activeUserPlans,
      ] = await Promise.all([
        db.user.count({ where: { deletedAt: null } }),
        db.doctor.count(),
        db.agent.count(),
        db.discountPlan.count({ where: { status: 'ACTIVE' } }),
        db.contract.count({ where: { createdAt: { gte: todayStart } } }),
        db.contract.count(),
        db.transaction.aggregate({
          where: { type: 'PURCHASE', status: 'SUCCESS' },
          _sum: { amount: true },
        }),
        db.contract.count({ where: { status: 'PENDING' } }),
        db.userPlan.count({ where: { status: 'ACTIVE', endDate: { gte: new Date() } } }),
      ])

      return successResponse({
        totalUsers,
        totalDoctors,
        totalAgents,
        totalPlans,
        contractsToday,
        totalContracts,
        totalRevenue: totalRevenue._sum.amount ?? 0,
        pendingContracts,
        activeUserPlans,
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
