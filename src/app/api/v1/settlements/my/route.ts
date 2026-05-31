import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'
import { parseBoundedInteger, toSafeSettlementResponse } from '@/lib/wallets'

// GET /api/v1/settlements/my - Current user's settlements
export async function GET(request: NextRequest) {
  try {
    const { authenticated, payload, error } = await authenticateRequest(request)
    if (!authenticated || !payload) return errorResponse('UNAUTHORIZED', error!, 401)

    const take = parseBoundedInteger(request.nextUrl.searchParams.get('take'), 50, 100)
    const skip = parseBoundedInteger(request.nextUrl.searchParams.get('skip'), 0, 10000)

    if (take === null || skip === null) {
      return errorResponse('VALIDATION_ERROR', 'Invalid pagination parameters', 400)
    }

    const settlements = await db.settlement.findMany({
      where: { userId: payload.sub },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    })

    return successResponse(settlements.map(toSafeSettlementResponse))
  } catch (err) {
    console.error('[GET /api/v1/settlements/my]', err)
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500)
  }
}
