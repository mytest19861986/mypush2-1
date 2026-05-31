import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { authenticateRequest, canManagePayments } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'
import { AuditActions } from '@/lib/audit'
import { getClientIp } from '@/app/api/v1/auth/_helpers'

const failedSchema = z.object({
  description: z.string().max(500).optional(),
  refId: z.string().max(100).optional(),
  trackingCode: z.string().max(100).optional(),
})

// POST /api/v1/payments/[id]/failed - Manual/dev payment failure callback
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authenticated, payload, error } = await authenticateRequest(request)
    if (!authenticated || !payload) return errorResponse('UNAUTHORIZED', error!, 401)

    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const parsed = failedSchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse(
        'VALIDATION_ERROR',
        parsed.error.issues.map((issue) => issue.message).join(', '),
        400
      )
    }

    const payment = await db.payment.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        status: true,
        metadata: true,
      },
    })

    if (!payment) {
      return errorResponse('NOT_FOUND', 'Payment not found', 404)
    }
    if (payment.status !== 'PENDING') {
      return errorResponse('INVALID_PAYMENT_STATUS', 'Payment is not pending', 400)
    }
    if (!payment.userId) {
      return errorResponse('INVALID_PAYMENT', 'Payment is not linked to a user', 400)
    }

    // Only payment managers can mark payments as failed.
    // In a real gateway flow, failure must come from gateway callback, not user action.
    if (!canManagePayments(payload)) {
      return errorResponse('FORBIDDEN', 'Only payment managers can mark a payment as failed', 403)
    }

    const ip = getClientIp(request)
    const device = request.headers.get('user-agent') || undefined
    const failureMetadata =
      parsed.data.description || parsed.data.refId || parsed.data.trackingCode
        ? JSON.stringify({
            description: parsed.data.description,
            refId: parsed.data.refId,
            trackingCode: parsed.data.trackingCode,
          })
        : null

    const result = await db.$transaction(async (tx) => {
      const updated = await tx.payment.updateMany({
        where: {
          id: payment.id,
          status: 'PENDING',
        },
        data: {
          status: 'FAILED',
          failedAt: new Date(),
          refId: parsed.data.refId,
          trackingCode: parsed.data.trackingCode,
          metadata: failureMetadata,
        },
      })

      if (updated.count !== 1) throw new Error('PAYMENT_NOT_PENDING')

      await tx.auditLog.create({
        data: {
          userId: payload.sub,
          action: AuditActions.PAYMENT_FAILED,
          entity: 'Payment',
          entityId: payment.id,
          details: JSON.stringify({
            userId: payment.userId,
            description: parsed.data.description,
          }),
          ip,
          device,
        },
      })

      return {
        paymentId: payment.id,
        status: 'FAILED',
      }
    })

    return successResponse(result, 'Payment marked as failed')
  } catch (err) {
    const message = (err as Error).message
    if (message === 'PAYMENT_NOT_PENDING') {
      return errorResponse('INVALID_PAYMENT_STATUS', 'Payment is not pending', 400)
    }

    console.error('[POST /api/v1/payments/[id]/failed]', err)
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500)
  }
}
