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
  parseBoundedInteger,
  toSafeSettlementResponse,
} from '@/lib/wallets'
import { getClientIp } from '@/app/api/v1/auth/_helpers'

const requestSettlementSchema = z.object({
  amount: z.number().int().positive(),
  description: z.string().trim().max(500).optional(),
})

const statusSchema = z.enum(['PENDING', 'APPROVED', 'PAID', 'REJECTED', 'CANCELLED'])

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
    const wallet = await getOrCreateWallet(payload.sub)

    if (wallet.balance < amount) {
      return errorResponse('BAD_REQUEST', 'Insufficient wallet balance', 400)
    }

    const ip = getClientIp(request)
    const device = request.headers.get('user-agent') || undefined
    const settlement = await db.$transaction(async (tx) => {
      const currentWallet = await tx.wallet.findUniqueOrThrow({
        where: { id: wallet.id },
        select: { id: true, userId: true, balance: true },
      })

      if (currentWallet.balance < amount) {
        throw new Error('INSUFFICIENT_WALLET_BALANCE')
      }

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
          }),
          ip,
          device,
        },
      })

      return createdSettlement
    })

    return successResponse(toSafeSettlementResponse(settlement), 'Settlement requested successfully', 201)
  } catch (err) {
    if (err instanceof SyntaxError) {
      return errorResponse('VALIDATION_ERROR', 'Invalid request body', 400)
    }

    if ((err as Error).message === 'INSUFFICIENT_WALLET_BALANCE') {
      return errorResponse('BAD_REQUEST', 'Insufficient wallet balance', 400)
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

    if (take === null || skip === null) {
      return errorResponse('VALIDATION_ERROR', 'Invalid pagination parameters', 400)
    }

    const statusResult = rawStatus ? statusSchema.safeParse(rawStatus.trim()) : null
    if (statusResult && !statusResult.success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid status', 400)
    }

    const where: Prisma.SettlementWhereInput = {
      ...(statusResult?.success && { status: statusResult.data }),
    }

    const settlements = await db.settlement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    })

    return successResponse(settlements.map(toSafeSettlementResponse))
  } catch (err) {
    console.error('[GET /api/v1/settlements]', err)
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500)
  }
}
