import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'

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

// PATCH /api/v1/doctors/[id] — Update doctor (discount, etc.) — requires manage_doctors
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, error } = await requirePermission(request, 'manage_doctors')
    if (!authorized) return errorResponse('UNAUTHORIZED', error!, 401)

    const { id } = await params
    const body = (await request.json()) as {
      discountPercent?: number
      specialty?: string
      clinicName?: string
      clinicAddress?: string
      city?: string
      province?: string
      phone?: string
      bio?: string
      status?: string
      firstName?: string
      lastName?: string
    }

    if (
      body.discountPercent !== undefined &&
      (typeof body.discountPercent !== 'number' ||
        body.discountPercent < 0 ||
        body.discountPercent > 100)
    ) {
      return errorResponse('VALIDATION_ERROR', 'درصد تخفیف باید بین ۰ تا ۱۰۰ باشد', 400)
    }

    const existingDoctor = await db.doctor.findUnique({
      where: { id },
      include: { user: true },
    })
    if (!existingDoctor) {
      return errorResponse('NOT_FOUND', 'پزشک مورد نظر یافت نشد', 404)
    }

    const doctorData: Record<string, unknown> = {}
    if (body.discountPercent !== undefined) doctorData.discountPercent = Math.round(body.discountPercent)
    if (body.specialty !== undefined) doctorData.specialty = body.specialty
    if (body.clinicName !== undefined) doctorData.clinicName = body.clinicName
    if (body.clinicAddress !== undefined) doctorData.clinicAddress = body.clinicAddress
    if (body.city !== undefined) doctorData.city = body.city
    if (body.province !== undefined) doctorData.province = body.province
    if (body.phone !== undefined) doctorData.phone = body.phone
    if (body.bio !== undefined) doctorData.bio = body.bio
    if (body.status !== undefined && ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'].includes(body.status)) {
      doctorData.status = body.status
      if (body.status === 'APPROVED') {
        doctorData.verifiedAt = new Date()
      }
    }

    const updatedDoctor = await db.$transaction(async (tx) => {
      if (body.firstName !== undefined || body.lastName !== undefined) {
        await tx.userProfile.upsert({
          where: { userId: existingDoctor.userId },
          create: {
            userId: existingDoctor.userId,
            firstName: body.firstName ?? '',
            lastName: body.lastName ?? '',
          },
          update: {
            ...(body.firstName !== undefined && { firstName: body.firstName }),
            ...(body.lastName !== undefined && { lastName: body.lastName }),
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
      if (body.status && doc.user) {
        const doctorRole = await tx.role.findUnique({ where: { name: 'DOCTOR' } })
        if (doctorRole) {
          if (body.status === 'APPROVED') {
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
          } else if (body.status === 'REJECTED' || body.status === 'SUSPENDED') {
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

      return doc
    })

    return successResponse(updatedDoctor, 'اطلاعات پزشک بروزرسانی شد')
  } catch (err) {
    console.error('[PATCH /api/v1/doctors/[id]]', err)
    return errorResponse('INTERNAL_ERROR', 'خطای داخلی سرور', 500)
  }
}
