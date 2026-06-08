import { NextRequest } from 'next/server'
import type { Prisma } from '@prisma/client'
import { z } from 'zod'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'
import { AuditActions } from '@/lib/audit'
import {
  canViewSettlements,
  getOrCreateWallet,
  isSafeId,
  parseBoundedInteger,
  toSafeSettlementResponse,
} from '@/lib/wallets'
import { formatTomanAmount, getMinimumSettlementAmount } from '@/lib/app-settings'
import { getCommissionAvailability, OPEN_SETTLEMENT_STATUSES } from '@/lib/commission-settlements'
import { getClientIp } from '@/app/api/v1/auth/_helpers'

const requestSettlementSchema = z.object({
  amount: z.number().int().positive(),
  description: z.string().trim().max(500).optional(),
})

const statusSchema = z.enum(['PENDING', 'APPROVED', 'PAID', 'REJECTED', 'CANCELLED'])

class MinimumSettlementAmountError extends Error {
  minimumSettlementAmount: number

  constructor(minimumSettlementAmount: number) {
    super('MINIMUM_SETTLEMENT_AMOUNT_NOT_MET')
    this.minimumSettlementAmount = minimumSettlementAmount
  }
}

// POST /api/v1/settlements - Current user requests manual settlement
export async function POST(request: NextRequest) {
  try {
    const { authenticated, payload, error } = await authenticateRequest(request)
    if (!authenticated || !payload) return errorResponse('UNAUTHORIZED', error!, 401)

    const body = await request.json()
    const parsed = requestSettlementSchema.safeParse(body)

    if (!parsed.success) {
      return errorResponse(
        'VALIDATION_ERROR',
        parsed.error.issues.map((issue) => issue.message).join(', '),
        400
      )
    }

    const { amount, description } = parsed.data

    const ip = getClientIp(request)
    const device = request.headers.get('user-agent') || undefined
    const settlement = await db.$transaction(async (tx) => {
      const existingOpenSettlement = await tx.settlement.findFirst({
        where: {
          userId: payload.sub,
          status: { in: [...OPEN_SETTLEMENT_STATUSES] },
        },
        select: { id: true, status: true },
      })

      if (existingOpenSettlement) {
        throw new Error('OPEN_SETTLEMENT_EXISTS')
      }

      const availability = await getCommissionAvailability(payload.sub, tx)
      if (availability.availableBalance <= 0) {
        throw new Error('NO_WITHDRAWABLE_COMMISSION')
      }

      if (amount > availability.availableBalance) {
        throw new Error('AMOUNT_EXCEEDS_AVAILABLE_COMMISSION')
      }

      const minimumSettlementAmount = await getMinimumSettlementAmount(tx)
      if (amount < minimumSettlementAmount) {
        throw new MinimumSettlementAmountError(minimumSettlementAmount)
      }

      const currentWallet = await getOrCreateWallet(payload.sub, tx)
      const createdSettlement = await tx.settlement.create({
        data: {
          walletId: currentWallet.id,
          userId: payload.sub,
          amount,
          status: 'PENDING',
        },
      })

      await tx.auditLog.create({
        data: {
          userId: payload.sub,
          action: AuditActions.SETTLEMENT_REQUESTED,
          entity: 'Settlement',
          entityId: createdSettlement.id,
          details: JSON.stringify({
            settlementId: createdSettlement.id,
            walletId: currentWallet.id,
            amount,
            description,
            availableBeforeRequest: availability.availableBalance,
            approvedCommissionAmount: availability.approvedCommissionAmount,
            deductedSettlementAmount: availability.deductedSettlementAmount,
          }),
          ip,
          device,
        },
      })

      return createdSettlement
    })

    return successResponse(toSafeSettlementResponse(settlement), 'درخواست تسویه با موفقیت ثبت شد.', 201)
  } catch (err) {
    if (err instanceof SyntaxError) {
      return errorResponse('VALIDATION_ERROR', 'Invalid request body', 400)
    }

    if ((err as Error).message === 'OPEN_SETTLEMENT_EXISTS') {
      return errorResponse(
        'CONFLICT',
        'یک درخواست تسویه باز برای شما وجود دارد. پس از تعیین تکلیف آن می‌توانید درخواست جدید ثبت کنید.',
        409
      )
    }

    if ((err as Error).message === 'NO_WITHDRAWABLE_COMMISSION') {
      return errorResponse('BAD_REQUEST', 'موجودی قابل برداشت از پورسانت تاییدشده وجود ندارد.', 400)
    }

    if ((err as Error).message === 'AMOUNT_EXCEEDS_AVAILABLE_COMMISSION') {
      return errorResponse('BAD_REQUEST', 'مبلغ درخواستی بیشتر از موجودی قابل برداشت است.', 400)
    }

    if (err instanceof MinimumSettlementAmountError) {
      return errorResponse(
        'BAD_REQUEST',
        `حداقل مبلغ قابل درخواست تسویه ${formatTomanAmount(err.minimumSettlementAmount)} است.`,
        400
      )
    }

    console.error('[POST /api/v1/settlements]', err)
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500)
  }
}

// GET /api/v1/settlements - Admin settlement list
export async function GET(request: NextRequest) {
  try {
    const { authenticated, payload, error } = await authenticateRequest(request)
    if (!authenticated || !payload) return errorResponse('UNAUTHORIZED', error!, 401)

    if (!canViewSettlements(payload)) {
      return errorResponse('FORBIDDEN', 'Settlement view permission required', 403)
    }

    const take = parseBoundedInteger(request.nextUrl.searchParams.get('take'), 50, 100)
    const skip = parseBoundedInteger(request.nextUrl.searchParams.get('skip'), 0, 10000)
    const rawStatus = request.nextUrl.searchParams.get('status')
    const rawUserId = request.nextUrl.searchParams.get('userId')
    const userId = rawUserId === null ? undefined : rawUserId.trim()

    if (take === null || skip === null) {
      return errorResponse('VALIDATION_ERROR', 'Invalid pagination parameters', 400)
    }

    const statusResult = rawStatus ? statusSchema.safeParse(rawStatus.trim()) : null
    if (statusResult && !statusResult.success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid status', 400)
    }

    if (rawUserId !== null && (!userId || !isSafeId(userId))) {
      return errorResponse('VALIDATION_ERROR', 'Invalid userId', 400)
    }

    const where: Prisma.SettlementWhereInput = {
      ...(statusResult?.success && { status: statusResult.data }),
      ...(userId && { userId }),
    }

    const settlements = await db.settlement.findMany({
      where,
      include: {
        user: {
          select: {
            profile: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
            agent: {
              select: {
                businessName: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    })

    return successResponse(
      settlements.map((settlement) => ({
        ...toSafeSettlementResponse(settlement),
        user: settlement.user,
      }))
    )
  } catch (err) {
    console.error('[GET /api/v1/settlements]', err)
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500)
  }
}
