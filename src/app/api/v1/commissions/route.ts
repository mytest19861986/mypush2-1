import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { authenticateRequest, requirePermission } from '@/lib/auth'
import { successResponse, errorResponse, paginatedResponse } from '@/lib/api-response'

const validStatuses = ['PENDING', 'APPROVED', 'PAID', 'CANCELLED'] as const

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  status: z.enum(validStatuses).optional(),
  agentId: z.string().optional(),
})

// GET /api/v1/commissions — List commissions
// - Admin (manage_commissions): all commissions with pagination + filters
// - Agent: only their commissions
export async function GET(request: NextRequest) {
  try {
    const { authenticated, payload, error } = await authenticateRequest(request)
    if (!authenticated) return errorResponse('UNAUTHORIZED', error!, 401)

    const userId = payload!.sub
    const hasAdminPermission = payload!.permissions.includes('manage_commissions')
    const isAgent = payload!.roles.includes('AGENT')

    if (!hasAdminPermission && !isAgent) {
      return errorResponse('FORBIDDEN', 'شما دسترسی به این بخش را ندارید', 403)
    }

    const { searchParams } = request.nextUrl
    const parsed = querySchema.safeParse(Object.fromEntries(searchParams))
    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', parsed.error.issues.map((e) => e.message).join('. '), 400)
    }

    const { page, limit, status, agentId } = parsed.data
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}

    // Agents can only see their own commissions
    if (!hasAdminPermission) {
      where.agentId = userId
    } else if (agentId) {
      where.agentId = agentId
    }

    if (status) {
      where.status = status
    }

    const [commissions, total] = await Promise.all([
      db.commission.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          agent: {
            select: {
              id: true,
              profile: { select: { firstName: true, lastName: true } },
              agent: { select: { businessName: true, status: true } },
            },
          },
          userPlan: {
            include: {
              plan: true,
              user: {
                select: {
                  profile: { select: { firstName: true, lastName: true } },
                },
              },
            },
          },
        },
      }),
      db.commission.count({ where }),
    ])

    return paginatedResponse(commissions, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    })
  } catch (err) {
    console.error('[GET /api/v1/commissions]', err)
    return errorResponse('INTERNAL_ERROR', 'خطای داخلی سرور', 500)
  }
}
