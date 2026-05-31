import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'
import { AuditActions } from '@/lib/audit'
import { canManageVisits, maskNationalCode, parseOptionalDate, toSafeVisitResponse } from '@/lib/visits'
import { getClientIp } from '@/app/api/v1/auth/_helpers'

const createVisitSchema = z.object({
  nationalCode: z.string().trim().regex(/^\d{10}$/, 'National code must be exactly 10 digits'),
  doctorId: z.string().trim().min(1, 'Doctor id is required').optional(),
  visitedAt: z.string().trim().optional(),
  notes: z.string().trim().max(1000, 'Notes must be at most 1000 characters').optional(),
})

class VisitError extends Error {
  constructor(
    public code:
      | 'DOCTOR_MISMATCH'
      | 'FORBIDDEN'
      | 'DOCTOR_ID_REQUIRED'
      | 'DOCTOR_NOT_FOUND'
      | 'DOCTOR_NOT_APPROVED'
  ) {
    super(code)
  }
}

async function resolveDoctor(payload: { sub: string; roles: string[]; permissions: string[] }, doctorId?: string) {
  const isDoctor = payload.roles.includes('DOCTOR')
  const hasVisitManagerAccess = canManageVisits(payload)

  if (isDoctor) {
    const doctor = await db.doctor.findUnique({
      where: { userId: payload.sub },
      select: { id: true, status: true },
    })

    if (!doctor) {
      throw new VisitError('DOCTOR_NOT_FOUND')
    }

    if (doctorId && doctorId !== doctor.id) {
      throw new VisitError('DOCTOR_MISMATCH')
    }

    if (doctor.status !== 'APPROVED') {
      throw new VisitError('DOCTOR_NOT_APPROVED')
    }

    return doctor
  }

  if (!hasVisitManagerAccess) {
    throw new VisitError('FORBIDDEN')
  }

  if (!doctorId) {
    throw new VisitError('DOCTOR_ID_REQUIRED')
  }

  const doctor = await db.doctor.findUnique({
    where: { id: doctorId },
    select: { id: true, status: true },
  })

  if (!doctor) {
    throw new VisitError('DOCTOR_NOT_FOUND')
  }

  if (doctor.status !== 'APPROVED') {
    throw new VisitError('DOCTOR_NOT_APPROVED')
  }

  return doctor
}

// POST /api/v1/visits - Register a completed visit for an active plan holder
export async function POST(request: NextRequest) {
  try {
    const { authenticated, payload, error } = await authenticateRequest(request)
    if (!authenticated || !payload) return errorResponse('UNAUTHORIZED', error!, 401)

    if (!payload.roles.includes('DOCTOR') && !canManageVisits(payload)) {
      return errorResponse('FORBIDDEN', 'Doctor or visit management permission required', 403)
    }

    const body = await request.json()
    const parsed = createVisitSchema.safeParse(body)

    if (!parsed.success) {
      return errorResponse(
        'VALIDATION_ERROR',
        parsed.error.issues.map((issue) => issue.message).join(', '),
        400
      )
    }

    const data = parsed.data
    const now = new Date()
    const parsedVisitedAt = parseOptionalDate(data.visitedAt)

    if (parsedVisitedAt === null) {
      return errorResponse('VALIDATION_ERROR', 'Invalid visitedAt', 400)
    }

    const visitedAt = parsedVisitedAt ?? now

    if (visitedAt > now) {
      return errorResponse('VALIDATION_ERROR', 'visitedAt cannot be in the future', 400)
    }

    const doctor = await resolveDoctor(payload, data.doctorId)

    const planHolder = await db.planHolder.findUnique({
      where: { nationalCode: data.nationalCode },
      select: {
        id: true,
        userId: true,
        firstName: true,
        lastName: true,
        status: true,
      },
    })

    if (!planHolder) {
      return errorResponse('NOT_FOUND', 'Plan holder not found', 404)
    }

    if (planHolder.status !== 'ACTIVE') {
      return errorResponse('BAD_REQUEST', 'Plan holder is not active', 400)
    }

    const activeUserPlan = await db.userPlan.findFirst({
      where: {
        planHolderId: planHolder.id,
        status: 'ACTIVE',
        startDate: { lte: now },
        endDate: { gte: now },
      },
      select: {
        id: true,
        userId: true,
        endDate: true,
        plan: {
          select: {
            name: true,
          },
        },
      },
      // When multiple active plans overlap, the plan with the latest endDate is selected intentionally.
      orderBy: [{ endDate: 'desc' }, { createdAt: 'desc' }],
    })

    if (!activeUserPlan) {
      return errorResponse('NOT_FOUND', 'No active plan found for plan holder', 404)
    }

    const ip = getClientIp(request)
    const device = request.headers.get('user-agent') || undefined

    const visit = await db.$transaction(async (tx) => {
      const createdVisit = await tx.visit.create({
        data: {
          userId: activeUserPlan.userId ?? planHolder.userId ?? null,
          planHolderId: planHolder.id,
          userPlanId: activeUserPlan.id,
          doctorId: doctor.id,
          status: 'COMPLETED',
          visitedAt,
          completedAt: visitedAt,
          ...(data.notes !== undefined && { doctorNote: data.notes }),
        },
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
      })

      await tx.auditLog.create({
        data: {
          userId: payload.sub,
          action: AuditActions.VISIT_CREATED,
          entity: 'Visit',
          entityId: createdVisit.id,
          details: JSON.stringify({
            visitId: createdVisit.id,
            doctorId: doctor.id,
            planHolderId: planHolder.id,
            userPlanId: activeUserPlan.id,
            nationalCode: maskNationalCode(data.nationalCode),
          }),
          ip,
          device,
        },
      })

      return createdVisit
    })

    return successResponse(toSafeVisitResponse(visit), 'Visit created successfully', 201)
  } catch (err) {
    if (err instanceof VisitError) {
      const visitErrorResponses: Record<VisitError['code'], [string, string, number]> = {
        DOCTOR_MISMATCH: ['FORBIDDEN', 'Doctors can only create visits for their own profile', 403],
        FORBIDDEN: ['FORBIDDEN', 'Permission denied', 403],
        DOCTOR_ID_REQUIRED: ['VALIDATION_ERROR', 'doctorId is required', 400],
        DOCTOR_NOT_FOUND: ['NOT_FOUND', 'Doctor not found', 404],
        DOCTOR_NOT_APPROVED: ['FORBIDDEN', 'Doctor is not approved', 403],
      }
      const [code, message, statusCode] = visitErrorResponses[err.code]
      return errorResponse(code, message, statusCode)
    }

    console.error('[POST /api/v1/visits]', err)
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500)
  }
}
