import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'
import { AuditActions } from '@/lib/audit'
import {
  DuplicateWalletTransactionError,
  InsufficientWalletBalanceError,
  canManageSettlements,
  debitWallet,
  isSafeId,
  toSafeSettlementResponse,
} from '@/lib/wallets'
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
      return errorResponse('CONFLICT', 'Settlement is already paid', 409)
    }

    if (existingSettlement.status !== 'APPROVED') {
      return errorResponse('CONFLICT', 'Only approved settlements can be paid', 409)
    }

    const ip = getClientIp(request)
    const device = request.headers.get('user-agent') || undefined
    const now = new Date()
    const settlement = await db.$transaction(async (tx) => {
      const currentSettlement = await tx.settlement.findUniqueOrThrow({
        where: { id },
      })

      if (currentSettlement.status === 'PAID') {
        throw new DuplicateWalletTransactionError()
      }

      if (currentSettlement.status !== 'APPROVED') {
        throw new Error('SETTLEMENT_NOT_APPROVED')
      }

      const debit = await debitWallet({
        tx,
        userId: currentSettlement.userId,
        amount: currentSettlement.amount,
        type: 'DEBIT',
        referenceType: 'SETTLEMENT',
        referenceId: currentSettlement.id,
        description: parsed.data.description ?? 'Settlement paid',
      })

      const updatedSettlement = await tx.settlement.update({
        where: { id },
        data: {
          status: 'PAID',
          settledAt: now,
          trackingCode: parsed.data.trackingCode,
          receiptUrl: parsed.data.receiptUrl,
        },
      })

      await tx.auditLog.createMany({
        data: [
          {
            userId: payload.sub,
            action: AuditActions.SETTLEMENT_PAID,
            entity: 'Settlement',
            entityId: id,
            details: JSON.stringify({
              settlementId: id,
              walletId: debit.wallet.id,
              walletTransactionId: debit.transaction.id,
              userId: currentSettlement.userId,
              amount: currentSettlement.amount,
              previousStatus: currentSettlement.status,
              newStatus: 'PAID',
              trackingCode: parsed.data.trackingCode,
              receiptUrl: parsed.data.receiptUrl,
              description: parsed.data.description,
            }),
            ip,
            device,
          },
          {
            userId: payload.sub,
            action: AuditActions.WALLET_DEBITED,
            entity: 'Wallet',
            entityId: debit.wallet.id,
            details: JSON.stringify({
              walletId: debit.wallet.id,
              walletTransactionId: debit.transaction.id,
              userId: currentSettlement.userId,
              amount: currentSettlement.amount,
              balanceAfter: debit.wallet.balance,
              referenceType: 'SETTLEMENT',
              referenceId: currentSettlement.id,
            }),
            ip,
            device,
          },
        ],
      })

      return updatedSettlement
    })

    return successResponse(toSafeSettlementResponse(settlement), 'Settlement marked as paid successfully')
  } catch (err) {
    if (err instanceof SyntaxError) {
      return errorResponse('VALIDATION_ERROR', 'Invalid request body', 400)
    }

    if (err instanceof InsufficientWalletBalanceError) {
      return errorResponse('BAD_REQUEST', 'Insufficient wallet balance', 400)
    }

    if (err instanceof DuplicateWalletTransactionError) {
      return errorResponse('CONFLICT', 'Settlement payment has already been recorded', 409)
    }

    if ((err as Error).message === 'SETTLEMENT_NOT_APPROVED') {
      return errorResponse('CONFLICT', 'Only approved settlements can be paid', 409)
    }

    console.error('[PATCH /api/v1/settlements/[id]/paid]', err)
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500)
  }
}
