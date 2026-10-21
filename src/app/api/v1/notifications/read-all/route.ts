import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'

/**
 * POST /api/v1/notifications/read-all
 * Marks all unread notifications for the authenticated user as read.
 */
export async function POST(request: NextRequest) {
  const { authenticated, payload, error } = await authenticateRequest(request)
  if (!authenticated || !payload) {
    return errorResponse('UNAUTHORIZED', error || 'احراز هویت الزامی است.', 401)
  }

  try {
    const result = await db.notification.updateMany({
      where: {
        userId: payload.userId, // Strictly bounded to authenticated user
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    })

    return successResponse(
      { updatedCount: result.count },
      `${result.count} اعلان با موفقیت به‌عنوان خوانده‌شده علامت‌گذاری شدند.`
    )
  } catch (err: any) {
    return errorResponse('SERVER_ERROR', 'خطا در علامت‌گذاری همه اعلان‌ها.', 500)
  }
}
