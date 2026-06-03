import { NextRequest } from 'next/server'
import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'
import { canManageVisits, parseOptionalDate, toSafeVisitResponse } from '@/lib/visits'

function parseBoundedInteger(value: string | null, defaultValue: number, maxValue: number) {
  if (value === null) return defaultValue

  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 0) return null

  return Math.min(parsed, maxValue)
}

// GET /api/v1/visits/doctor - Get current doctor's visits or admin-filtered visits
export async function GET(request: NextRequest) {
  try {
    const { authenticated, payload, error } = await authenticateRequest(request)
    if (!authenticated || !payload) return errorResponse('UNAUTHORIZED', error!, 401)

    const isDoctor = payload.roles.includes('DOCTOR')
    const hasVisitManagerAccess = canManageVisits(payload)

    if (!isDoctor && !hasVisitManagerAccess) {
      return errorResponse('FORBIDDEN', 'Doctor or visit management permission required', 403)
    }

    const rawDoctorId = request.nextUrl.searchParams.get('doctorId')
    const doctorId = rawDoctorId === null ? undefined : rawDoctorId.trim()
    const from = parseOptionalDate(request.nextUrl.searchParams.get('from') ?? undefined)
    const to = parseOptionalDate(request.nextUrl.searchParams.get('to') ?? undefined)
    const take = parseBoundedInteger(request.nextUrl.searchParams.get('take'), 50, 100)
    const skip = parseBoundedInteger(request.nextUrl.searchParams.get('skip'), 0, 10000)

    if (
      rawDoctorId !== null &&
      (!doctorId || doctorId.length > 100 || !/^[a-zA-Z0-9_-]+$/.test(doctorId))
    ) {
      return errorResponse('VALIDATION_ERROR', 'Invalid doctorId', 400)
    }

    if (from === null || to === null) {
      return errorResponse('VALIDATION_ERROR', 'Invalid date filter', 400)
    }

    if (take === null || skip === null) {
      return errorResponse('VALIDATION_ERROR', 'Invalid pagination parameters', 400)
    }

    if (from && to && from > to) {
      return errorResponse('VALIDATION_ERROR', 'from must be before to', 400)
    }

    const where: Prisma.VisitWhereInput = {}

    if (isDoctor) {
      const doctor = await db.doctor.findUnique({
        where: { userId: payload.sub },
        select: { id: true },
      })

      if (!doctor) {
        return errorResponse('NOT_FOUND', 'Doctor record not found', 404)
      }

      if (doctorId && doctorId !== doctor.id) {
        return errorResponse('FORBIDDEN', 'Doctors can only access their own visits', 403)
      }

      where.doctorId = doctor.id
    } else if (doctorId) {
      where.doctorId = doctorId
    }

    if (from || to) {
      where.visitedAt = {
        ...(from && { gte: from }),
        ...(to && { lte: to }),
      }
    }

    const visits = await db.visit.findMany({
      where,
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
            nationalCode: true,
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
    console.error('[GET /api/v1/visits/doctor]', err)
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500)
  }
}
