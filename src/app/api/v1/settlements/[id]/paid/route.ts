import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'
import { AuditActions } from '@/lib/audit'
import {
  canManageSettlements,
  isSafeId,
  toSafeSettlementResponse,
} from '@/lib/wallets'
import { getCommissionAvailability } from '@/lib/commission-settlements'
import { getClientIp } from '@/app/api/v1/auth/_helpers'

const paidSettlementSchema = z.object({
  trackingCode: z.string().trim().max(100).optional(),
  receiptUrl: z.string().trim().max(500).optional(),
  description: z.string().trim().max(500).optional(),
})

// PATCH /api/v1/settlements/[id]/paid - Admin records external bank transfer as paid
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authenticated, payload, error } = await authenticateRequest(request)
    if (!authenticated || !payload) return errorResponse('UNAUTHORIZED', error!, 401)

    if (!canManageSettlements(payload)) {
      return errorResponse('FORBIDDEN', 'Settlement management permission required', 403)
    }

    const { id } = await params
    if (!isSafeId(id)) {
      return errorResponse('VALIDATION_ERROR', 'Invalid settlement id', 400)
    }

    const text = await request.text()
    const parsed = paidSettlementSchema.safeParse(text.trim() ? JSON.parse(text) : {})

    if (!parsed.success) {
      return errorResponse(
        'VALIDATION_ERROR',
        parsed.error.issues.map((issue) => issue.message).join(', '),
        400
      )
    }

    const existingSettlement = await db.settlement.findUnique({ where: { id } })

    if (!existingSettlement) {
      return errorResponse('NOT_FOUND', 'Settlement not found', 404)
    }

    if (existingSettlement.status === 'PAID') {
      return errorResponse('CONFLICT', 'این درخواست تسویه قبلا پرداخت شده است.', 409)
    }

    if (existingSettlement.status !== 'APPROVED') {
      return errorResponse('CONFLICT', 'فقط درخواست تسویه تاییدشده قابل ثبت پرداخت است.', 409)
    }

    const ip = getClientIp(request)
    const device = request.headers.get('user-agent') || undefined
    const now = new Date()
    const settlement = await db.$transaction(async (tx) => {
      const currentSettlement = await tx.settlement.findUniqueOrThrow({
        where: { id },
      })

      if (currentSettlement.status !== 'APPROVED') {
        throw new Error('SETTLEMENT_NOT_APPROVED')
      }

      const availability = await getCommissionAvailability(currentSettlement.userId, tx)
      if (availability.approvedCommissionAmount < availability.deductedSettlementAmount) {
        throw new Error('SETTLEMENT_COMMISSION_COVERAGE_INVALID')
      }

      const updatedSettlement = await tx.settlement.update({
        where: { id },
        data: {
          status: 'PAID',
          settledAt: now,
          trackingCode: parsed.data.trackingCode,
          receiptUrl: parsed.data.receiptUrl,
        },
      })

      await tx.auditLog.create({
        data: {
          userId: payload.sub,
          action: AuditActions.SETTLEMENT_PAID,
          entity: 'Settlement',
          entityId: id,
          details: JSON.stringify({
            settlementId: id,
            walletId: currentSettlement.walletId,
            userId: currentSettlement.userId,
            amount: currentSettlement.amount,
            previousStatus: currentSettlement.status,
            newStatus: 'PAID',
            trackingCode: parsed.data.trackingCode,
            receiptUrl: parsed.data.receiptUrl,
            description: parsed.data.description,
            approvedCommissionAmount: availability.approvedCommissionAmount,
            deductedSettlementAmount: availability.deductedSettlementAmount,
          }),
          ip,
          device,
        },
      })

      return updatedSettlement
    })

    return successResponse(toSafeSettlementResponse(settlement), 'پرداخت تسویه با موفقیت ثبت شد.')
  } catch (err) {
    if (err instanceof SyntaxError) {
      return errorResponse('VALIDATION_ERROR', 'Invalid request body', 400)
    }

    if ((err as Error).message === 'SETTLEMENT_NOT_APPROVED') {
      return errorResponse('CONFLICT', 'فقط درخواست تسویه تاییدشده قابل ثبت پرداخت است.', 409)
    }

    if ((err as Error).message === 'SETTLEMENT_COMMISSION_COVERAGE_INVALID') {
      return errorResponse(
        'CONFLICT',
        'مبلغ تسویه با پورسانت تاییدشده قابل برداشت همخوانی ندارد.',
        409
      )
    }

    console.error('[PATCH /api/v1/settlements/[id]/paid]', err)
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500)
  }
}
