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
            specialty: true,
            clinicName: true,
            city: true,
            phone: true,
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

    // Find contract
    const existingContract = await db.contract.findUnique({ where: { id } })
    if (!existingContract) {
      return errorResponse('NOT_FOUND', 'قرارداد مورد نظر یافت نشد', 404)
    }

    // Verify the user is the doctor of this contract
    const doctor = await db.doctor.findUnique({ where: { userId } })
    if (!doctor || doctor.id !== existingContract.doctorId) {
      return errorResponse('FORBIDDEN', 'فقط پزشک مربوطه مجاز به ویرایش قرارداد است', 403)
    }

    const updateData: Record<string, unknown> = {}
    if (parsed.data.doctorNote !== undefined) updateData.doctorNote = parsed.data.doctorNote
    if (parsed.data.diagnosis !== undefined) updateData.diagnosis = parsed.data.diagnosis
    if (parsed.data.prescriptions !== undefined) updateData.prescriptions = parsed.data.prescriptions

    if (parsed.data.status) {
      updateData.status = parsed.data.status
      if (parsed.data.status === 'CONFIRMED') updateData.confirmedAt = new Date()
      if (parsed.data.status === 'COMPLETED') updateData.completedAt = new Date()
    }

    const contract = await db.contract.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            profile: { select: { firstName: true, lastName: true } },
          },
        },
        userPlan: { include: { plan: true } },
        doctor: {
          include: {
            user: {
              select: {
                profile: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
      },
    })

    return successResponse(contract, 'قرارداد با موفقیت بروزرسانی شد')
  } catch (err) {
    console.error('[PATCH /api/v1/contracts/[id]]', err)
    return errorResponse('INTERNAL_ERROR', 'خطای داخلی سرور', 500)
  }
}
