import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-response'
import { requireRole } from '@/lib/auth'

/**
 * GET /api/v1/commissions/my
 * Get current agent's commissions (requires AGENT role)
 */
export async function GET(request: NextRequest) {
  try {
    const { authorized, payload, error } = await requireRole(request, 'AGENT')

    if (!authorized || !payload) {
      return errorResponse('FORBIDDEN', error ?? 'دسترسی محدود شده', 403)
    }

    // Fetch all commissions for this agent
    const commissions = await db.commission.findMany({
      where: { agentId: payload.sub },
      include: {
        userPlan: {
          select: {
            id: true,
            status: true,
            startDate: true,
            endDate: true,
            plan: {
              select: {
                id: true,
                name: true,
                price: true,
              },
            },
            user: {
              select: {
                id: true,
                mobile: true,
                profile: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Calculate totals
    const pendingTotal = commissions
      .filter((c) => c.status === 'PENDING' || c.status === 'APPROVED')
      .reduce((sum, c) => sum + c.amount, 0)

    const paidTotal = commissions
      .filter((c) => c.status === 'PAID')
      .reduce((sum, c) => sum + c.amount, 0)

    const totalAmount = commissions.reduce((sum, c) => sum + c.amount, 0)

    return successResponse({
      commissions,
      totals: {
        pending: pendingTotal,
        paid: paidTotal,
        total: totalAmount,
      },
      summary: {
        totalCount: commissions.length,
        pendingCount: commissions.filter(
          (c) => c.status === 'PENDING' || c.status === 'APPROVED'
        ).length,
        paidCount: commissions.filter((c) => c.status === 'PAID').length,
      },
    })
  } catch {
    return errorResponse('INTERNAL_ERROR', 'خطای داخلی سرور', 500)
  }
}
