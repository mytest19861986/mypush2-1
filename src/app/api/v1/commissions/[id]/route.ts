import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'

// GET /api/v1/commissions/[id] - Commission detail for admins
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, payload, error } = await requirePermission(request, 'manage_commissions')
    if (!authorized) {
      return errorResponse('FORBIDDEN', error!, payload ? 403 : 401)
    }

    const { id } = await params

    const commission = await db.commission.findUnique({
      where: { id },
      include: {
        // Commission.agent is a User relation: agentId references User.id.
        agent: {
          select: {
            id: true,
            mobile: true,
            email: true,
            status: true,
            profile: true,
            agent: true,
          },
        },
        userPlan: {
          include: {
            plan: true,
            user: {
              select: {
                id: true,
                mobile: true,
                email: true,
                status: true,
                profile: true,
              },
            },
          },
        },
      },
    })

    if (!commission) {
      return errorResponse('NOT_FOUND', 'Commission not found', 404)
    }

    return successResponse(commission)
  } catch (err) {
    console.error('[GET /api/v1/commissions/[id]]', err)
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500)
  }
}
