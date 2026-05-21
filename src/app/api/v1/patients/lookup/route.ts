import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'

// GET /api/v1/patients/lookup?nationalCode=... — Lookup patient by national code
export async function GET(request: NextRequest) {
  const { authenticated, payload, error } = await authenticateRequest(request)
  if (!authenticated) return errorResponse('UNAUTHORIZED', error!, 401)

  // Check user has DOCTOR role
  if (!payload!.roles.includes('DOCTOR')) {
    return errorResponse('FORBIDDEN', 'DOCTOR role required', 403)
  }

  const { searchParams } = new URL(request.url)
  const nationalCode = searchParams.get('nationalCode')

  if (!nationalCode || nationalCode.length !== 10 || !/^\d{10}$/.test(nationalCode)) {
    return errorResponse('VALIDATION_ERROR', 'Valid 10-digit national code is required', 400)
  }

  // Find user profile by national code
  const profile = await db.userProfile.findUnique({
    where: { nationalCode },
    include: {
      user: {
        select: {
          id: true,
          mobile: true,
          status: true,
        },
      },
    },
  })

  if (!profile || !profile.user || profile.user.status !== 'ACTIVE') {
    return errorResponse('NOT_FOUND', 'Patient not found', 404)
  }

  // Get active user plans
  const userPlans = await db.userPlan.findMany({
    where: {
      userId: profile.userId,
      status: 'ACTIVE',
      endDate: { gte: new Date() },
    },
    include: {
      plan: {
        select: {
          name: true,
          discountPercent: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Return response matching PatientLookupResult type expected by frontend
  return successResponse({
    id: profile.user.id,
    mobile: profile.user.mobile,
    profile: {
      firstName: profile.firstName,
      lastName: profile.lastName,
      nationalCode: profile.nationalCode,
      avatar: profile.avatar,
      birthDate: profile.birthDate?.toISOString() ?? null,
      gender: profile.gender,
      address: profile.address,
    },
    activePlans: userPlans.map((up) => ({
      id: up.id,
      planId: up.planId,
      userId: up.userId,
      referrerId: up.referrerId,
      status: up.status,
      startDate: up.startDate.toISOString(),
      endDate: up.endDate.toISOString(),
      remainingUses: up.remainingUses,
      totalUses: up.totalUses,
      paymentRef: up.paymentRef,
      createdAt: up.createdAt.toISOString(),
      plan: {
        id: up.planId,
        name: up.plan.name,
        description: null,
        discountPercent: up.plan.discountPercent,
        durationDays: 0,
        maxUses: 0,
        features: null,
      },
    })),
  }, 'Patient found')
}
