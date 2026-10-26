import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'

const updateSchema = z.object({
  doctorNote: z.string().optional(),
  diagnosis: z.string().optional(),
  prescriptions: z.string().optional(),
  status: z.enum(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED']).optional(),
})

// GET /api/v1/contracts/[id] — Get contract details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authenticated, payload, error } = await authenticateRequest(request)
    if (!authenticated) return errorResponse('UNAUTHORIZED', error!, 401)

    const { id } = await params
    const userId = payload!.sub

    const contract = await db.contract.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            mobile: true,
            profile: { select: { firstName: true, lastName: true, nationalCode: true } },
          },
        },
        userPlan: {
          include: { plan: true },
        },
        doctor: {
          include: {
            user: {
              select: {
                profile: { select: { firstName: true, lastName: true, avatar: true } },
              },
            },
          },
        },
      },
    })

    if (!contract) {
      return errorResponse('NOT_FOUND', 'قرارداد مورد نظر یافت نشد', 404)
    }

    // Only allow the contract owner or their doctor to view
    const doctor = await db.doctor.findUnique({ where: { userId } })
    if (contract.userId !== userId && (!doctor || doctor.id !== contract.doctorId)) {
      return errorResponse('FORBIDDEN', 'شما دسترسی به این قرارداد را ندارید', 403)
    }

    return successResponse(contract)
  } catch (err) {
    console.error('[GET /api/v1/contracts/[id]]', err)
    return errorResponse('INTERNAL_ERROR', 'خطای داخلی سرور', 500)
  }
}

// PATCH /api/v1/contracts/[id] — Update contract (doctor adds notes)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authenticated, payload, error } = await authenticateRequest(request)
    if (!authenticated) return errorResponse('UNAUTHORIZED', error!, 401)

    const { id } = await params
    const userId = payload!.sub

    const body = await request.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', parsed.error.issues.map((e) => e.message).join('. '), 400)
    }

    // Resolve current account, role and approval in the same transaction as notes.
    // JWT claims or a surviving Doctor row cannot preserve revoked authority.
    return await db.$transaction(async (tx) => {
      const actor = await tx.user.findUnique({
        where: { id: userId },
        select: {
          status: true, deletedAt: true,
          roles: { select: { role: { select: { name: true } } } },
          doctor: { select: { id: true, status: true } },
        },
      })
      if (!actor || actor.deletedAt || actor.status !== 'ACTIVE') {
        return errorResponse('UNAUTHORIZED', 'حساب فعال و معتبر لازم است.', 401)
      }
      if (!payload!.roles.includes('DOCTOR') || !actor.roles.some(link => link.role.name === 'DOCTOR')) {
        return errorResponse('FORBIDDEN', 'فقط پزشک مربوطه مجاز به ویرایش قرارداد است', 403)
      }
      if (!actor.doctor || actor.doctor.status !== 'APPROVED') {
        return errorResponse('FORBIDDEN', 'تأیید پزشک برای ویرایش قرارداد لازم است.', 403)
      }
      const existingContract = await tx.contract.findUnique({ where: { id } })
      if (!existingContract) return errorResponse('NOT_FOUND', 'قرارداد مورد نظر یافت نشد', 404)
      if (actor.doctor.id !== existingContract.doctorId) {
        return errorResponse('FORBIDDEN', 'فقط پزشک مربوطه مجاز به ویرایش قرارداد است', 403)
      }
      if (parsed.data.status !== undefined && parsed.data.status !== existingContract.status) {
        await tx.auditLog.create({ data: {
          userId, action: 'CONTRACT_STATUS_CHANGE_DENIED', entity: 'Contract', entityId: id,
          details: JSON.stringify({ reason: 'PATIENT_CONSENT_REQUIRED', from: existingContract.status, to: parsed.data.status }),
        } })
        return errorResponse('PATIENT_CONSENT_REQUIRED', 'تغییر وضعیت قرارداد نیازمند رضایت معتبر بیمار است.', 403)
      }
      // A same-status compatibility field is ignored, never persisted. Only
      // explicitly allowed notes can change, with no status/timestamp assignment.
      const updateData: { doctorNote?: string; diagnosis?: string; prescriptions?: string } = {}
      if (parsed.data.doctorNote !== undefined) updateData.doctorNote = parsed.data.doctorNote
      if (parsed.data.diagnosis !== undefined) updateData.diagnosis = parsed.data.diagnosis
      if (parsed.data.prescriptions !== undefined) updateData.prescriptions = parsed.data.prescriptions
      const include = {
        user: { select: { profile: { select: { firstName: true, lastName: true } } } },
        userPlan: { include: { plan: true } },
        doctor: { include: { user: { select: { profile: { select: { firstName: true, lastName: true } } } } } },
      } as const
      const contract = Object.keys(updateData).length
        ? await tx.contract.update({ where: { id }, data: updateData, include })
        : await tx.contract.findUniqueOrThrow({ where: { id }, include })
      if (Object.keys(updateData).length) {
        // Existing AuditLog model, field names only: no clinical content/OTP/JWT.
        // Audit failure rolls back the note update rather than hiding the failure.
        await tx.auditLog.create({ data: {
          userId, action: 'CONTRACT_NOTES_UPDATED', entity: 'Contract', entityId: id,
          details: JSON.stringify({ fields: Object.keys(updateData) }),
        } })
      }
      return successResponse(contract, 'قرارداد با موفقیت بروزرسانی شد')
    })
  } catch (err) {
    console.error('[PATCH /api/v1/contracts/[id]]', err)
    return errorResponse('INTERNAL_ERROR', 'خطای داخلی سرور', 500)
  }
}
