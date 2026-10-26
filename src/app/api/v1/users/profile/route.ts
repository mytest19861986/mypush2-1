import { NextRequest } from 'next/server'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'
import { AuditActions } from '@/lib/audit'
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

class ProfileLinkError extends Error {
  constructor(readonly code: string, readonly status: number) { super(code) }
}

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
    const payout = normalizePayoutUpdate({
      ...(cardNumber !== undefined ? { cardNumber } : {}),
      ...(sheba !== undefined ? { sheba } : {}),
      ...(accountOwnerName !== undefined ? { accountOwnerName } : {}),
    })

    if (payout.errors.length > 0) {
      return errorResponse('VALIDATION_ERROR', payout.errors.join(', '), 400)
    }

    const { profile } = await db.$transaction(async (tx) => {
      const existingProfile = await tx.userProfile.findUnique({ where: { userId: user.sub } })
      // Echoing the stored value is an ordinary profile save, never a linkage request.
      // Any identity change (including first entry or clearing) needs independent proof.
      if (nationalCode !== undefined && (nationalCode || null) !== (existingProfile?.nationalCode ?? null)) {
        if (nationalCode) {
          const inspection = await linkPlanHolderToUserByNationalCode({ userId: user.sub, nationalCode }, tx)
          if (inspection.conflict) throw new ProfileLinkError('PLAN_HOLDER_LINK_CONFLICT', 409)
        }
        throw new ProfileLinkError('IDENTITY_PROOF_REQUIRED', 403)
      }

      if (avatar) {
        const avatarUpload = await tx.upload.findFirst({
          where: {
            userId: user.sub,
            path: avatar,
            type: 'AVATAR',
          },
          select: { id: true },
        })

        if (!avatarUpload) {
          throw new ProfileLinkError('INVALID_AVATAR', 400)
        }
      }

      // Upsert profile
      if (existingProfile) {
        const updateData: Record<string, string | null> = {}
        if (firstName !== undefined) updateData.firstName = firstName
        if (lastName !== undefined) updateData.lastName = lastName
        if (address !== undefined) updateData.address = address
        if (gender !== undefined) updateData.gender = gender
        if (avatar !== undefined) updateData.avatar = avatar || null
        Object.assign(updateData, payout.values)

        await tx.userProfile.update({
          where: { userId: user.sub },
          data: updateData,
        })
      } else {
        await tx.userProfile.create({
          data: {
            userId: user.sub,
            firstName: firstName || null,
            lastName: lastName || null,
            nationalCode: null,
            address: address || null,
            gender: gender || null,
            avatar: avatar || null,
            ...payout.values,
          },
        })
      }

      // Fetch updated profile to return
      const profile = await tx.userProfile.findUnique({
        where: { userId: user.sub },
      })

      await tx.auditLog.create({ data: {
        userId: user.sub,
        action: AuditActions.USER_UPDATED,
        entity: 'User',
        entityId: user.sub,
        details: JSON.stringify({ action: 'profile_update' }),
      } })
      return { profile }
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
        planHolderLinked: false,
        linkedPlansCount: 0,
      },
      'Profile updated successfully'
    )
  } catch (e) {
    if (e instanceof ProfileLinkError) {
      const message = e.code === 'IDENTITY_PROOF_REQUIRED'
        ? 'اتصال طرح نیازمند اثبات معتبر هویت است؛ هیچ تغییری ذخیره نشد.'
        : e.code === 'INVALID_AVATAR' ? 'Invalid avatar upload' : DUPLICATE_NATIONAL_CODE_MESSAGE
      return errorResponse(e.code, message, e.status)
    }
    const msg = (e as Error).message
    if (msg.includes('token') || msg.includes('authorization')) {
      return errorResponse('UNAUTHORIZED', msg, 401)
    }
    if (isNationalCodeUniqueError(e)) {
      return errorResponse('DUPLICATE', DUPLICATE_NATIONAL_CODE_MESSAGE, 409)
    }
    console.error('[PUT /api/v1/users/profile] update unavailable')
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500)
  }
}
