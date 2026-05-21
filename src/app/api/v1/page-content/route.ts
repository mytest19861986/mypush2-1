import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-response'

/**
 * GET /api/v1/page-content?slug=about
 * Get page content by slug (public)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug')

    if (!slug) {
      return errorResponse(
        'VALIDATION_ERROR',
        'پارامتر slug الزامی است',
        400
      )
    }

    const pageContent = await db.pageContent.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        title: true,
        content: true,
        updatedAt: true,
      },
    })

    if (!pageContent) {
      return errorResponse(
        'NOT_FOUND',
        'محتوای مورد نظر یافت نشد',
        404
      )
    }

    return successResponse(pageContent)
  } catch {
    return errorResponse(
      'INTERNAL_ERROR',
      'خطای داخلی سرور',
      500
    )
  }
}
