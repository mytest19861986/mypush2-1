import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth'
import { AuditActions } from '@/lib/audit'
import { successResponse, errorResponse } from '@/lib/api-response'
import { getClientIp } from '@/app/api/v1/auth/_helpers'
import {
  DuplicateWalletTransactionError,
  canManageCommissionPayments,
  creditWallet,
} from '@/lib/wallets'

const maxRefIdLength = 100
const maxDescriptionLength = 500

// POST /api/v1/commissions/[id]/pay - Pay approved commission
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authenticated, payload, error } = await authenticateRequest(request)
    if (!authenticated || !payload) return errorResponse('UNAUTHORIZED', error!, 401)

    if (!canManageCommissionPayments(payload)) {
      return errorResponse('FORBIDDEN', 'Commission payment permission required', 403)
    }

    const { id } = await params
    const rawBody = await request.text()
    let refId: string | undefined
    let description: string | undefined

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

      const refIdValue = (body as { refId?: unknown }).refId
      if (refIdValue !== undefined) {
        if (typeof refIdValue !== 'string') {
          return errorResponse('VALIDATION_ERROR', 'refId must be a string', 400)
        }

        refId = refIdValue.trim().slice(0, maxRefIdLength) || undefined
      }

      const descriptionValue = (body as { description?: unknown }).description
      if (descriptionValue !== undefined) {
        if (typeof descriptionValue !== 'string') {
          return errorResponse('VALIDATION_ERROR', 'description must be a string', 400)
        }

        description = descriptionValue.trim().slice(0, maxDescriptionLength) || undefined
      }
    }

    const ip = getClientIp(request)
    const device = request.headers.get('user-agent') || undefined

    const result = await db.$transaction(async (tx) => {
      const commission = await tx.commission.findUnique({
        where: { id },
        select: {
          id: true,
          status: true,
          amount: true,
          paidAt: true,
          agentId: true,
          userPlanId: true,
        },
      })

      if (!commission) {
        return { ok: false as const, error: errorResponse('NOT_FOUND', 'Commission not found', 404) }
      }

      if (commission.paidAt || commission.status === 'PAID') {
        return { ok: false as const, error: errorResponse('CONFLICT', 'Commission is already paid', 409) }
      }

      if (commission.status !== 'APPROVED') {
        return { ok: false as const, error: errorResponse('BAD_REQUEST', 'Only approved commissions can be paid') }
      }

      if (commission.amount <= 0) {
        return { ok: false as const, error: errorResponse('BAD_REQUEST', 'Commission amount must be greater than zero') }
      }

      const paidAt = new Date()
      const updateResult = await tx.commission.updateMany({
        where: {
          id,
          status: 'APPROVED',
          paidAt: null,
        },
        data: {
          status: 'PAID',
          paidAt,
        },
      })

      if (updateResult.count !== 1) {
        return { ok: false as const, error: errorResponse('BAD_REQUEST', 'Commission is already paid') }
      }

      const walletCredit = await creditWallet({
        tx,
        userId: commission.agentId,
        amount: commission.amount,
        type: 'CREDIT',
        referenceType: 'COMMISSION',
        referenceId: commission.id,
        description: description ?? 'Commission credited',
      })

      const paidCommission = await tx.commission.findUniqueOrThrow({ where: { id } })

      await tx.auditLog.create({
        data: {
          userId: payload.sub,
          action: AuditActions.COMMISSION_PAID,
          entity: 'Commission',
          entityId: id,
          details: JSON.stringify({
            agentId: commission.agentId,
            userPlanId: commission.userPlanId,
            amount: commission.amount,
            previousStatus: commission.status,
            newStatus: 'PAID',
            paidAt,
            walletId: walletCredit.wallet.id,
            walletTransactionId: walletCredit.transaction.id,
            refId,
            description,
          }),
          ip,
          device,
        },
      })

      await tx.auditLog.create({
        data: {
          userId: payload.sub,
          action: AuditActions.WALLET_CREDITED,
          entity: 'Wallet',
          entityId: walletCredit.wallet.id,
          details: JSON.stringify({
            walletId: walletCredit.wallet.id,
            walletTransactionId: walletCredit.transaction.id,
            userId: commission.agentId,
            amount: commission.amount,
            balanceAfter: walletCredit.wallet.balance,
            referenceType: 'COMMISSION',
            referenceId: commission.id,
          }),
          ip,
          device,
        },
      })

      return { ok: true as const, commission: paidCommission }
    })

    if (!result.ok) {
      return result.error
    }

    return successResponse(result.commission, 'Commission paid successfully')
  } catch (err) {
    if (err instanceof DuplicateWalletTransactionError) {
      return errorResponse('CONFLICT', 'Wallet transaction already exists for this commission', 409)
    }

    console.error('[POST /api/v1/commissions/[id]/pay]', err)
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500)
  }
}
