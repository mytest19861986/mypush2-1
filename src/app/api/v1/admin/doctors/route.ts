import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requirePermission } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'
import { createAuditLog, AuditActions } from '@/lib/audit'
import { normalizeMobile } from '@/lib/phone'
import { assertNoAgentConflict } from '@/lib/role-integrity'


const adminCreateDoctorSchema = z.object({
  mobile: z
    .string()
    .transform(normalizeMobile)
    .refine((val) => /^09\d{9}$/.test(val), {
      message: 'فرمت شماره موبایل نامعتبر است (مثال: 09121234567)',
    }),
  firstName: z.string().trim().min(2, 'نام باید حداقل ۲ حرف باشد').max(50),
  lastName: z.string().trim().min(2, 'نام خانوادگی باید حداقل ۲ حرف باشد').max(50),
  nationalCode: z.string().trim().regex(/^\d{10}$/, 'کد ملی باید ۱۰ رقم باشد').optional().or(z.literal('')),
  medicalCode: z.string().trim().min(1, 'کد نظام پزشکی الزامی است'),
  specialty: z.string().trim().min(1, 'تخصص الزامی است'),
  clinicName: z.string().trim().min(1, 'نام مطب یا مرکز درمانی الزامی است'),
  clinicAddress: z.string().trim().max(255).optional().or(z.literal('')),
  city: z.string().trim().max(100).optional().or(z.literal('')),
  province: z.string().trim().max(100).optional().or(z.literal('')),
  phone: z.string().trim().max(50).optional().or(z.literal('')),
  bio: z.string().trim().max(1000).optional().or(z.literal('')),
  discountPercent: z.coerce.number().min(0).max(100).default(0),
})

// POST /api/v1/admin/doctors — Create doctor profile by administrator (Preserving PENDING state)
export async function POST(request: NextRequest) {
  try {
    const { authorized, payload, error } = await requirePermission(request, 'manage_doctors')
    if (!authorized) {
      return errorResponse('UNAUTHORIZED', error || 'دسترسی مجاز نیست', payload ? 403 : 401)
    }

    const body = await request.json()
    const parsed = adminCreateDoctorSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]
      return errorResponse('VALIDATION_ERROR', firstError?.message || 'اطلاعات وارد شده نامعتبر است', 422)
    }

    const {
      mobile,
      firstName,
      lastName,
      nationalCode,
      medicalCode,
      specialty,
      clinicName,
      clinicAddress,
      city,
      province,
      phone,
      bio,
      discountPercent,
    } = parsed.data

    const cleanNationalCode = nationalCode && nationalCode.length === 10 ? nationalCode : null

    // Check unique medicalCode
    const existingMedicalCode = await db.doctor.findUnique({ where: { medicalCode } })
    if (existingMedicalCode) {
      return errorResponse('CONFLICT', 'کد نظام پزشکی قبلاً در سامانه ثبت شده است', 409)
    }

    // Check user by mobile
    let user = await db.user.findUnique({ where: { mobile } })
    if (user) {
      const existingDoc = await db.doctor.findUnique({ where: { userId: user.id } })
      if (existingDoc) {
        return errorResponse('CONFLICT', 'برای این شماره موبایل قبلاً پرونده پزشکی ثبت شده است', 409)
      }
    }

    // Role exclusivity check: Disallow Agent from becoming Doctor
    try {
      await assertNoAgentConflict({ userId: user?.id, mobile })
    } catch (conflictErr: any) {
      return errorResponse('CONFLICT', conflictErr.message, 409)
    }

    // Ensure 'USER' role exists
    let userRole = await db.role.findUnique({ where: { name: 'USER' } })
    if (!userRole) {
      userRole = await db.role.create({
        data: { name: 'USER', title: 'کاربر عادی', description: 'دسترسی پایه کاربران عادی' },
      })
    }

    // Transactionally create or link User, and create Doctor in PENDING status
    const doctorRecord = await db.$transaction(async (tx) => {
      // Re-assert conflict inside transaction for concurrency safety
      await assertNoAgentConflict({ userId: user?.id, mobile }, tx)

      if (!user) {
        user = await tx.user.create({
          data: {
            mobile,
            status: 'ACTIVE',

            isMobileVerified: true,
          },
        })

        await tx.userRole.create({
          data: {
            userId: user.id,
            roleId: userRole.id,
          },
        })

        await tx.userProfile.create({
          data: {
            userId: user.id,
            firstName,
            lastName,
            nationalCode: cleanNationalCode,
          },
        })
      } else {
        await tx.userProfile.upsert({
          where: { userId: user.id },
          create: {
            userId: user.id,
            firstName,
            lastName,
            nationalCode: cleanNationalCode,
          },
          update: {
            firstName: firstName || undefined,
            lastName: lastName || undefined,
            nationalCode: cleanNationalCode || undefined,
          },
        })
      }

      // Create Doctor in PENDING status per DEC56-ROLE-SAFETY
      const doctor = await tx.doctor.create({
        data: {
          userId: user.id,
          medicalCode,
          specialty,
          clinicName,
          clinicAddress: clinicAddress || null,
          city: city || null,
          province: province || null,
          phone: phone || null,
          bio: bio || null,
          discountPercent,
          status: 'PENDING',
        },
        include: {
          user: {
            select: {
              id: true,
              mobile: true,
              profile: { select: { firstName: true, lastName: true } },
            },
          },
        },
      })

      return doctor
    })

    createAuditLog({
      userId: payload?.sub || doctorRecord.userId,
      action: AuditActions.USER_CREATED,
      entity: 'Doctor',
      entityId: doctorRecord.id,
      details: { method: 'ADMIN_CREATE', medicalCode, mobile },
    })

    return successResponse(
      doctorRecord,
      'پرونده پزشک با موفقیت در وضعیت در انتظار بررسی (PENDING) ثبت شد',
      201
    )
  } catch (err) {
    console.error('[POST /api/v1/admin/doctors]', err)
    return errorResponse('INTERNAL_ERROR', 'خطای داخلی سرور در ثبت پزشک', 500)
  }
}
