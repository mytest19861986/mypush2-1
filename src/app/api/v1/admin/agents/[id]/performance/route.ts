import { NextRequest } from 'next/server'
import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { requirePermission } from '@/lib/auth'
import { errorResponse, successResponse } from '@/lib/api-response'
import { getCommissionAvailability } from '@/lib/commission-settlements'
import { generateReferralCode } from '@/lib/referrals'
import { getRecentReportDateRange, parseReportDateRange, type ReportDateFilter } from '@/utils/report-date-range'

const safeIdPattern = /^[a-zA-Z0-9_-]+$/
function isSafeId(value: string) { return value.length > 0 && value.length <= 100 && safeIdPattern.test(value) }
function parseDateRange(request: NextRequest) {
  const defaults = getRecentReportDateRange()
  const from = request.nextUrl.searchParams.get('from')?.trim() || defaults.from
  const to = request.nextUrl.searchParams.get('to')?.trim() || defaults.to
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) return { ok: false as const, message: 'Invalid date range' }
  try { return { ok: true as const, from, to, filter: parseReportDateRange(from, to) } }
  catch { return { ok: false as const, message: 'Invalid date range' } }
}
function dateFilter(filter: ReportDateFilter): Prisma.DateTimeFilter { return filter }

function sumAmount(items: { amount: number }[]) {
  return items.reduce((total, item) => total + item.amount, 0)
}

// GET /api/v1/admin/agents/[id]/performance?from=YYYY-MM-DD&to=YYYY-MM-DD
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, payload, error } = await requirePermission(request, 'manage_agents')
    if (!authorized) return errorResponse('FORBIDDEN', error!, payload ? 403 : 401)

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
        id: true, userId: true, businessName: true, status: true,
        user: { select: { status: true, deletedAt: true, profile: { select: { firstName: true, lastName: true } } } },
      },
    })

    if (!agent) {
      return errorResponse('NOT_FOUND', 'Agent not found', 404)
    }

    const agentUserId = agent.userId
    const rangeCreatedAt = dateFilter(range.filter)
    const rangePaidAt = dateFilter(range.filter)
    const rangeConfirmedAt = dateFilter(range.filter)
    const rangeReturnedAt = dateFilter(range.filter)

    const [
      registeredCustomersCount,
      paidCustomersCount,
      finalConfirmedCustomersCount,
      returnedCustomersCount,
      commissions,
      commissionRecords,
      settlementRecords,
      availability,
      customerRecords,
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
          requestedAt: dateFilter(range.filter),
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
      db.salesCustomer.findMany({ where: { salesPartnerId: agentUserId, createdAt: rangeCreatedAt }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 25,
        select: { id: true, firstName: true, lastName: true, status: true, createdAt: true, paidAt: true, confirmedAt: true, returnedAt: true, plan: { select: { name: true } } },
      }),
    ])

    const activeCommissions = commissions.filter((commission) => commission.status !== 'CANCELLED')
    const pendingCommissions = commissions.filter((commission) => commission.status === 'PENDING')
    const approvedCommissions = commissions.filter((commission) => commission.status === 'APPROVED')
    const paidCommissions = commissions.filter((commission) => commission.status === 'PAID')

    const referralCode = agent.status === 'APPROVED' && agent.user.status === 'ACTIVE' && !agent.user.deletedAt
      ? generateReferralCode(agentUserId) : null
    return successResponse({
      agent: { id: agent.id, businessName: agent.businessName, status: agent.status,
        name: [agent.user.profile?.firstName, agent.user.profile?.lastName].filter(Boolean).join(' ') || agent.businessName || 'همکار فروش',
      },
      // Resolve on the browser's origin, which may differ from the reverse proxy's internal origin.
      referral: { code: referralCode, link: referralCode ? `/auth/login?ref=${encodeURIComponent(referralCode)}` : null },
      customerRecords,
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
    console.error('[GET /api/v1/admin/agents/[id]/performance]', err instanceof Error ? err.name : 'UnknownError')
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500)
  }
}
