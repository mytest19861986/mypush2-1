import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'
import { canViewWallets, isSafeId, parseBoundedInteger, toSafeWalletResponse } from '@/lib/wallets'

// GET /api/v1/wallets/[id] - Owner or admin wallet detail
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authenticated, payload, error } = await authenticateRequest(request)
    if (!authenticated || !payload) return errorResponse('UNAUTHORIZED', error!, 401)

    const { id } = await params
    if (!isSafeId(id)) {
      return errorResponse('VALIDATION_ERROR', 'Invalid wallet id', 400)
    }

    const take = parseBoundedInteger(request.nextUrl.searchParams.get('take'), 50, 100)
    const skip = parseBoundedInteger(request.nextUrl.searchParams.get('skip'), 0, 10000)

    if (take === null || skip === null) {
      return errorResponse('VALIDATION_ERROR', 'Invalid pagination parameters', 400)
    }

    const walletMeta = await db.wallet.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
      },
    })

    if (!walletMeta) {
      return errorResponse('NOT_FOUND', 'Wallet not found', 404)
    }

    if (walletMeta.userId !== payload.sub && !canViewWallets(payload)) {
      return errorResponse('FORBIDDEN', 'Wallet access denied', 403)
    }

    const wallet = await db.wallet.findUniqueOrThrow({
      where: { id: walletMeta.id },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take,
          skip,
        },
      },
    })

    return successResponse(toSafeWalletResponse(wallet))
  } catch (err) {
    console.error('[GET /api/v1/wallets/[id]', err)
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500)
  }
}
