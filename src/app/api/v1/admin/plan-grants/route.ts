import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'
import { AuditActions } from '@/lib/audit'
import { getClientIp } from '@/app/api/v1/auth/_helpers'

const grantSchema = z.object({
  nationalCode: z.string().trim().regex(/^\d{10}$/, 'National code must be exactly 10 digits'),
  planId: z.string().min(1, 'Plan id is required'),
  firstName: z.string().trim().max(50).optional(),
  lastName: z.string().trim().max(50).optional(),
  mobile: z.string().trim().max(20).optional(),
  startDate: z.string().trim().optional(),
  endDate: z.string().trim().optional(),
  durationDays: z.number().int().positive().optional(),
  reason: z.string().trim().max(500).optional(),
})

function canGrantPlans(payload: { roles: string[]; permissions: string[] }) {
  return (
    payload.roles.includes('SUPER_ADMIN') ||
    payload.roles.includes('ADMIN') ||
    payload.permissions.includes('grant_user_plans')
  )
}

function parseDate(value: string | undefined, fieldName: string) {
  if (!value) return undefined

  if (!/^\d{4}-\d{2}-\d{2}T/.test(value)) {
    throw new Error(`${fieldName.toUpperCase()}_INVALID`)
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${fieldName.toUpperCase()}_INVALID`)
  }

  return date
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000)
}

function maskNationalCode(nationalCode: string) {
  return `${'*'.repeat(Math.max(nationalCode.length - 4, 0))}${nationalCode.slice(-4)}`
}

// POST /api/v1/admin/plan-grants - manually grant a plan without payment
export async function POST(request: NextRequest) {
  try {
    const { authenticated, payload, error } = await authenticateRequest(request)
    if (!authenticated || !payload) return errorResponse('UNAUTHORIZED', error!, 401)

    if (!canGrantPlans(payload)) {
      return errorResponse('FORBIDDEN', 'Admin plan grant permission required', 403)
    }

    const body = await request.json()
    const parsed = grantSchema.safeParse(body)

    if (!parsed.success) {
      return errorResponse(
        'VALIDATION_ERROR',
        parsed.error.issues.map((issue) => issue.message).join(', '),
        400
      )
    }

    const data = parsed.data
    const plan = await db.discountPlan.findUnique({
      where: { id: data.planId },
      select: {
        id: true,
        name: true,
        status: true,
        durationDays: true,
        maxUses: true,
      },
    })

    if (!plan) {
      return errorResponse('NOT_FOUND', 'Plan not found', 404)
    }

    if (plan.status !== 'ACTIVE') {
      return errorResponse('INVALID_PLAN', 'Plan is not active', 400)
    }

    // Avoid ambiguous grant duration: callers must provide endDate or durationDays, not both.
    if (data.endDate && data.durationDays !== undefined) {
      return errorResponse('VALIDATION_ERROR', 'Provide either endDate or durationDays, not both', 400)
    }

    const startDate = parseDate(data.startDate, 'startDate') ?? new Date()
    const endDate =
      parseDate(data.endDate, 'endDate') ??
      addDays(startDate, data.durationDays ?? plan.durationDays)

    if (endDate <= startDate) {
      return errorResponse('VALIDATION_ERROR', 'End date must be after start date', 400)
    }

    const ip = getClientIp(request)
    const device = request.headers.get('user-agent') || undefined
    const result = await db.$transaction(async (tx) => {
      const basicPlanHolderData: {
        firstName?: string
        lastName?: string
        mobile?: string
      } = {}

      if (data.firstName !== undefined) basicPlanHolderData.firstName = data.firstName
      if (data.lastName !== undefined) basicPlanHolderData.lastName = data.lastName
      if (data.mobile !== undefined) basicPlanHolderData.mobile = data.mobile

      const existingPlanHolder = await tx.planHolder.findUnique({
        where: { nationalCode: data.nationalCode },
        select: { id: true, userId: true },
      })
      const planHolder = existingPlanHolder
        ? existingPlanHolder.userId
          ? existingPlanHolder
          : await tx.planHolder.update({
              where: { id: existingPlanHolder.id },
              data: basicPlanHolderData,
              select: { id: true, userId: true },
            })
        : await tx.planHolder.create({
            data: {
              nationalCode: data.nationalCode,
              status: 'ACTIVE',
              ...basicPlanHolderData,
            },
            select: { id: true, userId: true },
          })

      // A PlanHolder may have multiple different active plans; this only blocks duplicate active grant for the same plan.
      const activeDuplicate = await tx.userPlan.findFirst({
        where: {
          planHolderId: planHolder.id,
          planId: plan.id,
          status: 'ACTIVE',
          endDate: { gte: new Date() },
        },
        select: { id: true },
      })

      if (activeDuplicate) {
        throw new Error('ACTIVE_PLAN_EXISTS')
      }

      const userPlan = await tx.userPlan.create({
        data: {
          userId: planHolder.userId,
          planHolderId: planHolder.id,
          planId: plan.id,
          paymentId: null,
          source: 'ADMIN_GRANT',
          status: 'ACTIVE',
          startDate,
          endDate,
          remainingUses: plan.maxUses === -1 ? -1 : plan.maxUses,
          totalUses: 0,
        },
      })

      await tx.auditLog.create({
        data: {
          userId: payload.sub,
          action: AuditActions.ADMIN_PLAN_GRANTED,
          entity: 'UserPlan',
          entityId: userPlan.id,
          details: JSON.stringify({
            userPlanId: userPlan.id,
            planHolderId: planHolder.id,
            planId: plan.id,
            nationalCode: maskNationalCode(data.nationalCode),
            source: 'ADMIN_GRANT',
            reason: data.reason,
          }),
          ip,
          device,
        },
      })

      return {
        userPlanId: userPlan.id,
        nationalCode: maskNationalCode(data.nationalCode),
        planTitle: plan.name,
        startDate: userPlan.startDate.toISOString(),
        endDate: userPlan.endDate.toISOString(),
        source: 'ADMIN_GRANT',
      }
    })

    return successResponse(result, 'Plan granted successfully', 201)
  } catch (err) {
    const message = (err as Error).message

    if (message === 'ACTIVE_PLAN_EXISTS') {
      return errorResponse('ACTIVE_PLAN_EXISTS', 'Active plan already exists', 400)
    }

    if (message === 'STARTDATE_INVALID') {
      return errorResponse('VALIDATION_ERROR', 'Invalid startDate', 400)
    }

    if (message === 'ENDDATE_INVALID') {
      return errorResponse('VALIDATION_ERROR', 'Invalid endDate', 400)
    }

    console.error('[POST /api/v1/admin/plan-grants]', err)
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500)
  }
}
