import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'
import { AuditActions } from '@/lib/audit'
import { canManageReviews, isSafeId, toSafeReviewResponse } from '@/lib/reviews'
import { getClientIp } from '@/app/api/v1/auth/_helpers'

const rejectReviewSchema = z.object({
  reason: z.string().trim().max(500, 'Reason must be at most 500 characters').optional(),
})

// PATCH /api/v1/reviews/[id]/reject - Reject a review
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authenticated, payload, error } = await authenticateRequest(request)
    if (!authenticated || !payload) return errorResponse('UNAUTHORIZED', error!, 401)

    if (!canManageReviews(payload)) {
      return errorResponse('FORBIDDEN', 'Review management permission required', 403)
    }

    const { id } = await params
    if (!isSafeId(id)) {
      return errorResponse('VALIDATION_ERROR', 'Invalid review id', 400)
    }

    let reason: string | undefined
    const text = await request.text()

    if (text.trim()) {
      const parsed = rejectReviewSchema.safeParse(JSON.parse(text))
      if (!parsed.success) {
        return errorResponse(
          'VALIDATION_ERROR',
          parsed.error.issues.map((issue) => issue.message).join(', '),
          400
        )
      }

      reason = parsed.data.reason
    }

    const existingReview = await db.review.findUnique({
      where: { id },
      select: { id: true, status: true, visitId: true, doctorId: true },
    })

    if (!existingReview) {
      return errorResponse('NOT_FOUND', 'Review not found', 404)
    }

    if (existingReview.status === 'REJECTED') {
      return errorResponse('CONFLICT', 'Review is already rejected', 409)
    }

    if (existingReview.status === 'APPROVED') {
      return errorResponse('CONFLICT', 'Approved review cannot be rejected', 409)
    }

    const ip = getClientIp(request)
    const device = request.headers.get('user-agent') || undefined
    const review = await db.$transaction(async (tx) => {
      const updatedReview = await tx.review.update({
        where: { id },
        data: { status: 'REJECTED' },
        select: {
          id: true,
          visitId: true,
          doctorId: true,
          rating: true,
          comment: true,
          status: true,
          createdAt: true,
        },
      })

      await tx.auditLog.create({
        data: {
          userId: payload.sub,
          action: AuditActions.REVIEW_REJECTED,
          entity: 'Review',
          entityId: updatedReview.id,
          details: JSON.stringify({
            reviewId: updatedReview.id,
            visitId: updatedReview.visitId,
            doctorId: updatedReview.doctorId,
            previousStatus: existingReview.status,
            newStatus: 'REJECTED',
            actorId: payload.sub,
            reason,
          }),
          ip,
          device,
        },
      })

      return updatedReview
    })

    return successResponse(toSafeReviewResponse(review), 'Review rejected successfully')
  } catch (err) {
    if (err instanceof SyntaxError) {
      return errorResponse('VALIDATION_ERROR', 'Invalid request body', 400)
    }

    console.error('[PATCH /api/v1/reviews/[id]/reject]', err)
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500)
  }
}
