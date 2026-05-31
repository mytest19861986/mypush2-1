import { NextRequest } from 'next/server'
import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'
import { canViewWallets, isSafeId, parseBoundedInteger, toSafeWalletResponse } from '@/lib/wallets'

// GET /api/v1/wallets - Admin wallet list
export async function GET(request: NextRequest) {
  try {
    const { authenticated, payload, error } = await authenticateRequest(request)
    if (!authenticated || !payload) return errorResponse('UNAUTHORIZED', error!, 401)

    if (!canViewWallets(payload)) {
      return errorResponse('FORBIDDEN', 'Wallet view permission required', 403)
    }

    const take = parseBoundedInteger(request.nextUrl.searchParams.get('take'), 50, 100)
    const skip = parseBoundedInteger(request.nextUrl.searchParams.get('skip'), 0, 10000)
    const rawUserId = request.nextUrl.searchParams.get('userId')
    const userId = rawUserId === null ? undefined : rawUserId.trim()

    if (take === null || skip === null) {
      return errorResponse('VALIDATION_ERROR', 'Invalid pagination parameters', 400)
    }

    if (rawUserId !== null && (!userId || !isSafeId(userId))) {
      return errorResponse('VALIDATION_ERROR', 'Invalid userId', 400)
    }

    const where: Prisma.WalletWhereInput = {
      ...(userId && { userId }),
    }

    const wallets = await db.wallet.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take,
      skip,
    })

    return successResponse(wallets.map(toSafeWalletResponse))
  } catch (err) {
    console.error('[GET /api/v1/wallets]', err)
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500)
  }
}
