import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requirePermission, authenticateRequest } from '@/lib/auth'
import { successResponse, errorResponse, paginatedResponse } from '@/lib/api-response'

const validStatuses = ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED'] as const

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  status: z.enum(validStatuses).optional(),
})

// GET /api/v1/agents — List all agents (paginated, with filters)
export async function GET(request: NextRequest) {
  const { authorized, payload, error } = await requirePermission(request, 'manage_agents')
  if (!authorized) return errorResponse('UNAUTHORIZED', error!, 401)

  const { searchParams } = request.nextUrl
  const parsed = querySchema.safeParse(Object.fromEntries(searchParams))
  if (!parsed.success) {
    return errorResponse('VALIDATION_ERROR', parsed.error.issues.map((e) => e.message).join(', '), 400)
  }

  const { page, limit, search, status } = parsed.data
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {}
  if (status) {
    where.status = status
  }
  if (search) {
    where.OR = [
      { businessName: { contains: search } },
      { user: { mobile: { contains: search } } },
    ]
  }

  const [agents, total] = await Promise.all([
    db.agent.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            mobile: true,
            email: true,
            status: true,
            profile: { select: { firstName: true, lastName: true, avatar: true } },
          },
        },
        _count: {
          select: { documents: true },
        },
      },
    }),
    db.agent.count({ where }),
  ])

  return paginatedResponse(agents, {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  })
}
