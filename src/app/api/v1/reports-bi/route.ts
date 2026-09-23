import { NextRequest } from 'next/server'
import { authenticateRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'
import { getReportsBiAdapter } from '@/services/adapters/reports-bi-adapter'

const ALLOWED_ROLES = ['SUPER_ADMIN', 'ADMIN']

/**
 * GET /api/v1/reports-bi
 * Protected Business Intelligence & Executive Analytics API.
 * RBAC: SUPER_ADMIN, ADMIN strictly.
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate Request
    const { authenticated, payload, error } = await authenticateRequest(request)
    if (!authenticated || !payload) {
      return errorResponse('UNAUTHORIZED', error || 'احراز هویت الزامی است', 401)
    }

    // 2. Strict Executive RBAC Guard
    const hasRole = payload.roles.some((r) => ALLOWED_ROLES.includes(r))
    if (!hasRole) {
      return errorResponse(
        'FORBIDDEN',
        'دسترسی غیرمجاز. گزارشات هوش کسب‌وکار و مالی صرفاً مختص مدیران ارشد سیستم است',
        403
      )
    }

    // 3. Optional Demo Fallback Flag
    const searchParams = request.nextUrl.searchParams
    const useMock = searchParams.get('demo') === 'true'

    // 4. Retrieve data from typed Adapter Layer
    const result = await getReportsBiAdapter(useMock)

    return successResponse(result, 'داده‌های هوش کسب‌وکار و گزارشات مالی با موفقیت بارگذاری شد')
  } catch (err: any) {
    console.error('[ReportsBiAPI] Error:', err)
    return errorResponse(
      'INTERNAL_SERVER_ERROR',
      'خطایی در پردازش گزارشات هوش کسب‌وکار رخ داد',
      500
    )
  }
}
