import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'

const lookupSchema = z.object({
  nationalCode: z.string().min(1, 'کد ملی الزامی است'),
})

// POST /api/v1/doctors/lookup — Lookup patient by national code (requires DOCTOR role)
export async function POST(request: NextRequest) {
  try {
    const { authenticated, payload, error } = await authenticateRequest(request)
    if (!authenticated) return errorResponse('UNAUTHORIZED', error!, 401)

    // Check if user has DOCTOR role
    if (!payload!.roles.includes('DOCTOR')) {
      return errorResponse('FORBIDDEN', 'فقط پزشکان دسترسی به این بخش را دارند', 403)
    }

    const body = await request.json()
    const parsed = lookupSchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', parsed.error.issues.map((e) => e.message).join('. '), 400)
    }

    const { nationalCode } = parsed.data

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

    if (!profile) {
      return errorResponse('NOT_FOUND', 'بیماری با این کد ملی یافت نشد', 404)
    }

    // Get all ACTIVE user plans with plan details
    const activePlans = await db.userPlan.findMany({
      where: {
        userId: profile.userId,
        status: 'ACTIVE',
        endDate: { gte: new Date() },
      },
      include: {
        plan: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return successResponse({
      id: profile.userId,
      firstName: profile.firstName,
      lastName: profile.lastName,
      nationalCode: profile.nationalCode,
      gender: profile.gender,
      birthDate: profile.birthDate,
      mobile: profile.user.mobile,
      userStatus: profile.user.status,
      activePlans,
    })
  } catch (err) {
    console.error('[POST /api/v1/doctors/lookup]', err)
    return errorResponse('INTERNAL_ERROR', 'خطای داخلی سرور', 500)
  }
}
