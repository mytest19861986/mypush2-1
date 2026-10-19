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
      if (DEMO_SCOPE_PHASE_1 && process.env.NODE_ENV !== 'production') {
        const DEMO_PERSONAS_LIST: Record<string, any> = {
          'admin-demo-user-1': DEMO_SUPER_ADMIN_USER,
          'doctor-demo-user-1': {
            id: 'doctor-demo-user-1',
            mobile: '09222222222',
            email: 'doctor@hamicard.ir',
            roles: ['DOCTOR'],
            permissions: ['view_doctor_dashboard', 'manage_patients'],
            profile: { firstName: 'دکتر رضا', lastName: 'احمدی', nationalCode: '0022334455' },
          },
          'agent-demo-user-1': {
            id: 'agent-demo-user-1',
            mobile: '09123456789',
            email: 'agent@hamicard.ir',
            roles: ['AGENT'],
            permissions: ['view_agent_dashboard', 'manage_referrals'],
            profile: { firstName: 'علی', lastName: 'کریمی', nationalCode: '0033445566' },
          },
          'user-demo-user-1': {
            id: 'user-demo-user-1',
            mobile: '09111111111',
            email: 'user@hamicard.ir',
            roles: ['USER'],
            permissions: [],
            profile: { firstName: 'مهدی', lastName: 'رضایی', nationalCode: '0044556677' },
          },
          'support-demo-user-1': {
            id: 'support-demo-user-1',
            mobile: '09333333333',
            email: 'support@hamicard.ir',
            roles: ['SUPPORT'],
            permissions: ['view_users', 'view_reports'],
            profile: { firstName: 'پشتیبان', lastName: 'سامانه', nationalCode: '0055667788' },
          },
        }
        const matched = DEMO_PERSONAS_LIST[userId] || DEMO_SUPER_ADMIN_USER
        return successResponse(matched)
      }
      return errorResponse('USER_NOT_FOUND', 'کاربر یافت نشد', 404)
    }

    // Build user response with roles and permissions
    const userData = await buildUserResponse(user)

    return successResponse(userData)
  } catch {
    if (DEMO_SCOPE_PHASE_1 && process.env.NODE_ENV !== 'production') {
      return successResponse(DEMO_SUPER_ADMIN_USER)
    }
    return errorResponse('INTERNAL_ERROR', 'خطای داخلی سرور', 500)
  }
}
