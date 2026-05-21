import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'

// GET /api/v1/contracts/my — Get current user's contracts (requires auth)
export async function GET(request: NextRequest) {
  try {
    const { authenticated, payload, error } = await authenticateRequest(request)
    if (!authenticated) return errorResponse('UNAUTHORIZED', error!, 401)

    const userId = payload!.sub

    const contracts = await db.contract.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        userPlan: {
          include: { plan: true },
        },
        doctor: {
          include: {
            user: {
              select: {
                id: true,
                mobile: true,
                profile: { select: { firstName: true, lastName: true, avatar: true } },
              },
            },
          },
        },
      },
    })

    return successResponse(contracts)
  } catch (err) {
    console.error('[GET /api/v1/contracts/my]', err)
    return errorResponse('INTERNAL_ERROR', 'خطای داخلی سرور', 500)
  }
}
