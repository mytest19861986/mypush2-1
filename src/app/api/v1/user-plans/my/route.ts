import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-response'
import { requireAuth } from '@/lib/auth'

/**
 * GET /api/v1/user-plans/my
 * Get current user's active plans (requires auth)
 */
export async function GET(request: NextRequest) {
  try {
    const { user } = await requireAuth(request)

    const userPlans = await db.userPlan.findMany({
      where: { userId: user.sub },
      include: {
        plan: {
          select: {
            id: true,
            name: true,
            description: true,
            discountPercent: true,
            durationDays: true,
            features: true,
          },
        },
      },
      orderBy: [{ status: 'desc' }, { createdAt: 'desc' }],
    })

    // Separate active plans from others
    const activePlans = userPlans.filter((up) => up.status === 'ACTIVE')
    const otherPlans = userPlans.filter((up) => up.status !== 'ACTIVE')

    return successResponse({
      plans: [...activePlans, ...otherPlans],
      activeCount: activePlans.length,
      totalCount: userPlans.length,
    })
  } catch (e) {
    const msg = (e as Error).message
    if (msg.includes('توکن') || msg.includes('token') || msg.includes('authorization')) {
      return errorResponse('UNAUTHORIZED', msg, 401)
    }
    return errorResponse('INTERNAL_ERROR', 'خطای داخلی سرور', 500)
  }
}
