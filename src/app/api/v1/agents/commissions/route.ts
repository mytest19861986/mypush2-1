import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth'
import { errorResponse, paginatedResponse, successResponse } from '@/lib/api-response'

// GET /api/v1/agents/commissions — List agent's commissions with stats
export async function GET(request: NextRequest) {
  const { authenticated, payload, error } = await authenticateRequest(request)
  if (!authenticated) return errorResponse('UNAUTHORIZED', error!, 401)

  if (!payload!.roles.includes('AGENT')) {
    return errorResponse('FORBIDDEN', 'AGENT role required', 403)
  }

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10', 10) || 10))
  const status = searchParams.get('status') || ''
  const includeStats = searchParams.get('stats') === 'true'

  const agent = await db.agent.findUnique({
    where: { userId: payload!.sub },
    select: { id: true },
  })

  if (!agent) {
    return errorResponse('NOT_FOUND', 'Agent record not found', 404)
  }

  // If stats requested, return aggregate data
  if (includeStats) {
    const [totalAmount, paidAmount, pendingAmount, cancelledAmount, totalReferrals, activePlans] =
      await Promise.all([
        // Total commission amount
        db.commission.aggregate({
          where: { agentId: agent.id },
          _sum: { amount: true },
        }),
        // Paid commission amount
        db.commission.aggregate({
          where: { agentId: agent.id, status: 'PAID' },
          _sum: { amount: true },
        }),
        // Pending commission amount
        db.commission.aggregate({
          where: { agentId: agent.id, status: { in: ['PENDING', 'APPROVED'] } },
          _sum: { amount: true },
        }),
        // Cancelled commission amount
        db.commission.aggregate({
          where: { agentId: agent.id, status: 'CANCELLED' },
          _sum: { amount: true },
        }),
        // Total unique users referred
        db.userPlan.groupBy({
          by: ['userId'],
          where: { referrerId: agent.id },
        }),
        // Active plans referred
        db.userPlan.count({
          where: { referrerId: agent.id, status: 'ACTIVE' },
        }),
      ])

    return successResponse({
      totalCommission: totalAmount._sum.amount || 0,
      paidCommission: paidAmount._sum.amount || 0,
      pendingCommission: pendingAmount._sum.amount || 0,
      cancelledCommission: cancelledAmount._sum.amount || 0,
      totalReferrals: totalReferrals.length,
      activePlans,
    }, 'Commission stats retrieved')
  }

  // Build where clause
  const where: Record<string, unknown> = { agentId: agent.id }
  if (status) {
    where.status = status
  }

  const [commissions, total] = await Promise.all([
    db.commission.findMany({
      where,
      include: {
        userPlan: {
          include: {
            plan: {
              select: { id: true, name: true },
            },
            user: {
              select: {
                id: true,
                profile: {
                  select: { firstName: true, lastName: true },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.commission.count({ where }),
  ])

  return paginatedResponse(commissions, {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  })
}
