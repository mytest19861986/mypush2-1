import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'

const dateParamSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must use YYYY-MM-DD format')

const querySchema = z.object({
  from: dateParamSchema.optional(),
  to: dateParamSchema.optional(),
})

type ChannelKey = 'direct' | 'sales_partner' | 'referral' | 'unknown_online'

interface ChannelMetric {
  key: ChannelKey
  label: string
  amount: number
  count: number
}

interface TimeBucket {
  date: string
  amount: number
  count: number
}

function isAdmin(payload: { roles: string[] }) {
  return payload.roles.includes('SUPER_ADMIN') || payload.roles.includes('ADMIN')
}

function toStartOfDay(value: string) {
  return new Date(`${value}T00:00:00.000Z`)
}

function toEndOfDay(value: string) {
  return new Date(`${value}T23:59:59.999Z`)
}

function toInputDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function getDefaultRange() {
  const to = new Date()
  const from = new Date()
  from.setDate(to.getDate() - 30)

  return {
    from: toInputDate(from),
    to: toInputDate(to),
  }
}

function getDateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

function addToBucket(buckets: Map<string, TimeBucket>, date: Date, amount: number) {
  const key = getDateKey(date)
  const current = buckets.get(key) ?? { date: key, amount: 0, count: 0 }

  current.amount += amount
  current.count += 1
  buckets.set(key, current)
}

function addToChannel(
  channels: Record<ChannelKey, ChannelMetric>,
  key: ChannelKey,
  amount: number
) {
  channels[key].amount += amount
  channels[key].count += 1
}

function getOnlineChannel(userPlan?: { source: string; referrerId: string | null } | null): ChannelKey {
  if (!userPlan || userPlan.source !== 'ONLINE_PAYMENT') return 'unknown_online'
  return userPlan.referrerId ? 'referral' : 'direct'
}

// GET /api/v1/admin/financial-reports?from=YYYY-MM-DD&to=YYYY-MM-DD
export async function GET(request: NextRequest) {
  try {
    const { authenticated, payload, error } = await authenticateRequest(request)
    if (!authenticated || !payload) return errorResponse('UNAUTHORIZED', error!, 401)
    if (!isAdmin(payload)) return errorResponse('FORBIDDEN', 'Admin role required', 403)

    const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams))
    if (!parsed.success) {
      return errorResponse(
        'VALIDATION_ERROR',
        parsed.error.issues.map((issue) => issue.message).join('. '),
        400
      )
    }

    const defaults = getDefaultRange()
    const fromParam = parsed.data.from ?? defaults.from
    const toParam = parsed.data.to ?? defaults.to
    const fromDate = toStartOfDay(fromParam)
    const toDate = toEndOfDay(toParam)

    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      return errorResponse('VALIDATION_ERROR', 'Invalid date range', 400)
    }

    if (fromDate.getTime() > toDate.getTime()) {
      return errorResponse('VALIDATION_ERROR', 'from must be before or equal to to', 400)
    }

    const [successfulPayments, confirmedSalesCustomers, commissions] = await Promise.all([
      db.payment.findMany({
        where: {
          status: 'SUCCESS',
          paidAt: {
            gte: fromDate,
            lte: toDate,
          },
        },
        select: {
          finalAmount: true,
          paidAt: true,
          userId: true,
          userPlan: {
            select: {
              source: true,
              referrerId: true,
            },
          },
        },
      }),
      db.salesCustomer.findMany({
        where: {
          status: 'CONFIRMED',
          confirmedAt: {
            gte: fromDate,
            lte: toDate,
          },
        },
        select: {
          confirmedAt: true,
          plan: {
            select: {
              price: true,
            },
          },
          userPlan: {
            select: {
              userId: true,
            },
          },
        },
      }),
      db.commission.findMany({
        where: {
          status: { not: 'CANCELLED' },
          OR: [
            {
              userPlan: {
                payment: {
                  is: {
                    status: 'SUCCESS',
                    paidAt: {
                      gte: fromDate,
                      lte: toDate,
                    },
                  },
                },
              },
            },
            {
              userPlan: {
                salesCustomer: {
                  is: {
                    status: 'CONFIRMED',
                    confirmedAt: {
                      gte: fromDate,
                      lte: toDate,
                    },
                  },
                },
              },
            },
          ],
        },
        select: {
          amount: true,
        },
      }),
    ])

    const channels: Record<ChannelKey, ChannelMetric> = {
      direct: { key: 'direct', label: 'خرید مستقیم آنلاین', amount: 0, count: 0 },
      sales_partner: { key: 'sales_partner', label: 'فروش تلفنی/همکار فروش', amount: 0, count: 0 },
      referral: { key: 'referral', label: 'معرفی/رفرال', amount: 0, count: 0 },
      unknown_online: { key: 'unknown_online', label: 'آنلاین بدون انتساب کافی', amount: 0, count: 0 },
    }
    const dailyBuckets = new Map<string, TimeBucket>()
    const paidUserIds = new Set<string>()

    for (const payment of successfulPayments) {
      const amount = payment.finalAmount
      const channel = getOnlineChannel(payment.userPlan)

      addToChannel(channels, channel, amount)
      if (payment.paidAt) addToBucket(dailyBuckets, payment.paidAt, amount)
      if (payment.userId) paidUserIds.add(payment.userId)
    }

    for (const salesCustomer of confirmedSalesCustomers) {
      const amount = salesCustomer.plan.price

      addToChannel(channels, 'sales_partner', amount)
      if (salesCustomer.confirmedAt) addToBucket(dailyBuckets, salesCustomer.confirmedAt, amount)
      if (salesCustomer.userPlan?.userId) paidUserIds.add(salesCustomer.userPlan.userId)
    }

    const totalCommissions = commissions.reduce((total, commission) => total + commission.amount, 0)
    const directRevenue = channels.direct.amount
    const salesPartnerRevenue = channels.sales_partner.amount
    const referralRevenue = channels.referral.amount
    const grossRevenue =
      directRevenue + salesPartnerRevenue + referralRevenue + channels.unknown_online.amount
    const netRevenue = grossRevenue - totalCommissions
    const channelBreakdown = Object.values(channels).filter(
      (channel) => channel.count > 0 || channel.key !== 'unknown_online'
    )
    const dailyRevenue = Array.from(dailyBuckets.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    )

    return successResponse({
      range: {
        from: fromParam,
        to: toParam,
      },
      totalSuccessfulPayments: successfulPayments.length + confirmedSalesCustomers.length,
      paidUsersCount: paidUserIds.size,
      grossRevenue,
      directRevenue,
      salesPartnerRevenue,
      referralRevenue,
      totalCommissions,
      netRevenue,
      channelBreakdown,
      dailyRevenue,
      unsupportedMetrics: successfulPayments.some((payment) => !payment.userPlan)
        ? ['Some successful online payments are missing a linked UserPlan, so they are shown as unattributed online revenue.']
        : [],
      amountSources: {
        onlinePayments: 'Payment.finalAmount where Payment.status = SUCCESS and paidAt is in range',
        salesPartner: 'DiscountPlan.price for SalesCustomer.status = CONFIRMED and confirmedAt is in range',
        commissions: 'Commission.amount linked to in-range successful/confirmed purchases, excluding CANCELLED commissions',
      },
    })
  } catch (err) {
    console.error('[GET /api/v1/admin/financial-reports]', err)
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500)
  }
}
