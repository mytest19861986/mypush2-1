import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission } from '@/lib/auth'
import { createAuditLog, AuditActions } from '@/lib/audit'
import { successResponse, errorResponse } from '@/lib/api-response'
import { getClientIp } from '@/app/api/v1/auth/_helpers'

// PATCH /api/v1/commissions/[id]/approve - Approve pending commission
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, payload, error } = await requirePermission(request, 'manage_commissions')
    if (!authorized) {
      return errorResponse('FORBIDDEN', error!, payload ? 403 : 401)
    }

    const { id } = await params

    const commission = await db.commission.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        amount: true,
        agentId: true,
        userPlanId: true,
      },
    })

    if (!commission) {
      return errorResponse('NOT_FOUND', 'Commission not found', 404)
    }

    if (commission.status !== 'PENDING') {
      return errorResponse('BAD_REQUEST', 'Only pending commissions can be approved')
    }

    if (commission.amount <= 0) {
      return errorResponse('BAD_REQUEST', 'Commission amount must be greater than zero')
    }

    const updatedCommission = await db.commission.update({
      where: { id },
      data: { status: 'APPROVED' },
    })

    createAuditLog({
      userId: payload!.sub,
      action: AuditActions.COMMISSION_APPROVED,
      entity: 'Commission',
      entityId: id,
      details: {
        agentId: commission.agentId,
        userPlanId: commission.userPlanId,
        amount: commission.amount,
        previousStatus: commission.status,
        newStatus: 'APPROVED',
      },
      ip: getClientIp(request),
      device: request.headers.get('user-agent') || undefined,
    })

    return successResponse(updatedCommission, 'Commission approved successfully')
  } catch (err) {
    console.error('[PATCH /api/v1/commissions/[id]/approve]', err)
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500)
  }
}
