import { NextRequest } from 'next/server'
import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { requirePermission } from '@/lib/auth'
import { errorResponse, successResponse } from '@/lib/api-response'
import { getCommissionAvailability } from '@/lib/commission-settlements'

const dateParamPattern = /^\d{4}-\d{2}-\d{2}$/
const safeIdPattern = /^[a-zA-Z0-9_-]+$/

function isSafeId(value: string) {
  return value.length > 0 && value.length <= 100 && safeIdPattern.test(value)
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

function dateFilter(fromDate: Date, toDate: Date): Prisma.DateTimeFilter {
  return { gte: fromDate, lte: toDate }
}

function sumAmount(items: { amount: number }[]) {
  return items.reduce((total, item) => total + item.amount, 0)
}

// GET /api/v1/admin/agents/[id]/performance?from=YYYY-MM-DD&to=YYYY-MM-DD
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, error } = await requirePermission(request, 'manage_agents')
    if (!authorized) return errorResponse('UNAUTHORIZED', error!, 401)

    const { id } = await params
    if (!isSafeId(id)) {
      return errorResponse('VALIDATION_ERROR', 'Invalid agent id', 400)
    }

    const range = parseDateRange(request)
    if (!range.ok) {
      return errorResponse('VALIDATION_ERROR', range.message, 400)
    }

    const agent = await db.agent.findUnique({
      where: { id },
      select: {
        userId: true,
      },
    })

    if (!agent) {
      return errorResponse('NOT_FOUND', 'Agent not found', 404)
    }

    const agentUserId = agent.userId
    const rangeCreatedAt = dateFilter(range.fromDate, range.toDate)
    const rangePaidAt = dateFilter(range.fromDate, range.toDate)
    const rangeConfirmedAt = dateFilter(range.fromDate, range.toDate)
    const rangeReturnedAt = dateFilter(range.fromDate, range.toDate)

    const [
      registeredCustomersCount,
      paidCustomersCount,
      finalConfirmedCustomersCount,
      returnedCustomersCount,
      commissions,
      commissionRecords,
      settlementRecords,
      availability,
    ] = await Promise.all([
      db.salesCustomer.count({
        where: {
          salesPartnerId: agentUserId,
          createdAt: rangeCreatedAt,
        },
      }),
      db.salesCustomer.count({
        where: {
          salesPartnerId: agentUserId,
          paidAt: rangePaidAt,
        },
      }),
      db.salesCustomer.count({
        where: {
          salesPartnerId: agentUserId,
          status: 'CONFIRMED',
          confirmedAt: rangeConfirmedAt,
        },
      }),
      db.salesCustomer.count({
        where: {
          salesPartnerId: agentUserId,
          status: 'RETURNED',
          returnedAt: rangeReturnedAt,
        },
      }),
      db.commission.findMany({
        where: {
          agentId: agentUserId,
          createdAt: rangeCreatedAt,
        },
        select: {
          amount: true,
          percent: true,
          status: true,
          paidAt: true,
          createdAt: true,
        },
      }),
      db.commission.findMany({
        where: {
          agentId: agentUserId,
          createdAt: rangeCreatedAt,
        },
        select: {
          amount: true,
          percent: true,
          status: true,
          paidAt: true,
          createdAt: true,
          userPlan: {
            select: {
              status: true,
              source: true,
              plan: {
                select: {
                  name: true,
                  price: true,
                },
              },
              salesCustomer: {
                select: {
                  firstName: true,
                  lastName: true,
                  status: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 25,
      }),
      db.settlement.findMany({
        where: {
          userId: agentUserId,
          requestedAt: dateFilter(range.fromDate, range.toDate),
        },
        select: {
          amount: true,
          status: true,
          requestedAt: true,
          settledAt: true,
          createdAt: true,
        },
        orderBy: { requestedAt: 'desc' },
        take: 25,
      }),
      getCommissionAvailability(agentUserId),
    ])

    const activeCommissions = commissions.filter((commission) => commission.status !== 'CANCELLED')
    const pendingCommissions = commissions.filter((commission) => commission.status === 'PENDING')
    const approvedCommissions = commissions.filter((commission) => commission.status === 'APPROVED')
    const paidCommissions = commissions.filter((commission) => commission.status === 'PAID')

    return successResponse({
      range: {
        from: range.from,
        to: range.to,
      },
      customerStats: {
        registeredCustomersCount,
        paidCustomersCount,
        finalConfirmedCustomersCount,
        returnedCustomersCount,
      },
      commissionStats: {
        totalCommissionAmount: sumAmount(activeCommissions),
        pendingCommissionAmount: sumAmount(pendingCommissions),
        approvedCommissionAmount: sumAmount(approvedCommissions),
        approvedWithdrawableCommissionAmount: availability.availableBalance,
        paidCommissionAmount: sumAmount(paidCommissions),
      },
      settlementStats: {
        openSettlementAmount: availability.openSettlementAmount,
        paidSettlementAmount: availability.paidSettlementAmount,
      },
      commissionRecords: commissionRecords.map((commission, index) => ({
        key: `commission-${index + 1}`,
        amount: commission.amount,
        percent: commission.percent,
        status: commission.status,
        paidAt: commission.paidAt?.toISOString() ?? null,
        createdAt: commission.createdAt.toISOString(),
        plan: {
          name: commission.userPlan.plan.name,
          price: commission.userPlan.plan.price,
        },
        salesCustomer: commission.userPlan.salesCustomer
          ? {
              firstName: commission.userPlan.salesCustomer.firstName,
              lastName: commission.userPlan.salesCustomer.lastName,
              status: commission.userPlan.salesCustomer.status,
            }
          : null,
      })),
      settlementRecords: settlementRecords.map((settlement, index) => ({
        key: `settlement-${index + 1}`,
        amount: settlement.amount,
        status: settlement.status,
        requestedAt: settlement.requestedAt.toISOString(),
        settledAt: settlement.settledAt?.toISOString() ?? null,
        createdAt: settlement.createdAt.toISOString(),
      })),
      rules: {
        withdrawable:
          'Approved commissions minus pending, approved, and paid settlements. Pending commissions are not withdrawable.',
      },
    })
  } catch (err) {
    console.error('[GET /api/v1/admin/agents/[id]/performance]', err)
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500)
  }
}
