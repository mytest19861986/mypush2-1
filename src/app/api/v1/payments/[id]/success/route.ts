import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { authenticateRequest, canManagePayments } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'
import { createAuditLog, AuditActions } from '@/lib/audit'
import { parsePaymentMetadata } from '@/lib/payments'
import { getClientIp } from '@/app/api/v1/auth/_helpers'
import {
  calculateCommissionAmount,
  getPlanCommissionPercent,
  type CommissionReferrerType,
} from '@/lib/commissions'

const successSchema = z.object({
  refId: z.string().max(100).optional(),
  trackingCode: z.string().max(100).optional(),
})

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000)
}

function maskNationalCode(nationalCode?: string | null) {
  if (!nationalCode) return undefined

  const trimmed = nationalCode.trim()
  if (trimmed.length <= 4) return '*'.repeat(trimmed.length)
  return `${'*'.repeat(trimmed.length - 4)}${trimmed.slice(-4)}`
}

// POST /api/v1/payments/[id]/success - Manual/dev payment success callback
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let conflictAuditContext:
    | {
        paymentId: string
        userId?: string | null
        actorId?: string
        nationalCode?: string | null
        ip?: string
        device?: string
      }
    | undefined

  try {
    const { authenticated, payload, error } = await authenticateRequest(request)
    if (!authenticated || !payload) return errorResponse('UNAUTHORIZED', error!, 401)

    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const parsed = successSchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse(
        'VALIDATION_ERROR',
        parsed.error.issues.map((issue) => issue.message).join(', '),
        400
      )
    }

    const paymentForAuth = await db.payment.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        status: true,
        user: {
          select: {
            profile: {
              select: { nationalCode: true },
            },
          },
        },
      },
    })

    if (!paymentForAuth) {
      return errorResponse('NOT_FOUND', 'Payment not found', 404)
    }
    if (paymentForAuth.status !== 'PENDING') {
      return errorResponse('INVALID_PAYMENT_STATUS', 'Payment is not pending', 400)
    }
    if (!paymentForAuth.userId) {
      return errorResponse('INVALID_PAYMENT', 'Payment is not linked to a user', 400)
    }

    const hasAdminAccess = canManagePayments(payload)
    if (!hasAdminAccess && paymentForAuth.userId !== payload.sub) {
      return errorResponse('FORBIDDEN', 'You cannot confirm another user payment', 403)
    }

    const ip = getClientIp(request)
    const device = request.headers.get('user-agent') || undefined
    conflictAuditContext = {
      paymentId: paymentForAuth.id,
      userId: paymentForAuth.userId,
      actorId: payload.sub,
      nationalCode: paymentForAuth.user?.profile?.nationalCode?.trim(),
      ip,
      device,
    }

    const result = await db.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id },
        include: {
          plan: true,
          user: {
            include: { profile: true },
          },
        },
      })

      if (!payment) throw new Error('PAYMENT_NOT_FOUND')
      if (payment.status !== 'PENDING') throw new Error('PAYMENT_NOT_PENDING')
      if (!payment.userId || !payment.user) throw new Error('PAYMENT_USER_INCOMPLETE')
      if (!payment.planId || !payment.plan) throw new Error('PAYMENT_PLAN_NOT_FOUND')
      if (!payment.user.profile?.nationalCode) throw new Error('PAYMENT_USER_INCOMPLETE')

      const existingUserPlan = await tx.userPlan.findUnique({
        where: { paymentId: payment.id },
        select: { id: true },
      })
      if (existingUserPlan) throw new Error('DUPLICATE_USER_PLAN')

      const now = new Date()
      const refId = parsed.data.refId ?? payment.refId
      const trackingCode = parsed.data.trackingCode ?? payment.trackingCode
      const paymentUpdated = await tx.payment.updateMany({
        where: {
          id: payment.id,
          status: 'PENDING',
        },
        data: {
          status: 'SUCCESS',
          paidAt: now,
          refId,
          trackingCode,
        },
      })
      if (paymentUpdated.count !== 1) throw new Error('PAYMENT_NOT_PENDING')

      const nationalCode = payment.user.profile.nationalCode.trim()
      const existingPlanHolder = await tx.planHolder.findUnique({
        where: { nationalCode },
        select: { id: true, userId: true },
      })

      let planHolderId: string
      if (existingPlanHolder) {
        if (existingPlanHolder.userId && existingPlanHolder.userId !== payment.userId) {
          throw new Error('PLAN_HOLDER_CONFLICT')
        }

        if (!existingPlanHolder.userId) {
          const linkedPlanHolder = await tx.planHolder.updateMany({
            where: {
              id: existingPlanHolder.id,
              userId: null,
            },
            data: {
              userId: payment.userId,
              firstName: payment.user.profile.firstName,
              lastName: payment.user.profile.lastName,
              mobile: payment.user.mobile,
              birthDate: payment.user.profile.birthDate,
              gender: payment.user.profile.gender,
              status: 'ACTIVE',
            },
          })

          if (linkedPlanHolder.count !== 1) {
            const currentPlanHolder = await tx.planHolder.findUnique({
              where: { id: existingPlanHolder.id },
              select: { userId: true },
            })
            if (currentPlanHolder?.userId !== payment.userId) {
              throw new Error('PLAN_HOLDER_CONFLICT')
            }
          }
        } else {
          await tx.planHolder.update({
            where: { id: existingPlanHolder.id },
            data: {
              firstName: payment.user.profile.firstName,
              lastName: payment.user.profile.lastName,
              mobile: payment.user.mobile,
              birthDate: payment.user.profile.birthDate,
              gender: payment.user.profile.gender,
              status: 'ACTIVE',
            },
          })
        }

        planHolderId = existingPlanHolder.id
      } else {
        const planHolder = await tx.planHolder.create({
          data: {
            userId: payment.userId,
            firstName: payment.user.profile.firstName,
            lastName: payment.user.profile.lastName,
            nationalCode,
            mobile: payment.user.mobile,
            birthDate: payment.user.profile.birthDate,
            gender: payment.user.profile.gender,
            status: 'ACTIVE',
          },
        })
        planHolderId = planHolder.id
      }

      const metadata = parsePaymentMetadata(payment.metadata)
      let validatedReferrer:
        | {
            id: string
            type: CommissionReferrerType
          }
        | null = null

      if (metadata.referrerId) {
        const referrer = await tx.user.findUnique({
          where: { id: metadata.referrerId },
          select: {
            id: true,
            status: true,
            agent: { select: { status: true } },
            userPlans: {
              where: {
                status: 'ACTIVE',
                endDate: { gte: now },
              },
              select: { id: true },
              take: 1,
            },
          },
        })

        if (referrer && referrer.id !== payment.userId && referrer.status === 'ACTIVE') {
          const isApprovedSalesPartner = referrer.agent?.status === 'APPROVED'
          const isEligibleUserReferral = !referrer.agent && referrer.userPlans.length > 0

          if (
            isApprovedSalesPartner &&
            (!metadata.referrerType || metadata.referrerType === 'SALES_PARTNER')
          ) {
            validatedReferrer = { id: referrer.id, type: 'SALES_PARTNER' }
          } else if (
            isEligibleUserReferral &&
            (!metadata.referrerType || metadata.referrerType === 'USER_REFERRAL')
          ) {
            validatedReferrer = { id: referrer.id, type: 'USER_REFERRAL' }
          }
        }
      }

      const userPlan = await tx.userPlan.create({
        data: {
          userId: payment.userId,
          planId: payment.planId,
          planHolderId,
          paymentId: payment.id,
          referrerId: validatedReferrer?.id ?? null,
          source: 'ONLINE_PAYMENT',
          status: 'ACTIVE',
          startDate: now,
          endDate: addDays(now, payment.plan.durationDays),
          remainingUses: payment.plan.maxUses === -1 ? -1 : payment.plan.maxUses,
          totalUses: 0,
          paymentRef: refId ?? trackingCode ?? null,
        },
      })

      let commission:
        | {
            id: string
            amount: number
            percent: number
            status: string
          }
        | null = null

      if (validatedReferrer) {
        const commissionPercent = getPlanCommissionPercent(payment.plan, validatedReferrer.type)
        const existingCommission = await tx.commission.findFirst({
          where: { userPlanId: userPlan.id },
          select: { id: true, amount: true, percent: true, status: true },
        })

        if (existingCommission) {
          commission = existingCommission
        } else if (commissionPercent) {
          commission = await tx.commission.create({
            data: {
              agentId: validatedReferrer.id,
              userPlanId: userPlan.id,
              amount: calculateCommissionAmount(payment.finalAmount, commissionPercent),
              percent: commissionPercent,
              status: 'PENDING',
            },
            select: { id: true, amount: true, percent: true, status: true },
          })
        } else {
          console.info('[payments/success] Skipped commission: plan commission percent is zero', {
            paymentId: payment.id,
            planId: payment.planId,
            referrerId: validatedReferrer.id,
            referrerType: validatedReferrer.type,
          })
        }
      }

      await tx.payment.update({
        where: { id: payment.id },
        data: { planHolderId },
      })

      await tx.auditLog.create({
        data: {
          userId: payload.sub,
          action: AuditActions.PAYMENT_SUCCESS,
          entity: 'Payment',
          entityId: payment.id,
          details: JSON.stringify({
            userId: payment.userId,
            planId: payment.planId,
            userPlanId: userPlan.id,
            amount: payment.amount,
            finalAmount: payment.finalAmount,
            referrerId: validatedReferrer?.id,
            referrerType: validatedReferrer?.type,
            commissionId: commission?.id,
          }),
          ip,
          device,
        },
      })

      await tx.auditLog.create({
        data: {
          userId: payload.sub,
          action: AuditActions.USER_PLAN_CREATED,
          entity: 'UserPlan',
          entityId: userPlan.id,
          details: JSON.stringify({
            paymentId: payment.id,
            planHolderId,
            planId: payment.planId,
            source: 'ONLINE_PAYMENT',
            referrerId: validatedReferrer?.id,
            referrerType: validatedReferrer?.type,
          }),
          ip,
          device,
        },
      })

      if (commission) {
        await tx.auditLog.create({
          data: {
            userId: payload.sub,
            action: AuditActions.COMMISSION_CREATED,
            entity: 'Commission',
            entityId: commission.id,
            details: JSON.stringify({
              agentId: validatedReferrer?.id,
              referrerType: validatedReferrer?.type,
              userPlanId: userPlan.id,
              amount: commission.amount,
              percent: commission.percent,
              status: commission.status,
            }),
            ip,
            device,
          },
        })
      }

      return {
        paymentId: payment.id,
        status: 'SUCCESS',
        userPlanId: userPlan.id,
        commissionId: commission?.id,
        plan: {
          id: payment.plan.id,
          title: payment.plan.name,
        },
        startDate: userPlan.startDate.toISOString(),
        endDate: userPlan.endDate.toISOString(),
      }
    })

    return successResponse(result, 'Payment confirmed successfully')
  } catch (err) {
    const message = (err as Error).message

    if (message === 'PAYMENT_NOT_FOUND') {
      return errorResponse('NOT_FOUND', 'Payment not found', 404)
    }
    if (message === 'PAYMENT_NOT_PENDING') {
      return errorResponse('INVALID_PAYMENT_STATUS', 'Payment is not pending', 400)
    }
    if (message === 'PAYMENT_USER_INCOMPLETE') {
      return errorResponse('PROFILE_INCOMPLETE', 'Payment user profile is incomplete', 400)
    }
    if (message === 'PAYMENT_PLAN_NOT_FOUND') {
      return errorResponse('NOT_FOUND', 'Payment plan not found', 404)
    }
    if (message === 'PLAN_HOLDER_CONFLICT') {
      if (conflictAuditContext) {
        createAuditLog({
          userId: conflictAuditContext.actorId,
          action: AuditActions.PAYMENT_CONFLICT,
          entity: 'Payment',
          entityId: conflictAuditContext.paymentId,
          details: {
            paymentId: conflictAuditContext.paymentId,
            userId: conflictAuditContext.userId,
            nationalCode: maskNationalCode(conflictAuditContext.nationalCode),
            reason: 'PLAN_HOLDER_CONFLICT',
            paymentStatus: 'PENDING',
            requiresAdminAction: true,
          },
          ip: conflictAuditContext.ip,
          device: conflictAuditContext.device,
        }).catch(console.error)
      }

      return errorResponse('PLAN_HOLDER_LINK_CONFLICT', 'This national code is already linked to another user', 409)
    }
    if (message === 'DUPLICATE_USER_PLAN') {
      return errorResponse('DUPLICATE_USER_PLAN', 'A user plan already exists for this payment', 409)
    }

    console.error('[POST /api/v1/payments/[id]/success]', err)
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500)
  }
}
