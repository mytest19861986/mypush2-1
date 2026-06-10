import { NextRequest } from 'next/server'
import type { Prisma } from '@prisma/client'
import { z } from 'zod'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth'
import { errorResponse, paginatedResponse } from '@/lib/api-response'
import {
  getCommissionSourceType,
} from '@/lib/commissions'

const validStatuses = ['PENDING', 'APPROVED', 'PAID', 'CANCELLED'] as const
const validSourceTypes = ['SALES_PARTNER', 'USER_REFERRAL'] as const
const dateParamPattern = /^\d{4}-\d{2}-\d{2}$/

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  status: z.enum(validStatuses).optional(),
  agentId: z.string().optional(),
  ownerSearch: z.string().trim().max(100).optional(),
  sourceType: z.enum(validSourceTypes).optional(),
  from: z.string().trim().regex(dateParamPattern).optional(),
  to: z.string().trim().regex(dateParamPattern).optional(),
})

function canManageCommissions(payload: { roles: string[]; permissions: string[] }) {
  return (
    payload.roles.includes('SUPER_ADMIN') ||
    payload.roles.includes('ADMIN') ||
    payload.permissions.includes('manage_commissions')
  )
}

function getDateRange(from?: string, to?: string) {
  if (!from && !to) return null
  if (!from || !to) return null

  const fromDate = new Date(`${from}T00:00:00.000Z`)
  const toDate = new Date(`${to}T23:59:59.999Z`)

  if (
    Number.isNaN(fromDate.getTime()) ||
    Number.isNaN(toDate.getTime()) ||
    fromDate.getTime() > toDate.getTime()
  ) {
    return null
  }

  return { fromDate, toDate }
}

function buildSearchCondition(ownerSearch: string): Prisma.CommissionWhereInput {
  return {
    OR: [
      {
        agent: {
          profile: {
            firstName: { contains: ownerSearch },
          },
        },
      },
      {
        agent: {
          profile: {
            lastName: { contains: ownerSearch },
          },
        },
      },
      {
        agent: {
          mobile: { contains: ownerSearch },
        },
      },
      {
        agent: {
          agent: {
            is: {
              businessName: { contains: ownerSearch },
            },
          },
        },
      },
      {
        userPlan: {
          salesCustomer: {
            is: {
              firstName: { contains: ownerSearch },
            },
          },
        },
      },
      {
        userPlan: {
          salesCustomer: {
            is: {
              lastName: { contains: ownerSearch },
            },
          },
        },
      },
      {
        userPlan: {
          salesCustomer: {
            is: {
              mobile: { contains: ownerSearch },
            },
          },
        },
      },
      {
        userPlan: {
          user: {
            is: {
              profile: {
                firstName: { contains: ownerSearch },
              },
            },
          },
        },
      },
      {
        userPlan: {
          user: {
            is: {
              profile: {
                lastName: { contains: ownerSearch },
              },
            },
          },
        },
      },
      {
        userPlan: {
          user: {
            is: {
              mobile: { contains: ownerSearch },
            },
          },
        },
      },
    ],
  }
}

function buildSourceFilter(sourceType?: string): Prisma.CommissionWhereInput | null {
  if (sourceType === 'USER_REFERRAL') {
    return {
      NOT: [
        { userPlan: { source: 'SALES_CONFIRMED' } },
        { agent: { agent: { is: { status: 'APPROVED' } } } },
      ],
    }
  }

  if (sourceType === 'SALES_PARTNER') {
    return {
      OR: [
        { userPlan: { source: 'SALES_CONFIRMED' } },
        { agent: { agent: { is: { status: 'APPROVED' } } } },
      ],
    }
  }

  return null
}

// GET /api/v1/commissions - List commissions
// - Admin (manage_commissions): all commissions with pagination + filters
// - Agent: only their commissions
export async function GET(request: NextRequest) {
  try {
    const { authenticated, payload, error } = await authenticateRequest(request)
    if (!authenticated) return errorResponse('UNAUTHORIZED', error!, 401)

    const userId = payload!.sub
    const hasAdminPermission = canManageCommissions(payload!)
    const isAgent = payload!.roles.includes('AGENT')

    if (!hasAdminPermission && !isAgent) {
      return errorResponse('FORBIDDEN', 'شما دسترسی به این بخش را ندارید', 403)
    }

    const { searchParams } = request.nextUrl
    const parsed = querySchema.safeParse(Object.fromEntries(searchParams))
    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', parsed.error.issues.map((e) => e.message).join('. '), 400)
    }

    const { page, limit, status, agentId, ownerSearch, sourceType, from, to } = parsed.data
    const skip = (page - 1) * limit
    const dateRange = getDateRange(from, to)

    const where: Prisma.CommissionWhereInput = {}
    const andConditions: Prisma.CommissionWhereInput[] = []

    if (!hasAdminPermission) {
      where.agentId = userId
    } else if (agentId) {
      where.agentId = agentId
    }

    if (status) {
      andConditions.push({ status })
    }

    if (dateRange) {
      andConditions.push({
        createdAt: {
          gte: dateRange.fromDate,
          lte: dateRange.toDate,
        },
      })
    }

    if (ownerSearch) {
      andConditions.push(buildSearchCondition(ownerSearch))
    }

    const sourceFilter = buildSourceFilter(sourceType)
    if (sourceFilter) {
      andConditions.push(sourceFilter)
    }

    if (andConditions.length > 0) {
      where.AND = andConditions
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
              mobile: true,
              profile: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
              agent: {
                select: {
                  businessName: true,
                  status: true,
                },
              },
            },
          },
          userPlan: {
            include: {
              salesCustomer: {
                select: {
                  firstName: true,
                  lastName: true,
                  mobile: true,
                },
              },
              plan: true,
              user: {
                select: {
                  mobile: true,
                  profile: {
                    select: {
                      firstName: true,
                      lastName: true,
                    },
                  },
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
