import { NextRequest } from 'next/server'
import { authenticateRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'
import { getUserAdapter } from '@/services/adapters/user-adapter'

const ALLOWED_ROLES = ['SUPER_ADMIN', 'ADMIN', 'SUPPORT']

/**
 * GET /api/v1/users
 * Protected users list with search, role/status filtering, and pagination.
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
        `دسترسی غیرمجاز. دسترسی به مدیریت کاربران نیازمند نقش مجاز است`,
        403
      )
    }

    // 3. Query Parameter Extraction & Validation
    const searchParams = request.nextUrl.searchParams
    const searchQuery = searchParams.get('q') || ''
    const roleFilter = searchParams.get('role') || 'ALL'
    const statusFilter = searchParams.get('status') || 'ALL'
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') || '10', 10) || 10))
    const useMock = searchParams.get('demo') === 'true'

    // 4. Retrieve data from typed Adapter Layer
    const result = await getUserAdapter(
      {
        searchQuery,
        roleFilter,
        statusFilter,
        page,
        pageSize,
      },
      useMock
    )

    return successResponse(result, 'لیست کاربران با موفقیت بارگذاری شد')
  } catch (err: any) {
    console.error('[UsersAPI] Error:', err)
    return errorResponse(
      'INTERNAL_SERVER_ERROR',
      'خطایی در پردازش لیست کاربران رخ داد',
      500
    )
  }
}
