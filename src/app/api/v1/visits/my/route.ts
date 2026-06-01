import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'

function parseBoundedInteger(value: string | null, defaultValue: number, maxValue: number) {
  if (value === null) return defaultValue

  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 0) return null

  return Math.min(parsed, maxValue)
}

function getDoctorDisplayName(doctor: {
  user: {
    profile: {
      firstName: string | null
      lastName: string | null
    } | null
  }
}) {
  const profile = doctor.user.profile
  const name = `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim()
  return name || null
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
        doctor: {
          select: {
            specialty: true,
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
        },
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

    return successResponse(
      visits.map((visit) => ({
        visitId: visit.id,
        status: visit.status,
        visitedAt: visit.visitedAt?.toISOString() ?? null,
        createdAt: visit.createdAt.toISOString(),
        doctorName: getDoctorDisplayName(visit.doctor),
        doctorSpecialty: visit.doctor.specialty,
        plan: {
          title: visit.userPlan.plan.name,
          endDate: visit.userPlan.endDate.toISOString(),
        },
        planHolder: {
          firstName: visit.planHolder.firstName,
          lastName: visit.planHolder.lastName,
        },
      }))
    )
  } catch (err) {
    console.error('[GET /api/v1/visits/my]', err)
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500)
  }
}
