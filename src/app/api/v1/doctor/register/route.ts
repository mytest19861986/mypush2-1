import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-response'
import { requireAuth } from '@/lib/auth'

interface DoctorRegisterBody {
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
 * POST /api/v1/doctor/register
 * Doctor self-registration (requires authenticated user)
 */
export async function POST(request: NextRequest) {
  try {
    const { user } = await requireAuth(request)

    const body: DoctorRegisterBody = await request.json()

    // Validate required fields
    if (!body.medicalCode || !body.specialty || !body.clinicName) {
      return errorResponse(
        'VALIDATION_ERROR',
        'فیلدهای کد نظام پزشکی، تخصص و نام مطب الزامی هستند',
        400
      )
    }

    // Check if user already has a doctor record
    const existingDoctor = await db.doctor.findUnique({
      where: { userId: user.sub },
    })

    if (existingDoctor) {
      return errorResponse(
        'ALREADY_EXISTS',
        'شما قبلاً درخواست ثبت‌نام پزشکی ارسال کرده‌اید',
        409
      )
    }

    // Check if medical code is already taken by another doctor
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

    // Create doctor record with PENDING status
    const doctor = await db.doctor.create({
      data: {
        userId: user.sub,
        medicalCode: body.medicalCode,
        specialty: body.specialty,
        clinicName: body.clinicName,
        clinicAddress: body.clinicAddress ?? null,
        city: body.city ?? null,
        province: body.province ?? null,
        phone: body.phone ?? null,
        bio: body.bio ?? null,
        status: 'PENDING',
      },
    })

    // Note: DOCTOR role is NOT assigned here.
    // It will be assigned by admin when the doctor status is changed to APPROVED.

    return successResponse(doctor, 'درخواست ثبت‌نام پزشکی با موفقیت ثبت شد و در انتظار تأیید است', 201)
  } catch (e) {
    const msg = (e as Error).message
    if (msg.includes('توکن') || msg.includes('token') || msg.includes('authorization')) {
      return errorResponse('UNAUTHORIZED', msg, 401)
    }
    if (msg.includes('JSON') || msg.includes('body')) {
      return errorResponse('VALIDATION_ERROR', 'بدنه درخواست نامعتبر است', 400)
    }
    return errorResponse('INTERNAL_ERROR', 'خطای داخلی سرور', 500)
  }
}
