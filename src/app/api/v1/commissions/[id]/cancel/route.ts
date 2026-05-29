import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission } from '@/lib/auth'
import { createAuditLog, AuditActions } from '@/lib/audit'
import { successResponse, errorResponse } from '@/lib/api-response'
import { getClientIp } from '@/app/api/v1/auth/_helpers'

const maxReasonLength = 500

// PATCH /api/v1/commissions/[id]/cancel - Cancel pending or approved commission
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
    const rawBody = await request.text()
    let reason: string | undefined

    if (rawBody.trim()) {
      let body: unknown

      try {
        body = JSON.parse(rawBody)
      } catch {
        return errorResponse('VALIDATION_ERROR', 'Invalid JSON body', 400)
      }

      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return errorResponse('VALIDATION_ERROR', 'Invalid request body', 400)
      }

      const reasonValue = (body as { reason?: unknown }).reason
      if (reasonValue !== undefined) {
        if (typeof reasonValue !== 'string') {
          return errorResponse('VALIDATION_ERROR', 'Reason must be a string', 400)
        }

        reason = reasonValue.trim().slice(0, maxReasonLength) || undefined
      }
    }

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

    if (commission.status !== 'PENDING' && commission.status !== 'APPROVED') {
      return errorResponse('BAD_REQUEST', 'Only pending or approved commissions can be cancelled')
    }

    const updatedCommission = await db.commission.update({
      where: { id },
      data: { status: 'CANCELLED' },
    })

    createAuditLog({
      userId: payload!.sub,
      action: AuditActions.COMMISSION_CANCELLED,
      entity: 'Commission',
      entityId: id,
      details: {
        agentId: commission.agentId,
        userPlanId: commission.userPlanId,
        amount: commission.amount,
        previousStatus: commission.status,
        newStatus: 'CANCELLED',
        // Commission has no cancelReason field, so reason is audit-log only.
        reason,
      },
      ip: getClientIp(request),
      device: request.headers.get('user-agent') || undefined,
    })

    return successResponse(updatedCommission, 'Commission cancelled successfully')
  } catch (err) {
    console.error('[PATCH /api/v1/commissions/[id]/cancel]', err)
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500)
  }
}
