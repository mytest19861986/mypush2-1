import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-response'
import { requireAuth, requireRole } from '@/lib/auth'

interface DoctorUpdateBody {
  medicalCode?: string
  specialty?: string
  clinicName?: string
  clinicAddress?: string
  city?: string
  province?: string
  phone?: string
  bio?: string
}

/**
 * GET /api/v1/doctor/my
 * Get current doctor's profile (requires DOCTOR role)
 */
export async function GET(request: NextRequest) {
  try {
    const { authorized, payload, error } = await requireRole(request, 'DOCTOR')

    if (!authorized || !payload) {
      return errorResponse('FORBIDDEN', error ?? 'دسترسی محدود شده', 403)
    }

    const doctor = await db.doctor.findUnique({
      where: { userId: payload.sub },
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

    if (!doctor) {
      return errorResponse(
        'NOT_FOUND',
        'پروفایل پزشکی یافت نشد',
        404
      )
    }

    return successResponse(doctor)
  } catch {
    return errorResponse('INTERNAL_ERROR', 'خطای داخلی سرور', 500)
  }
}

/**
 * PUT /api/v1/doctor/my
 * Update doctor profile (requires DOCTOR role)
 */
export async function PUT(request: NextRequest) {
  try {
    const { authorized, payload, error } = await requireRole(request, 'DOCTOR')

    if (!authorized || !payload) {
      return errorResponse('FORBIDDEN', error ?? 'دسترسی محدود شده', 403)
    }

    const body: DoctorUpdateBody = await request.json()

    // Check doctor record exists
    const existingDoctor = await db.doctor.findUnique({
      where: { userId: payload.sub },
    })

    if (!existingDoctor) {
      return errorResponse(
        'NOT_FOUND',
        'پروفایل پزشکی یافت نشد',
        404
      )
    }

    // If medicalCode is being changed, check uniqueness
    if (body.medicalCode && body.medicalCode !== existingDoctor.medicalCode) {
      const existingCode = await db.doctor.findUnique({
        where: { medicalCode: body.medicalCode },
      })

      if (existingCode) {
        return errorResponse(
          'ALREADY_EXISTS',
          'کد نظام پزشکی قبلاً ثبت شده است',
          409
        )
      }
    }

    // Update doctor record
    const updatedDoctor = await db.doctor.update({
      where: { userId: payload.sub },
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
