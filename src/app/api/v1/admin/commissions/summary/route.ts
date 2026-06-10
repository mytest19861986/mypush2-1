import { NextRequest } from 'next/server'
import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth'
import { errorResponse, successResponse } from '@/lib/api-response'
import {
  CommissionSourceType,
  getCommissionSourceType,
} from '@/lib/commissions'
import {
  getCommissionAvailabilityByUserIds,
  SETTLEMENT_STATUSES,
} from '@/lib/commission-settlements'

const dateParamPattern = /^\d{4}-\d{2}-\d{2}$/
const validCommissionStatuses = ['PENDING', 'APPROVED', 'PAID', 'CANCELLED'] as const
const validSourceTypes = ['SALES_PARTNER', 'USER_REFERRAL'] as const

function canViewCommissionSummary(payload: { roles: string[]; permissions: string[] }) {
  return (
    payload.roles.includes('SUPER_ADMIN') ||
    payload.roles.includes('ADMIN') ||
    payload.permissions.includes('manage_commissions') ||
    payload.permissions.includes('view_wallets') ||
    payload.permissions.includes('manage_wallets')
  )
}

function toInputDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function getDefaultRange() {
  const to = new Date()
  const from = new Date()
  from.setDate(to.getDate() - 29)

  return {
    from: toInputDate(from),
    to: toInputDate(to),
  }
}

function parseDateRange(request: NextRequest) {
  const defaults = getDefaultRange()
  const from = request.nextUrl.searchParams.get('from')?.trim() || defaults.from
  const to = request.nextUrl.searchParams.get('to')?.trim() || defaults.to

  if (!dateParamPattern.test(from) || !dateParamPattern.test(to)) {
    return { ok: false as const, message: 'Invalid date range' }
  }

  const fromDate = new Date(`${from}T00:00:00.000Z`)
  const toDate = new Date(`${to}T23:59:59.999Z`)

  if (
    Number.isNaN(fromDate.getTime()) ||
    Number.isNaN(toDate.getTime()) ||
    fromDate.getTime() > toDate.getTime()
  ) {
    return { ok: false as const, message: 'Invalid date range' }
  }

  return { ok: true as const, from, to, fromDate, toDate }
}

function buildCommissionWhere(params: {
  status?: string
  ownerSearch?: string
  sourceType?: string
  fromDate: Date
  toDate: Date
}) {
  const and: Prisma.CommissionWhereInput[] = [
    {
      createdAt: {
        gte: params.fromDate,
        lte: params.toDate,
      },
    },
  ]

  if (params.status) {
    and.push({ status: params.status })
  }

  if (params.ownerSearch) {
    and.push({
      OR: [
        {
          agent: {
            profile: {
              firstName: { contains: params.ownerSearch },
            },
          },
        },
        {
          agent: {
            profile: {
              lastName: { contains: params.ownerSearch },
            },
          },
        },
        {
          agent: {
            mobile: { contains: params.ownerSearch },
          },
        },
        {
          agent: {
            agent: {
              is: {
                businessName: { contains: params.ownerSearch },
              },
            },
          },
        },
        {
          userPlan: {
            salesCustomer: {
              is: {
                firstName: { contains: params.ownerSearch },
              },
            },
          },
        },
        {
          userPlan: {
            salesCustomer: {
              is: {
                lastName: { contains: params.ownerSearch },
              },
            },
          },
        },
        {
          userPlan: {
            salesCustomer: {
              is: {
                mobile: { contains: params.ownerSearch },
              },
            },
          },
        },
        {
          userPlan: {
            user: {
              is: {
                profile: {
                  firstName: { contains: params.ownerSearch },
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
                  lastName: { contains: params.ownerSearch },
                },
              },
            },
          },
        },
        {
          userPlan: {
            user: {
              is: {
                mobile: { contains: params.ownerSearch },
              },
            },
          },
        },
      ],
    })
  }

  if (params.sourceType === 'USER_REFERRAL') {
    and.push({
      NOT: [
        { userPlan: { source: 'SALES_CONFIRMED' } },
        { agent: { agent: { is: { status: 'APPROVED' } } } },
      ],
    })
  } else if (params.sourceType === 'SALES_PARTNER') {
    and.push({
      OR: [
        { userPlan: { source: 'SALES_CONFIRMED' } },
        { agent: { agent: { is: { status: 'APPROVED' } } } },
      ],
    })
  }

  return { AND: and }
}

