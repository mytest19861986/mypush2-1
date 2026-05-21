import { NextRequest } from 'next/server'
import { successResponse, errorResponse } from '@/lib/api-response'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth'
import { buildUserResponse } from '../_helpers'

export async function GET(request: NextRequest) {
  try {
    // Authenticate the request
    const { authenticated, payload, error } = await authenticateRequest(request)

    if (!authenticated) {
      return errorResponse('UNAUTHORIZED', error!, 401)
    }

    const userId = payload!.sub

    // Fetch user with relations
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        profile: {
          select: {
            firstName: true,
            lastName: true,
            nationalCode: true,
            avatar: true,
          },
        },
        agent: {
          select: {
            id: true,
            businessName: true,
            status: true,
          },
        },
      },
    })

    if (!user) {
      return errorResponse('USER_NOT_FOUND', 'کاربر یافت نشد', 404)
    }

    // Build user response with roles and permissions
    const userData = await buildUserResponse(user)

    return successResponse(userData)
  } catch {
    return errorResponse('INTERNAL_ERROR', 'خطای داخلی سرور', 500)
  }
}
