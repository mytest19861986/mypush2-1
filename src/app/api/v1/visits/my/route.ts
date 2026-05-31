import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'
import { toSafeVisitResponse } from '@/lib/visits'

function parseBoundedInteger(value: string | null, defaultValue: number, maxValue: number) {
  if (value === null) return defaultValue

  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 0) return null

  return Math.min(parsed, maxValue)
}

// GET /api/v1/visits/my - Get visits linked to the current user
export async function GET(request: NextRequest) {
  try {
    const { authenticated, payload, error } = await authenticateRequest(request)
    if (!authenticated || !payload) return errorResponse('UNAUTHORIZED', error!, 401)

    const take = parseBoundedInteger(request.nextUrl.searchParams.get('take'), 50, 100)
    const skip = parseBoundedInteger(request.nextUrl.searchParams.get('skip'), 0, 10000)

    if (take === null || skip === null) {
      return errorResponse('VALIDATION_ERROR', 'Invalid pagination parameters', 400)
    }

    const visits = await db.visit.findMany({
      where: { userId: payload.sub },
      select: {
        id: true,
        status: true,
        visitedAt: true,
        createdAt: true,
        doctorId: true,
        planHolder: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        userPlan: {
          select: {
            endDate: true,
            plan: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: { visitedAt: 'desc' },
      take,
      skip,
    })

    return successResponse(visits.map(toSafeVisitResponse))
  } catch (err) {
    console.error('[GET /api/v1/visits/my]', err)
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500)
  }
}
