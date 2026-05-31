import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'
import { AuditActions } from '@/lib/audit'
import {
  canManageSalesCustomers,
  isSafeId,
  maskNationalCode,
  toSafeSalesCustomerResponse,
} from '@/lib/sales-customers'
import { getClientIp } from '@/app/api/v1/auth/_helpers'

const markPaidSchema = z.object({
  paymentRef: z.string().trim().max(100).optional(),
  paymentDescription: z.string().trim().max(500).optional(),
})

// PATCH /api/v1/sales-customers/[id]/mark-paid - Admin marks manual payment
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authenticated, payload, error } = await authenticateRequest(request)
    if (!authenticated || !payload) return errorResponse('UNAUTHORIZED', error!, 401)

    if (!canManageSalesCustomers(payload)) {
      return errorResponse('FORBIDDEN', 'Sales customer management permission required', 403)
    }

    const { id } = await params
    if (!isSafeId(id)) {
      return errorResponse('VALIDATION_ERROR', 'Invalid sales customer id', 400)
    }

    const body = await request.json()
    const parsed = markPaidSchema.safeParse(body)

    if (!parsed.success) {
      return errorResponse(
        'VALIDATION_ERROR',
        parsed.error.issues.map((issue) => issue.message).join(', '),
        400
      )
    }

    const existingSalesCustomer = await db.salesCustomer.findUnique({ where: { id } })

    if (!existingSalesCustomer) {
      return errorResponse('NOT_FOUND', 'Sales customer not found', 404)
    }

    if (existingSalesCustomer.status === 'RETURNED') {
      return errorResponse('CONFLICT', 'Returned sales customer cannot be marked paid', 409)
    }

    if (existingSalesCustomer.status === 'CONFIRMED') {
      return errorResponse('CONFLICT', 'Confirmed sales customer cannot be marked paid', 409)
    }

    if (existingSalesCustomer.status === 'PAID') {
      return errorResponse('CONFLICT', 'Sales customer is already paid', 409)
    }

    const now = new Date()
    const ip = getClientIp(request)
    const device = request.headers.get('user-agent') || undefined
    const salesCustomer = await db.$transaction(async (tx) => {
      const updatedSalesCustomer = await tx.salesCustomer.update({
        where: { id },
        data: {
          status: 'PAID',
          paidAt: now,
          paymentRef: parsed.data.paymentRef,
          paymentDescription: parsed.data.paymentDescription,
        },
      })

      await tx.auditLog.create({
        data: {
          userId: payload.sub,
          action: AuditActions.SALES_CUSTOMER_PAID,
          entity: 'SalesCustomer',
          entityId: updatedSalesCustomer.id,
          details: JSON.stringify({
            salesCustomerId: updatedSalesCustomer.id,
            salesPartnerId: updatedSalesCustomer.salesPartnerId,
            planId: updatedSalesCustomer.planId,
            previousStatus: existingSalesCustomer.status,
            newStatus: 'PAID',
            nationalCode: maskNationalCode(updatedSalesCustomer.nationalCode),
          }),
          ip,
          device,
        },
      })

      return updatedSalesCustomer
    })

    return successResponse(toSafeSalesCustomerResponse(salesCustomer), 'Sales customer marked as paid')
  } catch (err) {
    if (err instanceof SyntaxError) {
      return errorResponse('VALIDATION_ERROR', 'Invalid request body', 400)
    }

    console.error('[PATCH /api/v1/sales-customers/[id]/mark-paid]', err)
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500)
  }
}
