import { NextRequest } from 'next/server'
import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { requirePermission } from '@/lib/auth'
import { errorResponse, successResponse } from '@/lib/api-response'
import { getCommissionAvailability } from '@/lib/commission-settlements'
import { generateReferralCode } from '@/lib/referrals'

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

function getReferralCode(userId: string, canRefer: boolean) {
  if (!canRefer) return null

  try {
    return generateReferralCode(userId)
  } catch {
    return null
  }
}

// GET /api/v1/admin/users/[id]/profile-summary?from=YYYY-MM-DD&to=YYYY-MM-DD
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, payload, error } = await requirePermission(request, 'manage_users')
    if (!authorized) {
      return errorResponse('FORBIDDEN', error!, payload ? 403 : 401)
    }

    const { id } = await params
    if (!isSafeId(id)) {
      return errorResponse('VALIDATION_ERROR', 'Invalid user id', 400)
    }

    const range = parseDateRange(request)
    if (!range.ok) {
      return errorResponse('VALIDATION_ERROR', range.message, 400)
    }

    const user = await db.user.findFirst({
      where: {
        id,
        deletedAt: null,
        doctor: { is: null },
        agent: { is: null },
        roles: {
          some: {
            role: { name: 'USER' },
          },
        },
      },
      select: {
        id: true,
        mobile: true,
        status: true,
        isMobileVerified: true,
        createdAt: true,
        profile: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        roles: {
          select: {
            role: {
              select: {
                name: true,
                title: true,
              },
            },
          },
        },
      },
    })

    if (!user) {
      return errorResponse('NOT_FOUND', 'User not found', 404)
    }

    const targetUserId = user.id
    const now = new Date()
    const rangeCreatedAt = dateFilter(range.fromDate, range.toDate)
    const referralCommissionWhere: Prisma.CommissionWhereInput = {
      agentId: targetUserId,
      userPlan: {
        source: 'ONLINE_PAYMENT',
        referrerId: targetUserId,
      },
    }

    const [
      activeSubscription,
      purchasedPlansCount,
      purchases,
      successfulPaymentsTotal,
      totalVisitsCount,
      recentVisits,
      referredUsers,
      successfulReferralPurchases,
      commissions,
      commissionRecords,
      settlementRecords,
      availability,
    ] = await Promise.all([
      db.userPlan.findFirst({
        where: {
          userId: targetUserId,
          status: 'ACTIVE',
          endDate: { gte: now },
        },
        orderBy: { endDate: 'desc' },
        select: {
          status: true,
          startDate: true,
          endDate: true,
          remainingUses: true,
          totalUses: true,
          plan: {
            select: {
              name: true,
              price: true,
            },
          },
          payment: {
            select: {
              status: true,
              finalAmount: true,
              paidAt: true,
            },
          },
        },
      }),
      db.userPlan.count({
        where: { userId: targetUserId },
      }),
      db.userPlan.findMany({
        where: { userId: targetUserId },
        orderBy: { createdAt: 'desc' },
        take: 25,
        select: {
          status: true,
          startDate: true,
          endDate: true,
          remainingUses: true,
          totalUses: true,
          createdAt: true,
          plan: {
            select: {
              name: true,
              price: true,
            },
          },
          payment: {
            select: {
              status: true,
              finalAmount: true,
              paidAt: true,
            },
          },
        },
      }),
      db.payment.aggregate({
        where: {
          userId: targetUserId,
          status: 'SUCCESS',
        },
        _sum: {
          finalAmount: true,
        },
      }),
      db.visit.count({
        where: { userId: targetUserId },
      }),
      db.visit.findMany({
        where: {
          userId: targetUserId,
          createdAt: rangeCreatedAt,
        },
        orderBy: { createdAt: 'desc' },
        take: 15,
        select: {
          status: true,
          visitedAt: true,
          confirmedAt: true,
          completedAt: true,
          createdAt: true,
          doctor: {
            select: {
              specialty: true,
              clinicName: true,
              user: {
                select: {
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
      db.userPlan.groupBy({
        by: ['userId'],
        where: {
          referrerId: targetUserId,
          source: 'ONLINE_PAYMENT',
          userId: { not: null },
        },
      }),
      db.userPlan.count({
        where: {
          referrerId: targetUserId,
          source: 'ONLINE_PAYMENT',
          payment: {
            is: {
              status: 'SUCCESS',
            },
          },
        },
      }),
      db.commission.findMany({
        where: {
          ...referralCommissionWhere,
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
          ...referralCommissionWhere,
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
              startDate: true,
              endDate: true,
              payment: {
                select: {
                  status: true,
                },
              },
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
        take: 25,
      }),
      db.settlement.findMany({
        where: {
          userId: targetUserId,
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
      getCommissionAvailability(targetUserId),
    ])

    const activeCommissions = commissions.filter((commission) => commission.status !== 'CANCELLED')
    const pendingCommissions = commissions.filter((commission) => commission.status === 'PENDING')
    const approvedCommissions = commissions.filter((commission) => commission.status === 'APPROVED')
    const paidCommissions = commissions.filter((commission) => commission.status === 'PAID')
    const canRefer = Boolean(activeSubscription)
    const referralCode = getReferralCode(targetUserId, canRefer)

    return successResponse({
      range: {
        from: range.from,
        to: range.to,
      },
      user: {
        mobile: user.mobile,
        status: user.status,
        isMobileVerified: user.isMobileVerified,
        createdAt: user.createdAt.toISOString(),
        profile: user.profile,
        roles: user.roles.map((userRole) => ({
          name: userRole.role.name,
          title: userRole.role.title,
        })),
      },
      subscription: {
        activeSubscription: activeSubscription
          ? {
              planName: activeSubscription.plan.name,
              status: activeSubscription.status,
              startDate: activeSubscription.startDate.toISOString(),
              endDate: activeSubscription.endDate.toISOString(),
              remainingUses: activeSubscription.remainingUses,
              totalUses: activeSubscription.totalUses,
              paymentStatus: activeSubscription.payment?.status ?? null,
              amount: activeSubscription.payment?.finalAmount ?? activeSubscription.plan.price,
              paidAt: activeSubscription.payment?.paidAt?.toISOString() ?? null,
            }
          : null,
        purchasedPlansCount,
        totalPurchaseAmount: successfulPaymentsTotal._sum.finalAmount ?? 0,
        purchases: purchases.map((purchase, index) => ({
          key: `purchase-${index + 1}`,
          planName: purchase.plan.name,
          status: purchase.status,
          startDate: purchase.startDate.toISOString(),
          endDate: purchase.endDate.toISOString(),
          remainingUses: purchase.remainingUses,
          totalUses: purchase.totalUses,
          paymentStatus: purchase.payment?.status ?? null,
          amount: purchase.payment?.finalAmount ?? purchase.plan.price,
          paidAt: purchase.payment?.paidAt?.toISOString() ?? null,
          createdAt: purchase.createdAt.toISOString(),
        })),
      },
      visits: {
        totalVisitsCount,
        recentVisits: recentVisits.map((visit, index) => ({
          key: `visit-${index + 1}`,
          status: visit.status,
          visitedAt: visit.visitedAt?.toISOString() ?? null,
          confirmedAt: visit.confirmedAt?.toISOString() ?? null,
          completedAt: visit.completedAt?.toISOString() ?? null,
          createdAt: visit.createdAt.toISOString(),
          doctor: {
            firstName: visit.doctor.user.profile?.firstName ?? null,
            lastName: visit.doctor.user.profile?.lastName ?? null,
            specialty: visit.doctor.specialty,
            clinicName: visit.doctor.clinicName,
          },
        })),
      },
      referral: {
        referralCode,
        referralLink: referralCode
          ? `${request.nextUrl.origin}/auth/login?ref=${encodeURIComponent(referralCode)}`
          : null,
        totalReferredUsers: referredUsers.length,
        successfulPurchasesFromReferrals: successfulReferralPurchases,
        commissionStats: {
          totalReferralCommissionAmount: sumAmount(activeCommissions),
          pendingReferralCommissionAmount: sumAmount(pendingCommissions),
          approvedReferralCommissionAmount: sumAmount(approvedCommissions),
          approvedWithdrawableReferralCommissionAmount: availability.availableBalance,
          paidReferralCommissionAmount: sumAmount(paidCommissions),
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
          userPlan: {
            status: commission.userPlan.status,
            startDate: commission.userPlan.startDate.toISOString(),
            endDate: commission.userPlan.endDate.toISOString(),
            paymentStatus: commission.userPlan.payment?.status ?? null,
          },
        })),
        settlementRecords: settlementRecords.map((settlement, index) => ({
          key: `settlement-${index + 1}`,
          amount: settlement.amount,
          status: settlement.status,
          requestedAt: settlement.requestedAt.toISOString(),
          settledAt: settlement.settledAt?.toISOString() ?? null,
          createdAt: settlement.createdAt.toISOString(),
        })),
      },
      rules: {
        withdrawable:
          'Approved commissions minus pending, approved, and paid settlements. Pending commissions are not withdrawable. Settlement requests do not auto-pay.',
      },
    })
  } catch (err) {
    console.error('[GET /api/v1/admin/users/[id]/profile-summary]', err)
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500)
  }
}
