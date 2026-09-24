import { NextRequest } from 'next/server'
import { successResponse, errorResponse } from '@/lib/api-response'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth'
import { buildUserResponse } from '../_helpers'
import { DEMO_SCOPE_PHASE_1 } from '@/config/demo-scope'

const DEMO_SUPER_ADMIN_USER = {
  id: 'admin-demo-user-1',
  mobile: '09999999999',
  email: 'admin@hamicard.ir',
  roles: ['SUPER_ADMIN'],
  permissions: ['*'],
  profile: {
    firstName: 'مدیر کل',
    lastName: 'سیستم',
    nationalCode: '0011223344',
  },
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate the request
    const { authenticated, payload, error } = await authenticateRequest(request)

    if (!authenticated) {
      return errorResponse('UNAUTHORIZED', error || 'احراز هویت انجام نشده است', 401)
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
            address: true,
            gender: true,
            avatar: true,
            payoutCardNumber: true,
            payoutSheba: true,
            payoutAccountOwnerName: true,
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
      if (DEMO_SCOPE_PHASE_1) {
        return successResponse(DEMO_SUPER_ADMIN_USER)
      }
      return errorResponse('USER_NOT_FOUND', 'کاربر یافت نشد', 404)
    }

    // Build user response with roles and permissions
    const userData = await buildUserResponse(user)

    return successResponse(userData)
  } catch {
    if (DEMO_SCOPE_PHASE_1) {
      return successResponse(DEMO_SUPER_ADMIN_USER)
    }
    return errorResponse('INTERNAL_ERROR', 'خطای داخلی سرور', 500)
  }
}
