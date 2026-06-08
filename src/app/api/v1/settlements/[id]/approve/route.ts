import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'
import { AuditActions } from '@/lib/audit'
import { canManageSettlements, isSafeId, toSafeSettlementResponse } from '@/lib/wallets'
import { getClientIp } from '@/app/api/v1/auth/_helpers'

// PATCH /api/v1/settlements/[id]/approve - Admin approves settlement request
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

    const existingSettlement = await db.settlement.findUnique({ where: { id } })

    if (!existingSettlement) {
      return errorResponse('NOT_FOUND', 'Settlement not found', 404)
    }

    if (existingSettlement.status !== 'PENDING') {
      return errorResponse('CONFLICT', 'فقط درخواست‌های تسویه در انتظار بررسی قابل تایید هستند.', 409)
    }

    const ip = getClientIp(request)
    const device = request.headers.get('user-agent') || undefined
    const settlement = await db.$transaction(async (tx) => {
      const updatedSettlement = await tx.settlement.update({
        where: { id },
        data: { status: 'APPROVED' },
      })

      await tx.auditLog.create({
        data: {
          userId: payload.sub,
          action: AuditActions.SETTLEMENT_APPROVED,
          entity: 'Settlement',
          entityId: id,
          details: JSON.stringify({
            settlementId: id,
            walletId: updatedSettlement.walletId,
            userId: updatedSettlement.userId,
            amount: updatedSettlement.amount,
            previousStatus: existingSettlement.status,
            newStatus: 'APPROVED',
          }),
          ip,
          device,
        },
      })

      return updatedSettlement
    })

    return successResponse(toSafeSettlementResponse(settlement), 'درخواست تسویه با موفقیت تایید شد.')
  } catch (err) {
    console.error('[PATCH /api/v1/settlements/[id]/approve]', err)
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500)
  }
}
