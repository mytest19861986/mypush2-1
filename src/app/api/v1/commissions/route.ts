import { NextRequest } from 'next/server'
import type { Prisma } from '@prisma/client'
import { z } from 'zod'
import { db } from '@/lib/db'
import { authenticateRequest, requirePermission } from '@/lib/auth'
import { errorResponse, paginatedResponse } from '@/lib/api-response'

const validStatuses = ['PENDING', 'APPROVED', 'PAID', 'CANCELLED'] as const

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  status: z.enum(validStatuses).optional(),
  agentId: z.string().optional(),
  ownerSearch: z.string().trim().max(100).optional(),
  sourceType: z.enum(['SALES_PARTNER', 'USER_REFERRAL']).optional(),
})

function getCommissionSourceType(commission: {
  userPlan: { source?: string | null }
  agent?: { agent?: { status?: string | null } | null } | null
}) {
  if (commission.userPlan.source === 'SALES_CONFIRMED') return 'SALES_PARTNER'
  if (commission.agent?.agent?.status === 'APPROVED') return 'SALES_PARTNER'
  return 'USER_REFERRAL'
}

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

    const { page, limit, status, agentId, ownerSearch, sourceType } = parsed.data
    const skip = (page - 1) * limit

    const where: Prisma.CommissionWhereInput = {}

    // Agents can only see their own commissions
    if (!hasAdminPermission) {
      where.agentId = userId
    } else if (agentId) {
      where.agentId = agentId
    }

    if (status) {
      where.status = status
    }

    if (ownerSearch) {
      where.agent = {
        OR: [
          { profile: { firstName: { contains: ownerSearch } } },
          { profile: { lastName: { contains: ownerSearch } } },
          { agent: { is: { businessName: { contains: ownerSearch } } } },
        ],
      }
    }

    if (sourceType === 'USER_REFERRAL') {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : []),
        { userPlan: { source: 'ONLINE_PAYMENT' } },
        { agent: { agent: { is: null } } },
      ]
    } else if (sourceType === 'SALES_PARTNER') {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : []),
        {
          OR: [
            { userPlan: { source: 'SALES_CONFIRMED' } },
            { agent: { agent: { is: { status: 'APPROVED' } } } },
          ],
        },
      ]
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
              salesCustomer: {
                select: {
                  id: true,
                  status: true,
                },
              },
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

    const safeCommissions = commissions.map((commission) => ({
      ...commission,
      sourceType: getCommissionSourceType(commission),
      sourceLabel:
        getCommissionSourceType(commission) === 'SALES_PARTNER'
          ? 'همکار فروش'
          : 'رفرال کاربر',
    }))

    return paginatedResponse(safeCommissions, {
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
