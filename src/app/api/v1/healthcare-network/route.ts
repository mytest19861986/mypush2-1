import { NextRequest } from 'next/server'
import { authenticateRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'
import { getHealthcareAdapter } from '@/services/adapters/doctors-clinics-adapter'

const ALLOWED_ROLES = ['SUPER_ADMIN', 'ADMIN', 'SUPPORT', 'DOCTOR']

/**
 * GET /api/v1/healthcare-network
 * Protected Doctors and Healthcare Centers directory API.
 * RBAC: SUPER_ADMIN, ADMIN, SUPPORT, DOCTOR
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate Request
    const { authenticated, payload, error } = await authenticateRequest(request)
    if (!authenticated || !payload) {
      return errorResponse('UNAUTHORIZED', error || 'احراز هویت الزامی است', 401)
    }

    // 2. Role Guard (RBAC)
    const hasRole = payload.roles.some((r) => ALLOWED_ROLES.includes(r))
    if (!hasRole) {
      return errorResponse(
        'FORBIDDEN',
        'دسترسی غیرمجاز. مشاهده شبکه درمانی نیازمند نقش مجاز است',
        403
      )
    }

    // 3. Query Parameter Extraction
    const searchParams = request.nextUrl.searchParams
    const searchQuery = searchParams.get('q') || ''
    const cityFilter = searchParams.get('city') || 'ALL'
    const statusFilter = searchParams.get('status') || 'ALL'
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') || '10', 10) || 10))
    const useMock = searchParams.get('demo') === 'true'

    // 4. Retrieve data from typed Adapter Layer
    const result = await getHealthcareAdapter(
      {
        searchQuery,
        cityFilter,
        statusFilter,
        page,
        pageSize,
      },
      useMock
    )

    return successResponse(result, 'اطلاعات شبکه درمان با موفقیت دریافت شد')
  } catch (err: any) {
    console.error('[HealthcareNetworkAPI] Error:', err)
    return errorResponse(
      'INTERNAL_SERVER_ERROR',
      'خطایی در پردازش اطلاعات شبکه درمانی رخ داد',
      500
    )
  }
}
