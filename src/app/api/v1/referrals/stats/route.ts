import { NextRequest } from 'next/server'
import { authenticateRequest } from '@/lib/auth'
import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-response'
import { REFERRAL_MEMBER_LABEL, type ReferralStats } from '@/lib/referral-stats-contract'

function privateResponse(response: Response) {
  response.headers.set('Cache-Control', 'private, no-store')
  return response
}

// Self-only, authoritative relationships only. No member identity or financial data.
export async function GET(request: NextRequest) {
  try {
    const { authenticated, payload } = await authenticateRequest(request)
    if (!authenticated || !payload) {
      return privateResponse(errorResponse('UNAUTHORIZED', 'احراز هویت لازم است.', 401))
    }
    if (request.nextUrl.searchParams.getAll('userId').some(id => id !== payload.sub)
      || request.body !== null
      || (request.headers.has('content-length') && request.headers.get('content-length') !== '0')
      || request.headers.has('transfer-encoding')) {
      return privateResponse(errorResponse('FORBIDDEN', 'دسترسی به این آمار مجاز نیست.', 403))
    }
    if ([...request.nextUrl.searchParams.keys()].some(key => key !== 'userId')) {
      return privateResponse(errorResponse('VALIDATION_ERROR', 'پارامتر درخواست نامعتبر است.', 400))
    }
    const totalReferrals = await db.userReferral.count({
      where: {
        referrerId: payload.sub,
        referrer: { is: { id: payload.sub } },
        // Registration forbids self-referral; both foreign relationships must exist.
        referredUser: { is: { id: { not: payload.sub } } },
      },
    })
    const data: ReferralStats = {
      totalReferrals,
      referrals: Array.from({ length: totalReferrals }, () => ({ label: REFERRAL_MEMBER_LABEL })),
    }
    return privateResponse(successResponse(data))
  } catch {
    console.error('[GET /api/v1/referrals/stats] unavailable')
    return privateResponse(errorResponse('REFERRAL_STATS_UNAVAILABLE', 'دریافت آمار ارجاع در حال حاضر ممکن نیست.', 503))
  }
}
