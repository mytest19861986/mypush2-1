import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'

// GET /api/v1/doctors/my — Get current user's doctor info
export async function GET(request: NextRequest) {
  const { authenticated, payload, error } = await authenticateRequest(request)
  if (!authenticated) return errorResponse('UNAUTHORIZED', error!, 401)

  // Check user has DOCTOR role
  if (!payload!.roles.includes('DOCTOR')) {
    return errorResponse('FORBIDDEN', 'DOCTOR role required', 403)
  }

  const doctor = await db.doctor.findUnique({
    where: { userId: payload!.sub },
  })

  if (!doctor) {
    return errorResponse('NOT_FOUND', 'Doctor record not found', 404)
  }

  return successResponse(doctor, 'Doctor info retrieved')
}

// PUT /api/v1/doctors/my — Update current doctor's profile
export async function PUT(request: NextRequest) {
  try {
    const { authenticated, payload, error } = await authenticateRequest(request)
    if (!authenticated) return errorResponse('UNAUTHORIZED', error!, 401)

    if (!payload!.roles.includes('DOCTOR')) {
      return errorResponse('FORBIDDEN', 'نقش پزشک الزامی است', 403)
    }

    const body = (await request.json()) as {
      medicalCode?: string
      specialty?: string
      clinicName?: string
      clinicAddress?: string
      city?: string
      province?: string
      phone?: string
      bio?: string
    }

    const existingDoctor = await db.doctor.findUnique({
      where: { userId: payload!.sub },
    })

    if (!existingDoctor) {
      return errorResponse('NOT_FOUND', 'پروفایل پزشکی یافت نشد', 404)
    }

    if (body.medicalCode && body.medicalCode !== existingDoctor.medicalCode) {
      const existingCode = await db.doctor.findUnique({
        where: { medicalCode: body.medicalCode },
      })
      if (existingCode) {
        return errorResponse('ALREADY_EXISTS', 'کد نظام پزشکی قبلاً ثبت شده است', 409)
      }
    }

    const updatedDoctor = await db.doctor.update({
      where: { userId: payload!.sub },
      data: {
        ...(body.medicalCode !== undefined && { medicalCode: body.medicalCode }),
        ...(body.specialty !== undefined && { specialty: body.specialty }),
        ...(body.clinicName !== undefined && { clinicName: body.clinicName }),
        ...(body.clinicAddress !== undefined && { clinicAddress: body.clinicAddress }),
        ...(body.city !== undefined && { city: body.city }),
        ...(body.province !== undefined && { province: body.province }),
        ...(body.phone !== undefined && { phone: body.phone }),
        ...(body.bio !== undefined && { bio: body.bio }),
      },
      include: {
        user: {
          select: {
            id: true,
            mobile: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
        },
      },
    })

    return successResponse(updatedDoctor, 'پروفایل پزشکی با موفقیت بروزرسانی شد')
  } catch (e) {
    const msg = (e as Error).message
    if (msg.includes('JSON') || msg.includes('body')) {
      return errorResponse('VALIDATION_ERROR', 'بدنه درخواست نامعتبر است', 400)
    }
    return errorResponse('INTERNAL_ERROR', 'خطای داخلی سرور', 500)
  }
}
