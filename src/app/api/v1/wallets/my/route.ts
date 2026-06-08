import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'
import { getOrCreateWallet, parseBoundedInteger, toSafeWalletResponse } from '@/lib/wallets'
import { getWalletCommissionSummary } from '@/lib/commission-settlements'

// GET /api/v1/wallets/my - Current user's wallet and recent transactions
export async function GET(request: NextRequest) {
  try {
    const { authenticated, payload, error } = await authenticateRequest(request)
    if (!authenticated || !payload) return errorResponse('UNAUTHORIZED', error!, 401)

    const take = parseBoundedInteger(request.nextUrl.searchParams.get('take'), 50, 100)
    const skip = parseBoundedInteger(request.nextUrl.searchParams.get('skip'), 0, 10000)

    if (take === null || skip === null) {
      return errorResponse('VALIDATION_ERROR', 'Invalid pagination parameters', 400)
    }

    const wallet = await getOrCreateWallet(payload.sub)
    const walletWithTransactions = await db.wallet.findUniqueOrThrow({
      where: { id: wallet.id },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take,
          skip,
        },
      },
    })

    const commissionSummary = await getWalletCommissionSummary(payload.sub)

    return successResponse({
      ...toSafeWalletResponse(walletWithTransactions),
      commissionSummary,
    })
  } catch (err) {
    console.error('[GET /api/v1/wallets/my]', err)
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500)
  }
}