export async function GET(request: NextRequest) {
  try {
    const { authenticated, payload, error } = await authenticateRequest(request)
    if (!authenticated || !payload) return errorResponse('UNAUTHORIZED', error!, 401)

    if (!canViewCommissionSummary(payload)) {
      return errorResponse('FORBIDDEN', 'Commission summary permission required', 403)
    }

    const range = parseDateRange(request)
    if (!range.ok) {
      return errorResponse('VALIDATION_ERROR', range.message, 400)
    }

    const status = request.nextUrl.searchParams.get('status')?.trim() || undefined
    const ownerSearch = request.nextUrl.searchParams.get('ownerSearch')?.trim() || undefined
    const sourceType = request.nextUrl.searchParams.get('sourceType')?.trim() || undefined

    if (status && !validCommissionStatuses.includes(status as (typeof validCommissionStatuses)[number])) {
      return errorResponse('VALIDATION_ERROR', 'Invalid commission status', 400)
    }

    if (sourceType && !validSourceTypes.includes(sourceType as (typeof validSourceTypes)[number])) {
      return errorResponse('VALIDATION_ERROR', 'Invalid commission source type', 400)
    }

    if (ownerSearch && ownerSearch.length > 100) {
      return errorResponse('VALIDATION_ERROR', 'Search text is too long', 400)
    }

    const where = buildCommissionWhere({
      status,
      ownerSearch,
      sourceType,
      fromDate: range.fromDate,
      toDate: range.toDate,
    })

    const commissions = await db.commission.findMany({
      where,
      select: {
        agentId: true,
        amount: true,
        status: true,
        createdAt: true,
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
          select: {
            source: true,
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
            salesCustomer: {
              select: {
                firstName: true,
                lastName: true,
                mobile: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const ownerIds = Array.from(new Set(commissions.map((commission) => commission.agentId)))

    if (ownerIds.length === 0) {
      return successResponse({
        range: {
          from: range.from,
          to: range.to,
        },
        totals: {
          commissionCount: 0,
          totalCommissionAmount: 0,
          pendingCommissionAmount: 0,
          approvedCommissionAmount: 0,
          withdrawableCommissionAmount: 0,
          paidCommissionAmount: 0,
          cancelledCommissionAmount: 0,
          openSettlementAmount: 0,
          paidSettlementAmount: 0,
        },
        sourceBreakdown: {
          SALES_PARTNER: { amount: 0, count: 0 },
          USER_REFERRAL: { amount: 0, count: 0 },
        },
        settlementBreakdown: {
          openAmount: 0,
          openCount: 0,
          paidAmount: 0,
          paidCount: 0,
          statusBreakdown: SETTLEMENT_STATUSES.map((status) => ({
            status,
            amount: 0,
            count: 0,
          })),
        },
      })
    }

    const availabilityByUserId = await getCommissionAvailabilityByUserIds(ownerIds)

    const sourceBreakdown: Record<CommissionSourceType, { amount: number; count: number }> = {
      SALES_PARTNER: { amount: 0, count: 0 },
      USER_REFERRAL: { amount: 0, count: 0 },
    }

    const totals = {
      commissionCount: commissions.length,
      totalCommissionAmount: 0,
      pendingCommissionAmount: 0,
      approvedCommissionAmount: 0,
      withdrawableCommissionAmount: 0,
      paidCommissionAmount: 0,
      cancelledCommissionAmount: 0,
      openSettlementAmount: 0,
      paidSettlementAmount: 0,
    }

    for (const commission of commissions) {
      totals.totalCommissionAmount += commission.amount
      if (commission.status === 'PENDING') totals.pendingCommissionAmount += commission.amount
      if (commission.status === 'APPROVED') totals.approvedCommissionAmount += commission.amount
      if (commission.status === 'PAID') totals.paidCommissionAmount += commission.amount
      if (commission.status === 'CANCELLED') totals.cancelledCommissionAmount += commission.amount

      const sourceType = getCommissionSourceType(commission)
      sourceBreakdown[sourceType].amount += commission.amount
      sourceBreakdown[sourceType].count += 1
    }

    for (const availability of availabilityByUserId.values()) {
      totals.withdrawableCommissionAmount += availability.availableBalance
      totals.openSettlementAmount += availability.openSettlementAmount
      totals.paidSettlementAmount += availability.paidSettlementAmount
    }

    const settlementGroup = await db.settlement.groupBy({
      by: ['status'],
      where: {
        userId: { in: ownerIds },
        status: { in: [...SETTLEMENT_STATUSES] },
      },
      _sum: {
        amount: true,
      },
      _count: {
        _all: true,
      },
    })

    const settlementByStatus = new Map(
      settlementGroup.map((entry) => [
        entry.status,
        {
          amount: entry._sum.amount ?? 0,
          count: entry._count._all,
        },
      ])
    )

    return successResponse({
      range: {
        from: range.from,
        to: range.to,
      },
      totals,
      sourceBreakdown,
      settlementBreakdown: {
        openAmount: totals.openSettlementAmount,
        openCount:
          (settlementByStatus.get('PENDING')?.count ?? 0) +
          (settlementByStatus.get('APPROVED')?.count ?? 0),
        paidAmount: totals.paidSettlementAmount,
        paidCount: settlementByStatus.get('PAID')?.count ?? 0,
        statusBreakdown: SETTLEMENT_STATUSES.map((status) => ({
          status,
          amount: settlementByStatus.get(status)?.amount ?? 0,
          count: settlementByStatus.get(status)?.count ?? 0,
        })),
      },
    })
  } catch (err) {
    console.error('[GET /api/v1/admin/commissions/summary]', err)
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500)
  }
}
