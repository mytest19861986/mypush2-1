import { NextRequest } from 'next/server'
import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth'
import { errorResponse, paginatedResponse } from '@/lib/api-response'

/**
 * GET /api/v1/notifications
 * Lists notifications for the authenticated user only.
 * Supports pagination and unreadOnly filtering.
 */
export async function GET(request: NextRequest) {
  const { authenticated, payload, error } = await authenticateRequest(request)
  if (!authenticated || !payload) {
    return errorResponse('UNAUTHORIZED', error || 'احراز هویت الزامی است.', 401)
  }

  const { searchParams } = request.nextUrl

  // Pagination parameters with strict bounds
  const rawPage = searchParams.get('page')
  const rawLimit = searchParams.get('limit')
  const unreadOnlyParam = searchParams.get('unreadOnly')

  let page = 1
  if (rawPage !== null) {
    const parsedPage = parseInt(rawPage, 10)
    if (isNaN(parsedPage) || parsedPage < 1) {
      return errorResponse('INVALID_PAGE', 'شماره صفحه باید عدد صحیح مثبت باشد.', 400)
    }
    page = parsedPage
  }

  let limit = 20
  if (rawLimit !== null) {
    const parsedLimit = parseInt(rawLimit, 10)
    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 50) {
      return errorResponse('INVALID_LIMIT', 'تعداد آیتم در صفحه باید عددی بین ۱ تا ۵۰ باشد.', 400)
    }
    limit = parsedLimit
  }

  const where: Prisma.NotificationWhereInput = {
    userId: payload.userId, // Zero-Trust IDOR Protection
  }

  if (unreadOnlyParam === 'true') {
    where.read = false
  } else if (unreadOnlyParam === 'false') {
    where.read = true
  }

  try {
    const [notifications, total] = await Promise.all([
      db.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.notification.count({ where }),
    ])

    const totalPages = Math.ceil(total / limit)

    return paginatedResponse(notifications, {
      page,
      limit,
      total,
      totalPages,
    })
  } catch (err: any) {
    return errorResponse('SERVER_ERROR', 'خطا در واکشی اعلان‌های کاربر.', 500)
  }
}
