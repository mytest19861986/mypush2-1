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

const returnSchema = z.object({
  reason: z.string().trim().max(500).optional(),
})

// PATCH /api/v1/sales-customers/[id]/return - Admin marks customer returned
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

    let reason: string | undefined
    const text = await request.text()

    if (text.trim()) {
      const parsed = returnSchema.safeParse(JSON.parse(text))
      if (!parsed.success) {
        return errorResponse(
          'VALIDATION_ERROR',
          parsed.error.issues.map((issue) => issue.message).join(', '),
          400
        )
      }
      reason = parsed.data.reason
    }

    const existingSalesCustomer = await db.salesCustomer.findUnique({ where: { id } })

    if (!existingSalesCustomer) {
      return errorResponse('NOT_FOUND', 'Sales customer not found', 404)
    }

    if (existingSalesCustomer.status === 'CONFIRMED') {
      return errorResponse('CONFLICT', 'Confirmed sales customer cannot be returned', 409)
    }

    if (existingSalesCustomer.status === 'RETURNED') {
      return errorResponse('CONFLICT', 'Sales customer is already returned', 409)
    }

    const now = new Date()
    const ip = getClientIp(request)
    const device = request.headers.get('user-agent') || undefined
    const salesCustomer = await db.$transaction(async (tx) => {
      const updatedSalesCustomer = await tx.salesCustomer.update({
        where: { id },
        data: {
          status: 'RETURNED',
          returnedAt: now,
          returnReason: reason,
        },
      })

      await tx.auditLog.create({
        data: {
          userId: payload.sub,
          action: AuditActions.SALES_CUSTOMER_RETURNED,
          entity: 'SalesCustomer',
          entityId: updatedSalesCustomer.id,
          details: JSON.stringify({
            salesCustomerId: updatedSalesCustomer.id,
            salesPartnerId: updatedSalesCustomer.salesPartnerId,
            planId: updatedSalesCustomer.planId,
            previousStatus: existingSalesCustomer.status,
            newStatus: 'RETURNED',
            nationalCode: maskNationalCode(updatedSalesCustomer.nationalCode),
            reason,
          }),
          ip,
          device,
        },
      })

      return updatedSalesCustomer
    })

    return successResponse(toSafeSalesCustomerResponse(salesCustomer), 'Sales customer returned successfully')
  } catch (err) {
    if (err instanceof SyntaxError) {
      return errorResponse('VALIDATION_ERROR', 'Invalid request body', 400)
    }

    console.error('[PATCH /api/v1/sales-customers/[id]/return]', err)
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500)
  }
}
