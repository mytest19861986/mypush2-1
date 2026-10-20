import { NextRequest } from 'next/server'
import type { Prisma } from '@prisma/client'
import { z } from 'zod'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'
import { AuditActions } from '@/lib/audit'
import { canManageReviews, isSafeId, parseBoundedInteger, toSafeReviewResponse } from '@/lib/reviews'
import { getClientIp } from '@/app/api/v1/auth/_helpers'

const safeIdSchema = z.string().trim().refine(isSafeId, 'شناسه ویزیت نامعتبر است.')

const createReviewSchema = z.object({
  visitId: safeIdSchema,
  rating: z.number().int().min(1, 'امتیاز باید حداقل ۱ باشد.').max(5, 'امتیاز می‌تواند حداکثر ۵ باشد.'),
  comment: z.string().trim().max(1000, 'متن نظر نباید بیشتر از ۱۰۰۰ کاراکتر باشد.').optional(),
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
    if (!authenticated || !payload) {
      return errorResponse('UNAUTHORIZED', error || 'برای ثبت نظر ابتدا وارد حساب کاربری خود شوید.', 401)
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return errorResponse('VALIDATION_ERROR', 'فرمت داده‌های ارسالی نامعتبر است.', 400)
    }

    const parsed = createReviewSchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse(
        'VALIDATION_ERROR',
        parsed.error.issues.map((issue) => issue.message).join('، '),
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
      return errorResponse('NOT_FOUND', 'ویزیت مورد نظر یافت نشد.', 404)
    }

    if (!visit.userId || visit.userId !== payload.sub) {
      return errorResponse('FORBIDDEN', 'شما فقط مجاز به ثبت نظر برای ویزیت‌های تکمیل‌شده خود هستید.', 403)
    }

    if (!['COMPLETED', 'CONFIRMED'].includes(visit.status)) {
      return errorResponse('BAD_REQUEST', 'این ویزیت هنوز به اتمام نرسیده و امکان ثبت نظر برای آن وجود ندارد.', 400)
    }

    if (visit.review) {
      return errorResponse('CONFLICT', 'برای این ویزیت قبلاً نظر ثبت شده است.', 409)
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
            comment: data.comment || null,
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

      return successResponse(toSafeReviewResponse(review), 'نظر شما با موفقیت ثبت شد و پس از بررسی منتشر خواهد شد.', 201)
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        return errorResponse('CONFLICT', 'برای این ویزیت قبلاً نظر ثبت شده است.', 409)
      }

      throw err
    }
  } catch (err) {
    console.error('[POST /api/v1/reviews]', err)
    return errorResponse('INTERNAL_ERROR', 'خطای داخلی سرور هنگام ثبت نظر رخ داد.', 500)
  }
}

// GET /api/v1/reviews - Admin review list
export async function GET(request: NextRequest) {
  try {
    const { authenticated, payload, error } = await authenticateRequest(request)
    if (!authenticated || !payload) {
      return errorResponse('UNAUTHORIZED', error || 'دسترسی غیرمجاز.', 401)
    }

    if (!canManageReviews(payload)) {
      return errorResponse('FORBIDDEN', 'شما مجوز مدیریت نظرات را ندارید.', 403)
    }

    const rawStatus = request.nextUrl.searchParams.get('status')
    const rawDoctorId = request.nextUrl.searchParams.get('doctorId')
    const doctorId = rawDoctorId === null ? undefined : rawDoctorId.trim()
    const take = parseBoundedInteger(request.nextUrl.searchParams.get('take'), 50, 100)
    const skip = parseBoundedInteger(request.nextUrl.searchParams.get('skip'), 0, 10000)

    if (take === null || skip === null) {
      return errorResponse('VALIDATION_ERROR', 'پارامترهای صفحه‌بندی نامعتبر است.', 400)
    }

    if (rawDoctorId !== null && (!doctorId || !isSafeId(doctorId))) {
      return errorResponse('VALIDATION_ERROR', 'شناسه پزشک نامعتبر است.', 400)
    }

    const statusResult = rawStatus ? reviewStatusSchema.safeParse(rawStatus.trim()) : null
    if (statusResult && !statusResult.success) {
      return errorResponse('VALIDATION_ERROR', 'وضعیت فیلتر نامعتبر است.', 400)
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
    return errorResponse('INTERNAL_ERROR', 'خطای داخلی سرور رخ داد.', 500)
  }
}
