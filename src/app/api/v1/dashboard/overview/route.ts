import { NextRequest } from 'next/server'
import { authenticateRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'
import { getDashboardAdapter } from '@/services/adapters/dashboard-adapter'

const ALLOWED_ROLES = ['SUPER_ADMIN', 'ADMIN', 'SUPPORT']

/**
 * GET /api/v1/dashboard/overview
 * Protected executive dashboard KPI & metric summary.
 * RBAC: SUPER_ADMIN, ADMIN, SUPPORT
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
        `دسترسی غیرمجاز. مشاهده شاخص‌های داشبورد نیازمند نقش مدیریتی است`,
        403
      )
    }

    // 3. Optional Mock / Demo Mode switch (Controlled query parameter)
    const searchParams = request.nextUrl.searchParams
    const useMock = searchParams.get('demo') === 'true'

    // 4. Retrieve data from typed Adapter Layer
    const dashboardData = await getDashboardAdapter(useMock)

    return successResponse(dashboardData, 'اطلاعات داشبورد مدیریتی با موفقیت بارگذاری شد')
  } catch (err: any) {
    console.error('[DashboardOverviewAPI] Error:', err)
    return errorResponse(
      'INTERNAL_SERVER_ERROR',
      'خطایی در پردازش اطلاعات داشبورد رخ داد',
      500
    )
  }
}
