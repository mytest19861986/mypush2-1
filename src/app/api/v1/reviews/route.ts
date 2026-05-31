import { NextRequest } from 'next/server'
import type { Prisma } from '@prisma/client'
import { z } from 'zod'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'
import { AuditActions } from '@/lib/audit'
import { canManageReviews, isSafeId, parseBoundedInteger, toSafeReviewResponse } from '@/lib/reviews'
import { getClientIp } from '@/app/api/v1/auth/_helpers'

const safeIdSchema = z.string().trim().refine(isSafeId, 'Invalid visitId')

const createReviewSchema = z.object({
  visitId: safeIdSchema,
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000, 'Comment must be at most 1000 characters').optional(),
})

const reviewStatusSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED'])

function isUniqueConstraintError(err: unknown) {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: string }).code === 'P2002'
  )
}

// POST /api/v1/reviews - Create a pending review for the current user's visit
export async function POST(request: NextRequest) {
  try {
    const { authenticated, payload, error } = await authenticateRequest(request)
    if (!authenticated || !payload) return errorResponse('UNAUTHORIZED', error!, 401)

    const body = await request.json()
    const parsed = createReviewSchema.safeParse(body)

    if (!parsed.success) {
      return errorResponse(
        'VALIDATION_ERROR',
        parsed.error.issues.map((issue) => issue.message).join(', '),
        400
      )
    }

    const data = parsed.data
    const visit = await db.visit.findUnique({
      where: { id: data.visitId },
      select: {
        id: true,
        userId: true,
        doctorId: true,
        status: true,
        review: {
          select: {
            id: true,
          },
        },
      },
    })

    if (!visit) {
      return errorResponse('NOT_FOUND', 'Visit not found', 404)
    }

    if (!visit.userId || visit.userId !== payload.sub) {
      return errorResponse('FORBIDDEN', 'You can only review your own completed visits', 403)
    }

    if (!['COMPLETED', 'CONFIRMED'].includes(visit.status)) {
      return errorResponse('BAD_REQUEST', 'Visit is not ready for review', 400)
    }

    if (visit.review) {
      return errorResponse('CONFLICT', 'Review already exists for this visit', 409)
    }

    try {
      const ip = getClientIp(request)
      const device = request.headers.get('user-agent') || undefined
      const review = await db.$transaction(async (tx) => {
        const createdReview = await tx.review.create({
          data: {
            userId: payload.sub,
            doctorId: visit.doctorId,
            visitId: visit.id,
            rating: data.rating,
            comment: data.comment,
            status: 'PENDING',
          },
          select: {
            id: true,
            visitId: true,
            rating: true,
            comment: true,
            status: true,
            createdAt: true,
          },
        })

        await tx.auditLog.create({
          data: {
            userId: payload.sub,
            action: AuditActions.REVIEW_CREATED,
            entity: 'Review',
            entityId: createdReview.id,
            details: JSON.stringify({
              reviewId: createdReview.id,
              visitId: visit.id,
              doctorId: visit.doctorId,
              status: 'PENDING',
            }),
            ip,
            device,
          },
        })

        return createdReview
      })

      return successResponse(toSafeReviewResponse(review), 'Review created successfully', 201)
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        return errorResponse('CONFLICT', 'Review already exists for this visit', 409)
      }

      throw err
    }
  } catch (err) {
    if (err instanceof SyntaxError) {
      return errorResponse('VALIDATION_ERROR', 'Invalid request body', 400)
    }

    console.error('[POST /api/v1/reviews]', err)
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500)
  }
}

// GET /api/v1/reviews - Admin review list
export async function GET(request: NextRequest) {
  try {
    const { authenticated, payload, error } = await authenticateRequest(request)
    if (!authenticated || !payload) return errorResponse('UNAUTHORIZED', error!, 401)

    if (!canManageReviews(payload)) {
      return errorResponse('FORBIDDEN', 'Review management permission required', 403)
    }

    const rawStatus = request.nextUrl.searchParams.get('status')
    const rawDoctorId = request.nextUrl.searchParams.get('doctorId')
    const doctorId = rawDoctorId === null ? undefined : rawDoctorId.trim()
    const take = parseBoundedInteger(request.nextUrl.searchParams.get('take'), 50, 100)
    const skip = parseBoundedInteger(request.nextUrl.searchParams.get('skip'), 0, 10000)

    if (take === null || skip === null) {
      return errorResponse('VALIDATION_ERROR', 'Invalid pagination parameters', 400)
    }

    if (rawDoctorId !== null && (!doctorId || !isSafeId(doctorId))) {
      return errorResponse('VALIDATION_ERROR', 'Invalid doctorId', 400)
    }

    const statusResult = rawStatus ? reviewStatusSchema.safeParse(rawStatus.trim()) : null
    if (statusResult && !statusResult.success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid status', 400)
    }

    const where: Prisma.ReviewWhereInput = {
      ...(statusResult?.success && { status: statusResult.data }),
      ...(doctorId && { doctorId }),
    }

    const reviews = await db.review.findMany({
      where,
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
    console.error('[GET /api/v1/reviews]', err)
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500)
  }
}
