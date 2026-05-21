import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'

// POST /api/v1/user-plans — Purchase plan (requires auth)
export async function POST(request: NextRequest) {
  try {
    const { authenticated, payload, error } = await authenticateRequest(request)
    if (!authenticated) return errorResponse('UNAUTHORIZED', error!, 401)

    const userId = payload!.sub
    const body = await request.json()

    const schema = z.object({
      planId: z.string().min(1, 'شناسه طرح الزامی است'),
      referrerCode: z.string().optional(),
    })

    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', parsed.error.issues.map((e) => e.message).join('. '), 400)
    }

    const { planId, referrerCode } = parsed.data

    // Verify plan exists and is active
    const plan = await db.discountPlan.findUnique({ where: { id: planId } })
    if (!plan) {
      return errorResponse('NOT_FOUND', 'طرح مورد نظر یافت نشد', 404)
    }
    if (plan.status !== 'ACTIVE') {
      return errorResponse('INVALID_PLAN', 'این طرح فعال نیست', 400)
    }

    // Calculate end date
    const startDate = new Date()
    const endDate = new Date(startDate.getTime() + plan.durationDays * 24 * 60 * 60 * 1000)

    // Determine referrer
    let referrerId: string | null = null
    if (referrerCode) {
      // Find agent user by their referral code (using mobile as referrer code)
      const referrerUser = await db.user.findUnique({
        where: { mobile: referrerCode },
        include: { agent: true },
      })
      if (referrerUser && referrerUser.agent && referrerUser.agent.status === 'APPROVED' && referrerUser.id !== userId) {
        referrerId = referrerUser.id
      }
    }

    // Create UserPlan
    const userPlan = await db.userPlan.create({
      data: {
        userId,
        planId,
        referrerId,
        status: 'ACTIVE',
        startDate,
        endDate,
        remainingUses: plan.maxUses === -1 ? -1 : plan.maxUses,
      },
      include: {
        plan: true,
      },
    })

    // Create commission for referrer if applicable
    if (referrerId && plan.price > 0) {
      const commissionAmount = Math.floor(plan.price * 10 / 100)
      if (commissionAmount > 0) {
        await db.commission.create({
          data: {
            agentId: referrerId,
            userPlanId: userPlan.id,
            amount: commissionAmount,
            percent: 10,
            status: 'PENDING',
          },
        })
      }
    }

    // Create transaction record
    await db.transaction.create({
      data: {
        userId,
        type: 'PURCHASE',
        amount: plan.price,
        description: `خرید طرح ${plan.name}`,
        status: 'SUCCESS',
      },
    })

    return successResponse(userPlan, 'طرح با موفقیت خریداری شد', 201)
  } catch (err) {
    console.error('[POST /api/v1/user-plans]', err)
    return errorResponse('INTERNAL_ERROR', 'خطای داخلی سرور', 500)
  }
}

// GET /api/v1/user-plans/my — Get current user's plans (requires auth)
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
    return errorResponse('INTERNAL_ERROR', 'خطای داخلی سرور', 500)
  }
}
