import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requirePermission, authenticateRequest } from '@/lib/auth'
import { successResponse, errorResponse, paginatedResponse } from '@/lib/api-response'

import { maskNationalCode } from '@/lib/sales-customers'

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
  if (!authorized) {
    if (!payload) return errorResponse('UNAUTHORIZED', error!, 401)
    return errorResponse('FORBIDDEN', error!, 403)
  }

  const { searchParams } = request.nextUrl
  const parsed = querySchema.safeParse(Object.fromEntries(searchParams))
  if (!parsed.success) {
    return errorResponse('VALIDATION_ERROR', parsed.error.issues.map((e) => e.message).join(', '), 400)
  }

  const { page, limit, search, status } = parsed.data
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {
    // Exclude users who have a Doctor profile or DOCTOR role (professional exclusivity)
    user: {
      doctor: null,
      roles: {
        none: {
          role: {
            name: 'DOCTOR',
          },
        },
      },
    },
  }
  if (status) {
    where.status = status
  }
  if (search) {
    where.AND = [
      {
        OR: [
          { businessName: { contains: search } },
          { user: { mobile: { contains: search } } },
        ],
      },
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
            profile: { select: { firstName: true, lastName: true, avatar: true, nationalCode: true } },
          },
        },
        _count: {
          select: { documents: true },
        },
      },
    }),
    db.agent.count({ where }),
  ])

  const ownerIds = agents.map(agent => agent.userId)
  const [customerCounts, paidCommissions] = ownerIds.length ? await Promise.all([
    db.salesCustomer.groupBy({ by: ['salesPartnerId'], where: { salesPartnerId: { in: ownerIds } }, _count: { _all: true } }),
    db.commission.groupBy({ by: ['agentId'], where: { agentId: { in: ownerIds }, status: 'PAID' }, _sum: { amount: true } }),
  ]) : [[], []]
  const customerCountByOwner = new Map(customerCounts.map(row => [row.salesPartnerId, row._count._all]))
  const paidByOwner = new Map(paidCommissions.map(row => [row.agentId, row._sum.amount ?? 0]))
  const sanitizedAgents = agents.map((agent) => ({
    stats: { registeredCustomers: customerCountByOwner.get(agent.userId) ?? 0, paidCommission: paidByOwner.get(agent.userId) ?? 0 },
    ...agent,
    user: agent.user
      ? {
          ...agent.user,
          profile: agent.user.profile
            ? {
                ...agent.user.profile,
                nationalCode: maskNationalCode(agent.user.profile.nationalCode),
              }
            : null,
        }
      : null,
  }))

  return paginatedResponse(sanitizedAgents, {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  })
}
