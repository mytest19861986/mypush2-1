import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requirePermission } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'

const statusSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'SUSPENDED']),
})

// PATCH /api/v1/doctors/[id]/status — Change doctor status (requires approve_doctors)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, error } = await requirePermission(request, 'approve_doctors')
    if (!authorized) return errorResponse('UNAUTHORIZED', error!, 401)

    const { id } = await params

    const existingDoctor = await db.doctor.findUnique({ where: { id } })
    if (!existingDoctor) {
      return errorResponse('NOT_FOUND', 'پزشک مورد نظر یافت نشد', 404)
    }

    const body = await request.json()
    const parsed = statusSchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', 'وضعیت نامعتبر است. مقادیر مجاز: APPROVED, REJECTED, SUSPENDED', 400)
    }

    const { status } = parsed.data

    const updateData: Record<string, unknown> = { status }
    if (status === 'APPROVED') {
      updateData.verifiedAt = new Date()
    }

    const doctor = await db.$transaction(async (tx) => {
      const updatedDoctor = await tx.doctor.update({
        where: { id },
        data: updateData,
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

      // Assign/remove DOCTOR role based on status atomically
      if (updatedDoctor.user) {
        const doctorRole = await tx.role.findUnique({ where: { name: 'DOCTOR' } })
        if (doctorRole) {
          if (status === 'APPROVED') {
            await tx.userRole.upsert({
              where: {
                userId_roleId: {
                  userId: updatedDoctor.user.id,
                  roleId: doctorRole.id,
                },
              },
              create: {
                userId: updatedDoctor.user.id,
                roleId: doctorRole.id,
              },
              update: {},
            })
          } else if (status === 'REJECTED' || status === 'SUSPENDED') {
            const existingRole = await tx.userRole.findUnique({
              where: {
                userId_roleId: {
                  userId: updatedDoctor.user.id,
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

      return updatedDoctor
    })

    return successResponse(doctor, `وضعیت پزشک با موفقیت به ${status === 'APPROVED' ? 'تأیید شده' : status === 'REJECTED' ? 'رد شده' : 'معلق'} تغییر کرد`)
  } catch (err) {
    console.error('[PATCH /api/v1/doctors/[id]/status]', err)
    return errorResponse('INTERNAL_ERROR', 'خطای داخلی سرور', 500)
  }
}
