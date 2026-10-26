import { parseReportDateRange, type ReportDateFilter } from '@/utils/report-date-range'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'

interface MonthlyBreakdown {
  yearMonth: string // YYYY-MM
  earnedCommission: number
  paidCommission: number
  referralCount: number
}

// GET /api/v1/agents/[id]/performance — Individual Sales Partner Financial Performance Report
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, payload, error } = await requirePermission(request, 'manage_agents')
    if (!authorized) return errorResponse(payload ? 'FORBIDDEN' : 'UNAUTHORIZED', error!, payload ? 403 : 401)

    const { id } = await params
    if (!id || typeof id !== 'string') {
      return errorResponse('VALIDATION_ERROR', 'شناسه همکار فروش نامعتبر است.', 400)
    }

    const agent = await db.agent.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
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
    })

    if (!agent) {
      return errorResponse('NOT_FOUND', 'همکار فروش مورد نظر یافت نشد.', 404)
    }

    const { searchParams } = new URL(request.url)
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')

    let createdAtFilter: ReportDateFilter
    try {
      createdAtFilter = parseReportDateRange(startDateParam, endDateParam)
    } catch (error) {
      return errorResponse('VALIDATION_ERROR', error instanceof Error ? error.message : 'تاریخ نامعتبر است.', 400)
    }

    const startDateTime = createdAtFilter.gte
    const endDateTime = createdAtFilter.lt ? new Date(createdAtFilter.lt.getTime() - 1) : createdAtFilter.lte
    const hasDateFilter = Object.keys(createdAtFilter).length > 0

    // Fetch attributed sales/referrals, commissions, and settlements
    const [salesCustomers, referredPlans, commissions, settlements] = await Promise.all([
      db.salesCustomer.findMany({
        where: {
          salesPartnerId: agent.userId,
          ...(hasDateFilter && { createdAt: createdAtFilter }),
        },
        select: {
          id: true,
          status: true,
          createdAt: true,
        },
      }),
      db.userPlan.findMany({
        where: {
          referrerId: agent.userId,
          ...(hasDateFilter && { createdAt: createdAtFilter }),
        },
        select: {
          id: true,
          status: true,
          createdAt: true,
        },
      }),
      db.commission.findMany({
        where: {
          agentId: agent.userId,
          ...(hasDateFilter && { createdAt: createdAtFilter }),
        },
        select: {
          id: true,
          amount: true,
          status: true,
          createdAt: true,
          paidAt: true,
        },
      }),
      db.settlement.findMany({
        where: {
          userId: agent.userId,
          ...(hasDateFilter && { createdAt: createdAtFilter }),
        },
        select: {
          id: true,
          amount: true,
          status: true,
          createdAt: true,
          settledAt: true,
        },
      }),
    ])

    // Total attributed referrals count
    const totalAttributedSales = salesCustomers.length + referredPlans.length

    // Earned commission: APPROVED and PAID commissions
    const earnedCommissionsList = commissions.filter((c) => c.status === 'APPROVED' || c.status === 'PAID')
    const totalEarnedCommission = earnedCommissionsList.reduce((sum, c) => sum + (c.amount || 0), 0)

    // Paid commission: only settlements with status 'PAID' (or commissions with status 'PAID')
    const paidSettlementsList = settlements.filter((s) => s.status === 'PAID')
    const totalPaidCommission = paidSettlementsList.reduce((sum, s) => sum + (s.amount || 0), 0)

    // Unpaid balance: earned minus paid (clamped to 0)
    const unpaidBalance = Math.max(0, totalEarnedCommission - totalPaidCommission)

    // Pending commission (not yet approved)
    const pendingCommissionsList = commissions.filter((c) => c.status === 'PENDING')
    const totalPendingCommission = pendingCommissionsList.reduce((sum, c) => sum + (c.amount || 0), 0)

    // Monthly Earnings Chart Construction:
    // Determine the boundary months for the range
    const effectiveStart = startDateTime || (commissions.length > 0 
      ? new Date(Math.min(...commissions.map((c) => c.createdAt.getTime())))
      : new Date(Date.now() - 180 * 24 * 60 * 60 * 1000))
    const effectiveEnd = endDateTime || new Date()

    const monthlyMap = new Map<string, MonthlyBreakdown>()

    // Generate every month in the range so zero-earning months are explicitly present
    const cur = new Date(effectiveStart.getFullYear(), effectiveStart.getMonth(), 1)
    const endMonth = new Date(effectiveEnd.getFullYear(), effectiveEnd.getMonth(), 1)

    while (cur <= endMonth) {
      const yearMonth = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`
      monthlyMap.set(yearMonth, {
        yearMonth,
        earnedCommission: 0,
        paidCommission: 0,
        referralCount: 0,
      })
      cur.setMonth(cur.getMonth() + 1)
    }

    // Populate earned commissions into months
    for (const c of earnedCommissionsList) {
      const ym = `${c.createdAt.getFullYear()}-${String(c.createdAt.getMonth() + 1).padStart(2, '0')}`
      const entry = monthlyMap.get(ym)
      if (entry) {
        entry.earnedCommission += c.amount || 0
      }
    }

    // Populate paid settlements into months
    for (const s of paidSettlementsList) {
      const dateToUse = s.settledAt || s.createdAt
      const ym = `${dateToUse.getFullYear()}-${String(dateToUse.getMonth() + 1).padStart(2, '0')}`
      const entry = monthlyMap.get(ym)
      if (entry) {
        entry.paidCommission += s.amount || 0
      }
    }

    // Populate referrals into months
    for (const sc of salesCustomers) {
      const ym = `${sc.createdAt.getFullYear()}-${String(sc.createdAt.getMonth() + 1).padStart(2, '0')}`
      const entry = monthlyMap.get(ym)
      if (entry) {
        entry.referralCount += 1
      }
    }
    for (const rp of referredPlans) {
      const ym = `${rp.createdAt.getFullYear()}-${String(rp.createdAt.getMonth() + 1).padStart(2, '0')}`
      const entry = monthlyMap.get(ym)
      if (entry) {
        entry.referralCount += 1
      }
    }

    const monthlyBreakdown = Array.from(monthlyMap.values()).sort((a, b) => a.yearMonth.localeCompare(b.yearMonth))

    const agentName = [
      agent.user?.profile?.firstName,
      agent.user?.profile?.lastName,
    ]
      .filter(Boolean)
      .join(' ')
      .trim() || agent.businessName || 'همکار فروش'

    return successResponse({
      agent: {
        id: agent.id,
        name: agentName,
        businessName: agent.businessName,
        mobile: agent.user?.mobile,
      },
      period: {
        startDate: startDateTime ? startDateTime.toISOString() : null,
        endDate: endDateTime ? endDateTime.toISOString() : null,
      },
      metrics: {
        totalAttributedSales,
        totalEarnedCommission,
        totalPaidCommission,
        unpaidBalance,
        totalPendingCommission,
        commissionCount: commissions.length,
        settlementCount: settlements.length,
      },
      definitions: {
        totalAttributedSales: 'تعداد کل فروش‌ها و فعال‌سازی‌های منتسب به همکار',
        totalEarnedCommission: 'مجموع مبالغ پورسانت‌های تایید یا تسویه‌شده',
        totalPaidCommission: 'مجموع مبالغ تسویه‌های بانکی واریز شده (PAID)',
        unpaidBalance: 'مانده پورسانت تاییدشده تسویه‌نشده (طلب همکار فروش)',
        totalPendingCommission: 'مبالغ پورسانت‌های در انتظار تایید مدیریتی',
      },
      monthlyBreakdown,
    })
  } catch (err) {
    console.error('[GET /api/v1/agents/[id]/performance]', err)
    return errorResponse('INTERNAL_ERROR', 'خطای داخلی هنگام دریافت گزارش عملکرد همکار فروش.', 500)
  }
}
