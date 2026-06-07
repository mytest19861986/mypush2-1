import { NextRequest } from 'next/server'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'
import { createAuditLog, AuditActions } from '@/lib/audit'
import { linkPlanHolderToUserByNationalCode } from '@/lib/plan-holder-linking'
import { maskCardNumber, maskSheba, normalizePayoutUpdate } from '@/lib/payout'

const updateProfileSchema = z.object({
  firstName: z.string().max(50).optional(),
  lastName: z.string().max(50).optional(),
  nationalCode: z
    .string()
    .trim()
    .refine((value) => value === '' || /^\d{10}$/.test(value), {
      message: 'کد ملی باید ۱۰ رقم باشد.',
    })
    .optional(),
  address: z.string().max(500).optional(),
  gender: z.enum(['MALE', 'FEMALE']).optional(),
  avatar: z.string().max(500).nullable().optional(),
  cardNumber: z.string().nullable().optional(),
  sheba: z.string().nullable().optional(),
  accountOwnerName: z.string().max(100).nullable().optional(),
})

const DUPLICATE_NATIONAL_CODE_MESSAGE = 'این کد ملی قبلاً ثبت شده است.'

function isNationalCodeUniqueError(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false
  if (error.code !== 'P2002') return false

  const target = error.meta?.target
  return Array.isArray(target) && target.includes('nationalCode')
}

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

    const {
      firstName,
      lastName,
      nationalCode,
      address,
      gender,
      avatar,
      cardNumber,
      sheba,
      accountOwnerName,
    } = parsed.data
    const shouldLinkPlanHolder = nationalCode !== undefined && nationalCode.length > 0
    const payout = normalizePayoutUpdate({
      ...(cardNumber !== undefined ? { cardNumber } : {}),
      ...(sheba !== undefined ? { sheba } : {}),
      ...(accountOwnerName !== undefined ? { accountOwnerName } : {}),
    })

    if (payout.errors.length > 0) {
      return errorResponse('VALIDATION_ERROR', payout.errors.join(', '), 400)
    }

    // Validate national code format if provided
    if (nationalCode && nationalCode.length > 0) {
      if (!/^\d{10}$/.test(nationalCode)) {
        return errorResponse('VALIDATION_ERROR', 'کد ملی باید ۱۰ رقم باشد.', 400)
      }

      // Check national code uniqueness
      const existingProfile = await db.userProfile.findUnique({
        where: { nationalCode },
      })
      if (existingProfile && existingProfile.userId !== user.sub) {
        return errorResponse('DUPLICATE', DUPLICATE_NATIONAL_CODE_MESSAGE, 409)
      }
    }

    if (avatar) {
      const avatarUpload = await db.upload.findFirst({
        where: {
          userId: user.sub,
          path: avatar,
          type: 'AVATAR',
        },
        select: { id: true },
      })

      if (!avatarUpload) {
        return errorResponse('VALIDATION_ERROR', 'Invalid avatar upload', 400)
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
      if (avatar !== undefined) updateData.avatar = avatar || null
      Object.assign(updateData, payout.values)

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
          avatar: avatar || null,
          ...payout.values,
        },
      })
    }

    let planHolderLinking:
      | Awaited<ReturnType<typeof linkPlanHolderToUserByNationalCode>>
      | undefined

    if (shouldLinkPlanHolder) {
      planHolderLinking = await linkPlanHolderToUserByNationalCode({
        userId: user.sub,
        nationalCode,
        actorId: user.sub,
        request,
      })

      if (planHolderLinking.conflict) {
        return errorResponse(
          'PLAN_HOLDER_LINK_CONFLICT',
          DUPLICATE_NATIONAL_CODE_MESSAGE,
          409
        )
      }
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
        cardNumber: maskCardNumber(profile?.payoutCardNumber),
        sheba: maskSheba(profile?.payoutSheba),
        accountOwnerName: profile?.payoutAccountOwnerName,
        planHolderLinked: planHolderLinking?.linked ?? false,
        linkedPlansCount: planHolderLinking?.linkedUserPlansCount ?? 0,
      },
      'Profile updated successfully'
    )
  } catch (e) {
    const msg = (e as Error).message
    if (msg.includes('token') || msg.includes('authorization')) {
      return errorResponse('UNAUTHORIZED', msg, 401)
    }
    if (isNationalCodeUniqueError(e)) {
      return errorResponse('DUPLICATE', DUPLICATE_NATIONAL_CODE_MESSAGE, 409)
    }
    console.error('[PUT /api/v1/users/profile]', e)
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500)
  }
}
