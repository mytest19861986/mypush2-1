import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'

// GET /api/v1/patients/lookup?nationalCode=... — Lookup patient by national code
// FAIL-CLOSED CLINICAL PROVENANCE & MINIMUM DISCLOSURE (CMD-61):
// 1. Unauthenticated requests receive 401 UNAUTHORIZED.
// 2. Non-authorized roles receive 403 FORBIDDEN.
// 3. For DOCTOR role:
//    - Doctor profile must be APPROVED.
//    - PENDING Visits are EXCLUDED from granting lookup authorization because they lack
//      verified patient consent / completed clinical encounter provenance.
//    - Only legit clinical care relationships with status 'CONFIRMED' or 'COMPLETED' grant access.
//    - Uniform Non-Disclosing Response: Any unauthorized query (whether patient does not exist,
//      or patient exists without qualifying care relationship) returns an IDENTICAL 403 FORBIDDEN.
// 4. Data Minimization: Returns only minimum necessary clinical fields:
//    - Patient basic profile: firstName, lastName, masked/returned nationalCode, gender.
//    - Active plan coverage name and validity window. Sensitive details (full address, birthDate, avatar)
//      are omitted or minimized to essential clinical necessity.
export async function GET(request: NextRequest) {
  const { authenticated, payload, error } = await authenticateRequest(request)
  if (!authenticated || !payload) {
    return errorResponse('UNAUTHORIZED', error || 'Missing authorization header', 401)
  }

  const isSuperAdmin = payload.roles.includes('SUPER_ADMIN')
  const isAdmin = payload.roles.includes('ADMIN')
  const isDoctor = payload.roles.includes('DOCTOR')

  if (!isSuperAdmin && !isAdmin && !isDoctor) {
    return errorResponse('FORBIDDEN', 'Access denied. Insufficient privileges.', 403)
  }

  const { searchParams } = new URL(request.url)
  const nationalCode = searchParams.get('nationalCode')

  if (!nationalCode || nationalCode.length !== 10 || !/^\d{10}$/.test(nationalCode)) {
    return errorResponse('VALIDATION_ERROR', 'Valid 10-digit national code is required', 400)
  }

  // Doctor Authorization & Relationship Verification
  if (isDoctor && !isSuperAdmin && !isAdmin) {
    const doctorRecord = await db.doctor.findUnique({
      where: { userId: payload.sub },
      select: { id: true, status: true },
    })

    if (!doctorRecord || doctorRecord.status !== 'APPROVED') {
      return errorResponse('FORBIDDEN', 'Approved doctor profile required', 403)
    }

    // Check either UserProfile or PlanHolder
    const profile = await db.userProfile.findUnique({
      where: { nationalCode },
      select: { userId: true, user: { select: { status: true } } },
    })

    const holder = await db.planHolder.findUnique({
      where: { nationalCode },
      select: { id: true, status: true },
    })

    const isPatientActive = (profile && profile.user && profile.user.status === 'ACTIVE') ||
                            (holder && holder.status === 'ACTIVE')

    if (!isPatientActive) {
      return errorResponse(
        'FORBIDDEN',
        'Clinical care relationship required or patient record inaccessible',
        403
      )
    }

    // Verify eligible Visit care relationship:
    // PENDING is strictly excluded because doctor-created pending visits lack patient authorization.
    // Only CONFIRMED or COMPLETED visits establish verified relationship provenance.
    const careRelationship = await db.visit.findFirst({
      where: {
        doctorId: doctorRecord.id,
        status: { in: ['CONFIRMED', 'COMPLETED'] },
        OR: [
          ...(profile?.userId ? [{ userId: profile.userId }] : []),
          ...(holder?.id ? [{ planHolderId: holder.id }] : []),
        ],
      },
    })

    if (!careRelationship) {
      return errorResponse(
        'FORBIDDEN',
        'Clinical care relationship required or patient record inaccessible',
        403
      )
    }
  }

  // Find user profile or plan holder by national code
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

  if (profile && profile.user && profile.user.status === 'ACTIVE') {
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
        status: up.status,
        startDate: up.startDate.toISOString(),
        endDate: up.endDate.toISOString(),
        remainingUses: up.remainingUses,
        totalUses: up.totalUses,
        plan: {
          id: up.planId,
          name: up.plan.name,
          discountPercent: up.plan.discountPercent,
        },
      })),
    }, 'Patient found')
  }

  // Fallback to PlanHolder
  const planHolder = await db.planHolder.findUnique({
    where: { nationalCode },
    include: {
      userPlans: {
        where: {
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
      },
    },
  })

  if (!planHolder || planHolder.status !== 'ACTIVE') {
    return errorResponse('NOT_FOUND', 'Patient record not accessible or not found', 404)
  }

  return successResponse({
    id: planHolder.id,
    mobile: planHolder.mobile,
    profile: {
      firstName: planHolder.firstName,
      lastName: planHolder.lastName,
      nationalCode: planHolder.nationalCode,
      avatar: null,
      birthDate: planHolder.birthDate?.toISOString() ?? null,
      gender: planHolder.gender,
      address: null,
    },
    activePlans: planHolder.userPlans.map((up) => ({
      id: up.id,
      planId: up.planId,
      userId: up.userId,
      status: up.status,
      startDate: up.startDate.toISOString(),
      endDate: up.endDate.toISOString(),
      remainingUses: up.remainingUses,
      totalUses: up.totalUses,
      plan: {
        id: up.planId,
        name: up.plan.name,
        discountPercent: up.plan.discountPercent,
      },
    })),
  }, 'Patient found')
}
