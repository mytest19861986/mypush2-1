import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'
import { parseBoundedInteger, toSafeReviewResponse } from '@/lib/reviews'

// GET /api/v1/reviews/my - Get the current user's own reviews
export async function GET(request: NextRequest) {
  try {
    const { authenticated, payload, error } = await authenticateRequest(request)
    if (!authenticated || !payload) return errorResponse('UNAUTHORIZED', error!, 401)

    const take = parseBoundedInteger(request.nextUrl.searchParams.get('take'), 50, 100)
    const skip = parseBoundedInteger(request.nextUrl.searchParams.get('skip'), 0, 10000)

    if (take === null || skip === null) {
      return errorResponse('VALIDATION_ERROR', 'Invalid pagination parameters', 400)
    }

    const reviews = await db.review.findMany({
      where: { userId: payload.sub },
      select: {
        id: true,
        visitId: true,
        doctorId: true,
        rating: true,
        comment: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    })

    return successResponse(reviews.map(toSafeReviewResponse))
  } catch (err) {
    console.error('[GET /api/v1/reviews/my]', err)
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500)
  }
}
