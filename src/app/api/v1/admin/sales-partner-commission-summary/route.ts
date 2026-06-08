import { NextRequest } from 'next/server'
import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'
import {
  DEDUCTIBLE_SETTLEMENT_STATUSES,
  getCommissionAvailabilityByUserIds,
} from '@/lib/commission-settlements'

const dateParamPattern = /^\d{4}-\d{2}-\d{2}$/

type CommissionStatus = 'PENDING' | 'APPROVED' | 'PAID' | 'CANCELLED'

interface PartnerSummary {
  key: string
  displayName: string
  businessName: string | null
  commissionCount: number
  total: number
  pending: number
  approved: number
  paid: number
  cancelled: number
  availableCurrent: number
  pendingSettlementAmount: number
  paidSettlementAmount: number
  openSettlementAmount: number
  lastCommissionAt: string | null
}

type PartnerSummaryAccumulator = Omit<PartnerSummary, 'key'>

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

function getDisplayName(agent: {
  profile: { firstName: string | null; lastName: string | null } | null
  agent: { businessName: string | null } | null
}) {
  const firstName = agent.profile?.firstName?.trim() ?? ''
  const lastName = agent.profile?.lastName?.trim() ?? ''
  const fullName = `${firstName} ${lastName}`.trim()
  return agent.agent?.businessName?.trim() || fullName || 'همکار فروش'
}

function addAmount(summary: PartnerSummaryAccumulator, status: string, amount: number) {
  if (status === 'PENDING') summary.pending += amount
  if (status === 'APPROVED') summary.approved += amount
  if (status === 'PAID') summary.paid += amount
  if (status === 'CANCELLED') summary.cancelled += amount
  summary.total += amount
}

// GET /api/v1/admin/sales-partner-commission-summary?from=YYYY-MM-DD&to=YYYY-MM-DD
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

    const salesPartnerCommissionWhere = {
      OR: [
        { userPlan: { source: 'SALES_CONFIRMED' } },
        { agent: { agent: { is: { status: 'APPROVED' } } } },
      ],
    } satisfies Prisma.CommissionWhereInput

    const [commissions, approvedCommissionOwners, settlementOwners] = await Promise.all([
      db.commission.findMany({
        where: {
          createdAt: {
            gte: range.fromDate,
            lte: range.toDate,
          },
          ...salesPartnerCommissionWhere,
        },
        select: {
          agentId: true,
          amount: true,
          status: true,
          createdAt: true,
          agent: {
            select: {
              profile: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
              agent: {
                select: {
                  businessName: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.commission.groupBy({
        by: ['agentId'],
        where: {
          status: 'APPROVED',
          ...salesPartnerCommissionWhere,
        },
      }),
      db.settlement.groupBy({
        by: ['userId'],
        where: {
          status: { in: [...DEDUCTIBLE_SETTLEMENT_STATUSES] },
          user: {
            agent: {
              is: {
                status: 'APPROVED',
              },
            },
          },
        },
      }),
    ])

    const allPartnerIds = Array.from(
      new Set([
        ...commissions.map((commission) => commission.agentId),
        ...approvedCommissionOwners.map((commission) => commission.agentId),
        ...settlementOwners.map((settlement) => settlement.userId),
      ])
    )

    const users = allPartnerIds.length
      ? await db.user.findMany({
          where: { id: { in: allPartnerIds } },
          select: {
            id: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
            agent: {
              select: {
                businessName: true,
              },
            },
          },
        })
      : []

    const usersById = new Map(users.map((user) => [user.id, user]))

    const summariesByAgentId = new Map<string, PartnerSummaryAccumulator>()

    for (const agentId of allPartnerIds) {
      const user = usersById.get(agentId)
      summariesByAgentId.set(agentId, {
        displayName: user ? getDisplayName(user) : 'ظ‡ظ…ع©ط§ط± ظپط±ظˆط´',
        businessName: user?.agent?.businessName?.trim() || null,
        commissionCount: 0,
        total: 0,
        pending: 0,
        approved: 0,
        paid: 0,
        cancelled: 0,
        availableCurrent: 0,
        pendingSettlementAmount: 0,
        paidSettlementAmount: 0,
        openSettlementAmount: 0,
        lastCommissionAt: null,
      })
    }

    for (const commission of commissions) {
      const current = summariesByAgentId.get(commission.agentId) ?? {
        displayName: getDisplayName(commission.agent),
        businessName: commission.agent.agent?.businessName?.trim() || null,
        commissionCount: 0,
        total: 0,
        pending: 0,
        approved: 0,
        paid: 0,
        cancelled: 0,
        availableCurrent: 0,
        pendingSettlementAmount: 0,
        paidSettlementAmount: 0,
        openSettlementAmount: 0,
        lastCommissionAt: null,
      }

      current.commissionCount += 1
      addAmount(current, commission.status, commission.amount)

      if (!current.lastCommissionAt || commission.createdAt.toISOString() > current.lastCommissionAt) {
        current.lastCommissionAt = commission.createdAt.toISOString()
      }

      summariesByAgentId.set(commission.agentId, current)
    }

    const availabilityByAgentId = await getCommissionAvailabilityByUserIds(allPartnerIds)

    for (const [agentId, summary] of summariesByAgentId.entries()) {
      const availability = availabilityByAgentId.get(agentId)
      summary.availableCurrent = availability?.availableBalance ?? 0
      summary.pendingSettlementAmount = availability?.pendingSettlementAmount ?? 0
      summary.paidSettlementAmount = availability?.paidSettlementAmount ?? 0
      summary.openSettlementAmount = availability?.openSettlementAmount ?? 0
    }

    const partners = Array.from(summariesByAgentId.values())
      .sort((a, b) => b.total - a.total)
      .map((summary, index) => ({
        key: `partner-${index + 1}`,
        ...summary,
      }))

    const totals = partners.reduce(
      (result, partner) => ({
        total: result.total + partner.total,
        pending: result.pending + partner.pending,
        approved: result.approved + partner.approved,
        paid: result.paid + partner.paid,
        cancelled: result.cancelled + partner.cancelled,
        commissionCount: result.commissionCount + partner.commissionCount,
        availableCurrent: result.availableCurrent + partner.availableCurrent,
        pendingSettlementAmount: result.pendingSettlementAmount + partner.pendingSettlementAmount,
        paidSettlementAmount: result.paidSettlementAmount + partner.paidSettlementAmount,
        openSettlementAmount: result.openSettlementAmount + partner.openSettlementAmount,
      }),
      {
        total: 0,
        pending: 0,
        approved: 0,
        paid: 0,
        cancelled: 0,
        commissionCount: 0,
        availableCurrent: 0,
        pendingSettlementAmount: 0,
        paidSettlementAmount: 0,
        openSettlementAmount: 0,
      }
    )

    return successResponse({
      range: {
        from: range.from,
        to: range.to,
      },
      totals,
      partners,
      amountSources: {
        commissionSummary:
          'Commission.amount by Commission.createdAt in range for sales partners; CANCELLED is excluded from total.',
        availableCurrent:
          'Current commission-derived amount: all APPROVED commissions minus PENDING, APPROVED, and PAID settlements. REJECTED and CANCELLED settlements are excluded.',
      },
    })
  } catch (err) {
    console.error('[GET /api/v1/admin/sales-partner-commission-summary]', err)
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500)
  }
}
