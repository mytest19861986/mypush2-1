import { NextRequest } from 'next/server'
import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-response'
import { authenticateRequest } from '@/lib/auth'
import { getWalletCommissionSummary } from '@/lib/commission-settlements'

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/

function toInputDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function getDefaultDateRange() {
  const to = new Date()
  const from = new Date()
  from.setDate(to.getDate() - 29)

  return {
    from: toInputDate(from),
    to: toInputDate(to),
  }
}

function parseIsoDateRange(request: NextRequest) {
  const defaults = getDefaultDateRange()
  const from = request.nextUrl.searchParams.get('from')?.trim() || defaults.from
  const to = request.nextUrl.searchParams.get('to')?.trim() || defaults.to

  if (!isoDatePattern.test(from) || !isoDatePattern.test(to)) {
    return { error: true as const }
  }

  const fromDate = new Date(`${from}T00:00:00.000Z`)
  const toDate = new Date(`${to}T23:59:59.999Z`)

  if (
    Number.isNaN(fromDate.getTime()) ||
    Number.isNaN(toDate.getTime()) ||
    fromDate.getTime() > toDate.getTime()
  ) {
    return { error: true as const }
  }

  return {
    range: { from, to },
    where: { createdAt: { gte: fromDate, lte: toDate } satisfies Prisma.DateTimeFilter },
  }
}

function getCommissionSourceType(commission: {
  userPlan: { source?: string | null }
  agent?: { agent?: { status?: string | null } | null } | null
}) {
  if (commission.userPlan.source === 'SALES_CONFIRMED') return 'SALES_PARTNER'
  if (commission.agent?.agent?.status === 'APPROVED') return 'SALES_PARTNER'
  return 'USER_REFERRAL'
}

function toSafeCommission(commission: {
  id: string
  amount: number
  percent: number
  status: string
  paidAt: Date | null
  createdAt: Date
  updatedAt: Date
  agent?: { agent?: { status?: string | null; businessName?: string | null } | null } | null
  userPlan: {
    status: string
    source: string
    startDate: Date
    endDate: Date
    plan: { name: string; price: number }
  }
}) {
  const sourceType = getCommissionSourceType(commission)

  return {
    id: commission.id,
    amount: commission.amount,
    percent: commission.percent,
    status: commission.status,
    paidAt: commission.paidAt?.toISOString() ?? null,
    createdAt: commission.createdAt.toISOString(),
    updatedAt: commission.updatedAt.toISOString(),
    sourceType,
    ownerLabel:
      commission.agent?.agent?.businessName?.trim() ||
      (sourceType === 'SALES_PARTNER' ? 'همکار فروش' : 'رفرال کاربر'),
    userPlan: {
      status: commission.userPlan.status,
      source: commission.userPlan.source,
      startDate: commission.userPlan.startDate.toISOString(),
      endDate: commission.userPlan.endDate.toISOString(),
      plan: {
        name: commission.userPlan.plan.name,
        price: commission.userPlan.plan.price,
      },
    },
  }
}

// GET /api/v1/commissions/my - Current user's own commissions.
export async function GET(request: NextRequest) {
  try {
    const { authenticated, payload, error } = await authenticateRequest(request)

    if (!authenticated || !payload) {
      return errorResponse('UNAUTHORIZED', error ?? 'دسترسی محدود شده', 401)
    }

    // This endpoint returns only commissions owned by payload.sub and is intentionally
    // available to sales partners and normal user referral earners.
    const canViewOwnCommissions =
      payload.roles.includes('AGENT') ||
      payload.roles.includes('USER') ||
      payload.permissions.includes('view_own_commissions')

    if (!canViewOwnCommissions) {
      return errorResponse('FORBIDDEN', 'دسترسی به گزارش پورسانت مجاز نیست.', 403)
    }

    const range = parseIsoDateRange(request)
    if ('error' in range) {
      return errorResponse('VALIDATION_ERROR', 'بازه تاریخ نامعتبر است', 400)
    }

    const sourceType = request.nextUrl.searchParams.get('sourceType')?.trim()
    if (sourceType && sourceType !== 'USER_REFERRAL' && sourceType !== 'SALES_PARTNER') {
      return errorResponse('VALIDATION_ERROR', 'نوع پورسانت نامعتبر است', 400)
    }

    const where: Prisma.CommissionWhereInput = {
      agentId: payload.sub,
      ...range.where,
      ...(sourceType === 'USER_REFERRAL' && {
        userPlan: {
          source: 'ONLINE_PAYMENT',
          referrerId: payload.sub,
        },
      }),
      ...(sourceType === 'SALES_PARTNER' && {
        OR: [
          { userPlan: { source: 'SALES_CONFIRMED' } },
          { agent: { agent: { is: { status: 'APPROVED' } } } },
        ],
      }),
    }

    const commissions = await db.commission.findMany({
      where,
      include: {
        agent: {
          select: {
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
            status: true,
            source: true,
            referrerId: true,
            startDate: true,
            endDate: true,
            plan: {
              select: {
                name: true,
                price: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const rangePendingTotal = commissions
      .filter((commission) => commission.status === 'PENDING')
      .reduce((sum, commission) => sum + commission.amount, 0)

    const rangeApprovedTotal = commissions
      .filter((commission) => commission.status === 'APPROVED')
      .reduce((sum, commission) => sum + commission.amount, 0)

    const rangePaidTotal = commissions
      .filter((commission) => commission.status === 'PAID')
      .reduce((sum, commission) => sum + commission.amount, 0)

    const rangeTotalAmount = commissions.reduce((sum, commission) => sum + commission.amount, 0)
    const walletSummary = await getWalletCommissionSummary(payload.sub)

    return successResponse({
      range: range.range,
      walletSummary,
      commissions: commissions.map(toSafeCommission),
      totals: {
        pending: rangePendingTotal,
        approved: rangeApprovedTotal,
        paid: rangePaidTotal,
        available: walletSummary.availableBalance,
        total: rangeTotalAmount,
        pendingSettlement: walletSummary.pendingSettlementAmount,
        openSettlement: walletSummary.pendingSettlementAmount,
        paidSettlement: walletSummary.paidSettlementAmount,
        minimumSettlementAmount: walletSummary.minimumSettlementAmount,
      },
      summary: {
        totalCount: commissions.length,
        pendingCount: commissions.filter((commission) => commission.status === 'PENDING').length,
        approvedCount: commissions.filter((commission) => commission.status === 'APPROVED').length,
        paidCount: commissions.filter((commission) => commission.status === 'PAID').length,
      },
    })
  } catch (err) {
    console.error('[GET /api/v1/commissions/my]', err)
    return errorResponse('INTERNAL_ERROR', 'خطای داخلی سرور', 500)
  }
}
