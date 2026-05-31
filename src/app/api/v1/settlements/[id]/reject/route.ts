import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'
import { AuditActions } from '@/lib/audit'
import { canManageSettlements, isSafeId, toSafeSettlementResponse } from '@/lib/wallets'
import { getClientIp } from '@/app/api/v1/auth/_helpers'

const rejectSettlementSchema = z.object({
  reason: z.string().trim().max(500).optional(),
})

// PATCH /api/v1/settlements/[id]/reject - Admin rejects pending settlement request
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

    let reason: string | undefined
    const text = await request.text()
    if (text.trim()) {
      const parsed = rejectSettlementSchema.safeParse(JSON.parse(text))
      if (!parsed.success) {
        return errorResponse(
          'VALIDATION_ERROR',
          parsed.error.issues.map((issue) => issue.message).join(', '),
          400
        )
      }
      reason = parsed.data.reason
    }

    const existingSettlement = await db.settlement.findUnique({ where: { id } })

    if (!existingSettlement) {
      return errorResponse('NOT_FOUND', 'Settlement not found', 404)
    }

    if (existingSettlement.status !== 'PENDING') {
      return errorResponse('CONFLICT', 'Only pending settlements can be rejected', 409)
    }

    const ip = getClientIp(request)
    const device = request.headers.get('user-agent') || undefined
    const settlement = await db.$transaction(async (tx) => {
      const updatedSettlement = await tx.settlement.update({
        where: { id },
        data: { status: 'REJECTED' },
      })

      await tx.auditLog.create({
        data: {
          userId: payload.sub,
          action: AuditActions.SETTLEMENT_REJECTED,
          entity: 'Settlement',
          entityId: id,
          details: JSON.stringify({
            settlementId: id,
            walletId: updatedSettlement.walletId,
            userId: updatedSettlement.userId,
            amount: updatedSettlement.amount,
            previousStatus: existingSettlement.status,
            newStatus: 'REJECTED',
            reason,
          }),
          ip,
          device,
        },
      })

      return updatedSettlement
    })

    return successResponse(toSafeSettlementResponse(settlement), 'Settlement rejected successfully')
  } catch (err) {
    if (err instanceof SyntaxError) {
      return errorResponse('VALIDATION_ERROR', 'Invalid request body', 400)
    }

    console.error('[PATCH /api/v1/settlements/[id]/reject]', err)
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500)
  }
}
