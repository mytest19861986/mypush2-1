import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentCommissionPaymentAccess } from '@/lib/commission-payment-access'
import { canPayCommissions } from '@/lib/commission-permissions'
import { errorResponse, successResponse } from '@/lib/api-response'

// A payment-only role receives a bounded queue, never the general admin list.
export async function GET(request: NextRequest) {
  try {
    const { payload, error } = await getCurrentCommissionPaymentAccess(request)
    if (!payload) return errorResponse('UNAUTHORIZED', error!, 401)
    if (!canPayCommissions(payload)) return errorResponse('FORBIDDEN', 'Commission payment permission required', 403)

    const rawPage = request.nextUrl.searchParams.get('page') ?? '1'
    if (!/^[1-9]\d{0,5}$/.test(rawPage)) return errorResponse('VALIDATION_ERROR', 'Invalid page', 400)
    const page = Number(rawPage)
    const limit = 20
    const where = { status: 'APPROVED', paidAt: null, amount: { gt: 0 } }
    const [items, total] = await db.$transaction([
      db.commission.findMany({ where, skip: (page - 1) * limit, take: limit,
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        select: { id: true, agentId: true, amount: true, createdAt: true },
      }),
      db.commission.count({ where }),
    ])
    return successResponse({ items, total, page, limit })
  } catch {
    return errorResponse('INTERNAL_ERROR', 'Unable to load commission payment queue', 500)
  }
}
