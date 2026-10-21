import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'

/**
 * GET /api/v1/notifications/unread-count
 * Returns unread notification count for the authenticated user only.
 */
export async function GET(request: NextRequest) {
  const { authenticated, payload, error } = await authenticateRequest(request)
  if (!authenticated || !payload) {
    return errorResponse('UNAUTHORIZED', error || 'احراز هویت الزامی است.', 401)
  }

  try {
    const unreadCount = await db.notification.count({
      where: {
        userId: payload.userId, // Strict user ownership
        read: false,
      },
    })

    return successResponse({ unreadCount }, 'تعداد اعلان‌های خوانده‌نشده دریافت شد.')
  } catch (err: any) {
    return errorResponse('SERVER_ERROR', 'خطا در شمارش اعلان‌های کاربر.', 500)
  }
}
