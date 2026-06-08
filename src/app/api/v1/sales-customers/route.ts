import { NextRequest } from 'next/server'
import type { Prisma } from '@prisma/client'
import { z } from 'zod'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'
import { AuditActions } from '@/lib/audit'
import {
  SALES_CUSTOMER_STATUSES,
  canViewSalesCustomers,
  canManageSalesCustomers,
  isSafeId,
  isSalesPartner,
  maskNationalCode,
  parseBoundedInteger,
  toSafeSalesCustomerResponse,
} from '@/lib/sales-customers'
import { getClientIp } from '@/app/api/v1/auth/_helpers'

const createSalesCustomerSchema = z.object({
  planId: z.string().trim().refine(isSafeId, 'Invalid planId'),
  salesPartnerId: z.string().trim().refine(isSafeId, 'Invalid salesPartnerId').optional(),
  firstName: z.string().trim().max(50).optional(),
  lastName: z.string().trim().max(50).optional(),
  mobile: z.string().trim().max(20).optional(),
  nationalCode: z.string().trim().regex(/^\d{10}$/, 'National code must be exactly 10 digits').optional(),
  address: z.string().trim().max(1000).optional(),
  postalCode: z.string().trim().max(20).optional(),
})

const statusSchema = z.enum(SALES_CUSTOMER_STATUSES)
const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/

function parseIsoDateRange(request: NextRequest) {
  const from = request.nextUrl.searchParams.get('from')?.trim()
  const to = request.nextUrl.searchParams.get('to')?.trim()

  if (!from && !to) return { ok: true as const, filter: undefined }
  if (!from || !to || !isoDatePattern.test(from) || !isoDatePattern.test(to)) {
    return { ok: false as const }
  }

  const fromDate = new Date(`${from}T00:00:00.000Z`)
  const toDate = new Date(`${to}T23:59:59.999Z`)

  if (
    Number.isNaN(fromDate.getTime()) ||
    Number.isNaN(toDate.getTime()) ||
    fromDate.getTime() > toDate.getTime()
  ) {
    return { ok: false as const }
  }

  return { ok: true as const, filter: { gte: fromDate, lte: toDate } }
}

// POST /api/v1/sales-customers - Create a sales customer lead without plan/payment side effects
export async function POST(request: NextRequest) {
  try {
    const { authenticated, payload, error } = await authenticateRequest(request)
    if (!authenticated || !payload) return errorResponse('UNAUTHORIZED', error!, 401)

    const hasManageAccess = canManageSalesCustomers(payload)
    if (!hasManageAccess && !isSalesPartner(payload)) {
      return errorResponse('FORBIDDEN', 'Sales customer access required', 403)
    }

    const body = await request.json()
    const parsed = createSalesCustomerSchema.safeParse(body)

    if (!parsed.success) {
      return errorResponse(
        'VALIDATION_ERROR',
        parsed.error.issues.map((issue) => issue.message).join(', '),
        400
      )
    }

    const data = parsed.data
    const salesPartnerId = hasManageAccess && data.salesPartnerId ? data.salesPartnerId : payload.sub

    const plan = await db.discountPlan.findUnique({
      where: { id: data.planId },
      select: { id: true, status: true },
    })

    if (!plan) {
      return errorResponse('NOT_FOUND', 'Plan not found', 404)
    }

    if (plan.status !== 'ACTIVE') {
      return errorResponse('BAD_REQUEST', 'Plan is not active', 400)
    }

    const salesPartner = await db.user.findUnique({
      where: { id: salesPartnerId },
      select: { id: true },
    })

    if (!salesPartner) {
      return errorResponse('NOT_FOUND', 'Sales partner not found', 404)
    }

    const ip = getClientIp(request)
    const device = request.headers.get('user-agent') || undefined
    const salesCustomer = await db.$transaction(async (tx) => {
      const createdSalesCustomer = await tx.salesCustomer.create({
        data: {
          salesPartnerId,
          planId: data.planId,
          firstName: data.firstName,
          lastName: data.lastName,
          mobile: data.mobile,
          nationalCode: data.nationalCode,
          address: data.address,
          postalCode: data.postalCode,
          status: 'PENDING_REVIEW',
        },
      })

      await tx.auditLog.create({
        data: {
          userId: payload.sub,
          action: AuditActions.SALES_CUSTOMER_CREATED,
          entity: 'SalesCustomer',
          entityId: createdSalesCustomer.id,
          details: JSON.stringify({
            salesCustomerId: createdSalesCustomer.id,
            salesPartnerId,
            planId: data.planId,
            nationalCode: maskNationalCode(data.nationalCode),
          }),
          ip,
          device,
        },
      })

      return createdSalesCustomer
    })

    return successResponse(toSafeSalesCustomerResponse(salesCustomer), 'Sales customer created successfully', 201)
  } catch (err) {
    if (err instanceof SyntaxError) {
      return errorResponse('VALIDATION_ERROR', 'Invalid request body', 400)
    }

    console.error('[POST /api/v1/sales-customers]', err)
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500)
  }
}

// GET /api/v1/sales-customers - List sales customers
export async function GET(request: NextRequest) {
  try {
    const { authenticated, payload, error } = await authenticateRequest(request)
    if (!authenticated || !payload) return errorResponse('UNAUTHORIZED', error!, 401)

    const hasListAllAccess = canViewSalesCustomers(payload)
    if (!hasListAllAccess && !isSalesPartner(payload)) {
      return errorResponse('FORBIDDEN', 'Sales customer access required', 403)
    }

    const take = parseBoundedInteger(request.nextUrl.searchParams.get('take'), 50, 100)
    const skip = parseBoundedInteger(request.nextUrl.searchParams.get('skip'), 0, 10000)
    const rawStatus = request.nextUrl.searchParams.get('status')

    if (take === null || skip === null) {
      return errorResponse('VALIDATION_ERROR', 'Invalid pagination parameters', 400)
    }

    const statusResult = rawStatus ? statusSchema.safeParse(rawStatus.trim()) : null
    if (statusResult && !statusResult.success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid status', 400)
    }

    const dateRange = parseIsoDateRange(request)
    if (!dateRange.ok) {
      return errorResponse('VALIDATION_ERROR', 'Invalid date range', 400)
    }

    const where: Prisma.SalesCustomerWhereInput = {
      ...(!hasListAllAccess && { salesPartnerId: payload.sub }),
      ...(statusResult?.success && { status: statusResult.data }),
      ...(dateRange.filter && statusResult?.success && statusResult.data === 'RETURNED'
        ? { returnedAt: dateRange.filter }
        : dateRange.filter
          ? { createdAt: dateRange.filter }
          : {}),
    }

    const salesCustomers = await db.salesCustomer.findMany({
      where,
      include: {
        plan: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    })

    return successResponse(salesCustomers.map(toSafeSalesCustomerResponse))
  } catch (err) {
    console.error('[GET /api/v1/sales-customers]', err)
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500)
  }
}
