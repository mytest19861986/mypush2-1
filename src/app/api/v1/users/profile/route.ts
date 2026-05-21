import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'
import { createAuditLog, AuditActions } from '@/lib/audit'

const updateProfileSchema = z.object({
  firstName: z.string().max(50).optional(),
  lastName: z.string().max(50).optional(),
  nationalCode: z.string().max(10).optional(),
  address: z.string().max(500).optional(),
  gender: z.enum(['MALE', 'FEMALE']).optional(),
})

// PUT /api/v1/users/profile — Update current user's profile
export async function PUT(request: NextRequest) {
  try {
    const { user } = await requireAuth(request)

    const body = await request.json()
    const parsed = updateProfileSchema.safeParse(body)

    if (!parsed.success) {
      return errorResponse(
        'VALIDATION_ERROR',
        parsed.error.issues.map((i) => i.message).join(', '),
        400
      )
    }

    const { firstName, lastName, nationalCode, address, gender } = parsed.data

    // Validate national code format if provided
    if (nationalCode && nationalCode.length > 0) {
      if (!/^\d{10}$/.test(nationalCode)) {
        return errorResponse('VALIDATION_ERROR', 'National code must be 10 digits', 400)
      }

      // Check national code uniqueness
      const existingProfile = await db.userProfile.findUnique({
        where: { nationalCode },
      })
      if (existingProfile && existingProfile.userId !== user.sub) {
        return errorResponse('DUPLICATE', 'National code already in use by another user', 409)
      }
    }

    // Upsert profile
    const existingProfile = await db.userProfile.findUnique({
      where: { userId: user.sub },
    })

    if (existingProfile) {
      const updateData: Record<string, string | null> = {}
      if (firstName !== undefined) updateData.firstName = firstName
      if (lastName !== undefined) updateData.lastName = lastName
      if (nationalCode !== undefined) updateData.nationalCode = nationalCode || null
      if (address !== undefined) updateData.address = address
      if (gender !== undefined) updateData.gender = gender

      await db.userProfile.update({
        where: { userId: user.sub },
        data: updateData,
      })
    } else {
      await db.userProfile.create({
        data: {
          userId: user.sub,
          firstName: firstName || null,
          lastName: lastName || null,
          nationalCode: nationalCode || null,
          address: address || null,
          gender: gender || null,
        },
      })
    }

    // Fetch updated profile to return
    const profile = await db.userProfile.findUnique({
      where: { userId: user.sub },
    })

    // Audit log
    createAuditLog({
      userId: user.sub,
      action: AuditActions.USER_UPDATED,
      entity: 'User',
      entityId: user.sub,
      details: { action: 'profile_update' },
    })

    return successResponse(
      {
        firstName: profile?.firstName,
        lastName: profile?.lastName,
        nationalCode: profile?.nationalCode,
        avatar: profile?.avatar,
        address: profile?.address,
        gender: profile?.gender,
      },
      'Profile updated successfully'
    )
  } catch (e) {
    const msg = (e as Error).message
    if (msg.includes('token') || msg.includes('authorization')) {
      return errorResponse('UNAUTHORIZED', msg, 401)
    }
    console.error('[PUT /api/v1/users/profile]', e)
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500)
  }
}
