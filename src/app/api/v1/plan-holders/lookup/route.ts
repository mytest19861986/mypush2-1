import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'
import { createAuditLog, AuditActions } from '@/lib/audit'
import { rateLimit } from '@/lib/rate-limit'
import { getClientIp } from '@/app/api/v1/auth/_helpers'

const planHolderLookupLimiter = rateLimit({ limitPerWindow: 30, windowMs: 5 * 60 * 1000 })

const querySchema = z
  .object({
    nationalCode: z.string().trim().optional(),
    nationalId: z.string().trim().optional(),
  })
  .transform((data) => ({
    nationalCode: data.nationalCode || data.nationalId || '',
  }))
  .refine((data) => /^\d{10}$/.test(data.nationalCode), {
    message: 'Valid 10-digit national code is required',
    path: ['nationalCode'],
  })

function maskNationalCode(nationalCode: string) {
  return `${'*'.repeat(Math.max(nationalCode.length - 4, 0))}${nationalCode.slice(-4)}`
}

// GET /api/v1/plan-holders/lookup?nationalCode=...
export async function GET(request: NextRequest) {
  const { authenticated, payload, error } = await authenticateRequest(request)
  if (!authenticated || !payload) return errorResponse('UNAUTHORIZED', error!, 401)

  const ip = getClientIp(request)
  const { allowed: lookupAllowed, retryAfter } = planHolderLookupLimiter.check(
    `plan-holder-lookup:${payload.sub}:${ip}`
  )

  if (!lookupAllowed) {
    return errorResponse(
      'RATE_LIMITED',
      `Too many lookup attempts. Try again in ${retryAfter} seconds`,
      429
    )
  }

  const allowed =
    payload.roles.includes('SUPER_ADMIN') ||
    payload.roles.includes('ADMIN') ||
    payload.roles.includes('DOCTOR') ||
    payload.permissions.includes('manage_users') ||
    payload.permissions.includes('manage_visits')

  if (!allowed) {
    return errorResponse('FORBIDDEN', 'Permission denied', 403)
  }

  const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams))
  if (!parsed.success) {
    return errorResponse(
      'VALIDATION_ERROR',
      parsed.error.issues.map((issue) => issue.message).join(', '),
      400
    )
  }

  const { nationalCode } = parsed.data
  const now = new Date()

  const planHolder = await db.planHolder.findUnique({
    where: { nationalCode },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      status: true,
      userPlans: {
        where: {
          status: 'ACTIVE',
          endDate: { gte: now },
        },
        select: {
          startDate: true,
          endDate: true,
          plan: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { endDate: 'desc' },
      },
    },
  })

  if (!planHolder) {
    createAuditLog({
      userId: payload.sub,
      action: AuditActions.PLAN_HOLDER_LOOKUP,
      entity: 'PlanHolder',
      entityId: undefined,
      details: {
        nationalCode: maskNationalCode(nationalCode),
        hasActivePlan: false,
      },
      ip,
      device: request.headers.get('user-agent') || undefined,
    })

    return successResponse({
      hasActivePlan: false,
      status: 'NOT_FOUND',
      planHolder: null,
      plans: [],
    })
  }

  const activePlans = planHolder.userPlans.map((userPlan) => ({
    planTitle: userPlan.plan.name,
    startDate: userPlan.startDate.toISOString(),
    endDate: userPlan.endDate.toISOString(),
  }))
  const hasActivePlan = planHolder.status === 'ACTIVE' && activePlans.length > 0

  createAuditLog({
    userId: payload.sub,
    action: AuditActions.PLAN_HOLDER_LOOKUP,
    entity: 'PlanHolder',
    entityId: planHolder.id,
    details: {
      nationalCode: maskNationalCode(nationalCode),
      hasActivePlan,
    },
    ip,
    device: request.headers.get('user-agent') || undefined,
  })

  return successResponse({
    hasActivePlan,
    status: planHolder.status !== 'ACTIVE' ? planHolder.status : hasActivePlan ? 'ACTIVE' : 'EXPIRED',
    planHolder: {
      firstName: planHolder.firstName,
      lastName: planHolder.lastName,
    },
    plans: activePlans,
  })
}
