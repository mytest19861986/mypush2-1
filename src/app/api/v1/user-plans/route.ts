import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'
import { createAuditLog, AuditActions } from '@/lib/audit'
import { createPendingPayment } from '@/lib/payments'
import { getClientIp } from '@/app/api/v1/auth/_helpers'

// POST /api/v1/user-plans - Start online plan purchase (requires auth)
export async function POST(request: NextRequest) {
  try {
    const { authenticated, payload, error } = await authenticateRequest(request)
    if (!authenticated) return errorResponse('UNAUTHORIZED', error!, 401)

    const userId = payload!.sub
    const body = await request.json()

    const schema = z.object({
      planId: z.string().min(1, 'Plan id is required'),
      referralCode: z.string().trim().max(20).optional(),
      referrerCode: z.string().trim().max(20).optional(),
    })

    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return errorResponse(
        'VALIDATION_ERROR',
        parsed.error.issues.map((e) => e.message).join('. '),
        400
      )
    }

    const { planId } = parsed.data
    const referralCode = parsed.data.referralCode ?? parsed.data.referrerCode

    const plan = await db.discountPlan.findUnique({ where: { id: planId } })
    if (!plan) {
      return errorResponse('NOT_FOUND', 'Plan not found', 404)
    }
    if (plan.status !== 'ACTIVE') {
      return errorResponse('INVALID_PLAN', 'Plan is not active', 400)
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    })
    if (!user?.profile?.nationalCode) {
      return errorResponse(
        'PROFILE_INCOMPLETE',
        'Profile national code is required before purchasing a plan',
        400
      )
    }

    let referrerId: string | null = null
    if (referralCode) {
      const referrerUser = await db.user.findUnique({
        where: { mobile: referralCode },
        include: { agent: true },
      })

      if (
        referrerUser &&
        referrerUser.agent &&
        referrerUser.agent.status === 'APPROVED' &&
        referrerUser.id !== userId
      ) {
        referrerId = referrerUser.id
      }
    }

    const payment = await createPendingPayment({
      userId,
      planId,
      amount: plan.price,
      discountAmount: 0,
      gateway: 'MANUAL_DEV',
      metadata: {
        ...(referralCode ? { referralCode } : {}),
        ...(referrerId ? { referrerId } : {}),
      },
    })

    createAuditLog({
      userId,
      action: AuditActions.PAYMENT_CREATED,
      entity: 'Payment',
      entityId: payment.id,
      details: {
        planId,
        amount: payment.amount,
        discountAmount: payment.discountAmount,
        finalAmount: payment.finalAmount,
        status: payment.status,
      },
      ip: getClientIp(request),
      device: request.headers.get('user-agent') || undefined,
    }).catch(console.error)

    return successResponse(
      {
        paymentId: payment.id,
        status: payment.status,
        payment: {
          id: payment.id,
          status: payment.status,
          amount: payment.amount,
          discountAmount: payment.discountAmount,
          finalAmount: payment.finalAmount,
          gateway: payment.gateway,
          createdAt: payment.createdAt.toISOString(),
        },
        plan: {
          id: plan.id,
          name: plan.name,
          price: plan.price,
          durationDays: plan.durationDays,
          maxUses: plan.maxUses,
        },
        userPlan: null,
      },
      'Payment created and pending confirmation',
      201
    )
  } catch (err) {
    console.error('[POST /api/v1/user-plans]', err)
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500)
  }
}

// GET /api/v1/user-plans/my - Get current user's plans (requires auth)
export async function GET(request: NextRequest) {
  try {
    const { authenticated, payload, error } = await authenticateRequest(request)
    if (!authenticated) return errorResponse('UNAUTHORIZED', error!, 401)

    const userId = payload!.sub

    const userPlans = await db.userPlan.findMany({
      where: { userId },
      include: {
        plan: true,
        referrer: {
          select: {
            id: true,
            profile: { select: { firstName: true, lastName: true } },
            agent: { select: { businessName: true } },
          },
        },
        _count: {
          select: { contracts: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return successResponse(userPlans)
  } catch (err) {
    console.error('[GET /api/v1/user-plans/my]', err)
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500)
  }
}
