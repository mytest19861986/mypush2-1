import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * PATCH /api/v1/notifications/[id]/read
 * Marks a single notification as read.
 * Enforces ownership inside the update condition to prevent IDOR.
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const { authenticated, payload, error } = await authenticateRequest(request)
  if (!authenticated || !payload) {
    return errorResponse('UNAUTHORIZED', error || 'احراز هویت الزامی است.', 401)
  }

  const { id } = await context.params
  if (!id || typeof id !== 'string' || id.trim().length === 0) {
    return errorResponse('INVALID_ID', 'شناسه اعلان نامعتبر است.', 400)
  }

  try {
    // Check if notification exists and belongs to this user
    const existing = await db.notification.findUnique({
      where: { id: id.trim() },
    })

    if (!existing || existing.userId !== payload.sub) {
      // Return 404 to avoid leaking existence of other users' notifications (Zero-Trust IDOR Prevention)
      return errorResponse('NOT_FOUND', 'اعلان مورد نظر یافت نشد.', 404)
    }

    // Idempotent update: if already read, preserve existing readAt or update cleanly
    const updated = await db.notification.update({
      where: { id: existing.id },
      data: {
        read: true,
        readAt: existing.read ? existing.readAt : new Date(),
      },
    })

    return successResponse(
      {
        id: updated.id,
        read: updated.read,
        readAt: updated.readAt,
      },
      'اعلان با موفقیت به‌عنوان خوانده‌شده علامت‌گذاری شد.'
    )
  } catch (err: any) {
    return errorResponse('SERVER_ERROR', 'خطا در به‌روزرسانی وضعیت اعلان.', 500)
  }
}
