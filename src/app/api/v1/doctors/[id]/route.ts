import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'
import { AuditActions } from '@/lib/audit'

// GET /api/v1/doctors/[id] — Get doctor details (requires manage_doctors)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, error } = await requirePermission(request, 'manage_doctors')
    if (!authorized) return errorResponse('UNAUTHORIZED', error!, 401)

    const { id } = await params

    const doctor = await db.doctor.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            mobile: true,
            email: true,
            status: true,
            isMobileVerified: true,
            createdAt: true,
            profile: {
              select: { firstName: true, lastName: true, avatar: true, nationalCode: true },
            },
          },
        },
        contracts: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                profile: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
        _count: {
          select: { contracts: true },
        },
      },
    })

    if (!doctor) {
      return errorResponse('NOT_FOUND', 'پزشک مورد نظر یافت نشد', 404)
    }

    return successResponse(doctor)
  } catch (err) {
    console.error('[GET /api/v1/doctors/[id]]', err)
    return errorResponse('INTERNAL_ERROR', 'خطای داخلی سرور', 500)
  }
}

// PATCH /api/v1/doctors/[id] — Update doctor (discount, name, etc.) — requires manage_doctors
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, payload, error } = await requirePermission(request, 'manage_doctors')
    if (!authorized) {
      return errorResponse('UNAUTHORIZED', error || 'دسترسی مجاز نیست', payload ? 403 : 401)
    }

    const { id } = await params
    const rawBody = await request.json()
    if (!rawBody || typeof rawBody !== 'object') {
      return errorResponse('VALIDATION_ERROR', 'بدنه درخواست نامعتبر است', 400)
    }

    const body = rawBody as {
      discountPercent?: unknown
      specialty?: unknown
      clinicName?: unknown
      clinicAddress?: unknown
      city?: unknown
      province?: unknown
      phone?: unknown
      bio?: unknown
      status?: unknown
      firstName?: unknown
      lastName?: unknown
    }

    // Strict validation for discountPercent
    let validatedDiscount: number | undefined = undefined
    if (body.discountPercent !== undefined && body.discountPercent !== null) {
      if (
        typeof body.discountPercent !== 'number' ||
        Number.isNaN(body.discountPercent) ||
        !Number.isFinite(body.discountPercent) ||
        body.discountPercent < 0 ||
        body.discountPercent > 100
      ) {
        return errorResponse('VALIDATION_ERROR', 'درصد تخفیف باید عدد معتبر بین ۰ تا ۱۰۰ باشد', 400)
      }
      validatedDiscount = Math.round(body.discountPercent)
    }

    // Strict validation for firstName and lastName
    let cleanFirstName: string | undefined = undefined
    if (body.firstName !== undefined && body.firstName !== null) {
      if (typeof body.firstName !== 'string') {
        return errorResponse('VALIDATION_ERROR', 'نام باید به صورت متنی وارد شود', 400)
      }
      cleanFirstName = body.firstName.trim()
      if (cleanFirstName.length < 2 || cleanFirstName.length > 50) {
        return errorResponse('VALIDATION_ERROR', 'نام باید بین ۲ تا ۵۰ نویسه باشد', 400)
      }
    }

    let cleanLastName: string | undefined = undefined
    if (body.lastName !== undefined && body.lastName !== null) {
      if (typeof body.lastName !== 'string') {
        return errorResponse('VALIDATION_ERROR', 'نام خانوادگی باید به صورت متنی وارد شود', 400)
      }
      cleanLastName = body.lastName.trim()
      if (cleanLastName.length < 2 || cleanLastName.length > 50) {
        return errorResponse('VALIDATION_ERROR', 'نام خانوادگی باید بین ۲ تا ۵۰ نویسه باشد', 400)
      }
    }

    const existingDoctor = await db.doctor.findUnique({
      where: { id },
      include: {
        user: {
          include: {
            profile: true,
          },
        },
      },
    })
    if (!existingDoctor) {
      return errorResponse('NOT_FOUND', 'پزشک مورد نظر یافت نشد', 404)
    }

    const doctorData: Record<string, unknown> = {}
    if (validatedDiscount !== undefined) doctorData.discountPercent = validatedDiscount
    if (typeof body.specialty === 'string') doctorData.specialty = body.specialty.trim()
    if (typeof body.clinicName === 'string') doctorData.clinicName = body.clinicName.trim()
    if (typeof body.clinicAddress === 'string') doctorData.clinicAddress = body.clinicAddress.trim()
    if (typeof body.city === 'string') doctorData.city = body.city.trim()
    if (typeof body.province === 'string') doctorData.province = body.province.trim()
    if (typeof body.phone === 'string') doctorData.phone = body.phone.trim()
    if (typeof body.bio === 'string') doctorData.bio = body.bio.trim()
    
    let validStatus: string | undefined = undefined
    if (typeof body.status === 'string' && ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'].includes(body.status)) {
      validStatus = body.status
      doctorData.status = validStatus
      if (validStatus === 'APPROVED') {
        doctorData.verifiedAt = new Date()
      }
    }

    // Track previous and new values for AuditLog
    const changedFields: Record<string, { previous: unknown; next: unknown }> = {}
    if (validatedDiscount !== undefined && validatedDiscount !== existingDoctor.discountPercent) {
      changedFields.discountPercent = {
        previous: existingDoctor.discountPercent,
        next: validatedDiscount,
      }
    }
    const currentFirstName = existingDoctor.user?.profile?.firstName ?? ''
    if (cleanFirstName !== undefined && cleanFirstName !== currentFirstName) {
      changedFields.firstName = {
        previous: currentFirstName,
        next: cleanFirstName,
      }
    }
    const currentLastName = existingDoctor.user?.profile?.lastName ?? ''
    if (cleanLastName !== undefined && cleanLastName !== currentLastName) {
      changedFields.lastName = {
        previous: currentLastName,
        next: cleanLastName,
      }
    }
    if (validStatus !== undefined && validStatus !== existingDoctor.status) {
      changedFields.status = {
        previous: existingDoctor.status,
        next: validStatus,
      }
    }

    const updatedDoctor = await db.$transaction(async (tx) => {
      if (cleanFirstName !== undefined || cleanLastName !== undefined) {
        await tx.userProfile.upsert({
          where: { userId: existingDoctor.userId },
          create: {
            userId: existingDoctor.userId,
            firstName: cleanFirstName ?? currentFirstName,
            lastName: cleanLastName ?? currentLastName,
          },
          update: {
            ...(cleanFirstName !== undefined && { firstName: cleanFirstName }),
            ...(cleanLastName !== undefined && { lastName: cleanLastName }),
          },
        })
      }

      const doc = await tx.doctor.update({
        where: { id },
        data: doctorData,
        include: {
          user: {
            select: {
              id: true,
              mobile: true,
              email: true,
              status: true,
              profile: {
                select: { firstName: true, lastName: true, avatar: true, nationalCode: true },
              },
            },
          },
          _count: { select: { contracts: true } },
        },
      })

      // Sync DOCTOR role if status was updated
      if (validStatus && doc.user) {
        const doctorRole = await tx.role.findUnique({ where: { name: 'DOCTOR' } })
        if (doctorRole) {
          if (validStatus === 'APPROVED') {
            await tx.userRole.upsert({
              where: {
                userId_roleId: {
                  userId: doc.user.id,
                  roleId: doctorRole.id,
                },
              },
              create: {
                userId: doc.user.id,
                roleId: doctorRole.id,
              },
              update: {},
            })
          } else if (validStatus === 'REJECTED' || validStatus === 'SUSPENDED') {
            const existingRole = await tx.userRole.findUnique({
              where: {
                userId_roleId: {
                  userId: doc.user.id,
                  roleId: doctorRole.id,
                },
              },
            })
            if (existingRole) {
              await tx.userRole.delete({
                where: { id: existingRole.id },
              })
            }
          }
        }
      }

      // Atomic AuditLog record if changes occurred
      if (Object.keys(changedFields).length > 0) {
        await tx.auditLog.create({
          data: {
            userId: payload?.userId,
            action: AuditActions.DOCTOR_UPDATED,
            entity: 'Doctor',
            entityId: id,
            details: JSON.stringify({
              doctorId: id,
              targetUserId: existingDoctor.userId,
              adminUserId: payload?.userId,
              changedFields,
            }),
          },
        })
      }

      return doc
    })

    return successResponse(updatedDoctor, 'اطلاعات پزشک بروزرسانی شد')
  } catch (err) {
    console.error('[PATCH /api/v1/doctors/[id]]', err)
    return errorResponse('INTERNAL_ERROR', 'خطای داخلی سرور', 500)
  }
}
