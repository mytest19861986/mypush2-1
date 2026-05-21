import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-response'
import { requireRole } from '@/lib/auth'

/**
 * GET /api/v1/contracts/doctor
 * Get current doctor's contracts (requires DOCTOR role)
 */
export async function GET(request: NextRequest) {
  try {
    const { authorized, payload, error } = await requireRole(request, 'DOCTOR')

    if (!authorized || !payload) {
      return errorResponse('FORBIDDEN', error ?? 'دسترسی محدود شده', 403)
    }

    // Find doctor record for the authenticated user
    const doctor = await db.doctor.findUnique({
      where: { userId: payload.sub },
    })

    if (!doctor) {
      return errorResponse(
        'NOT_FOUND',
        'پروفایل پزشکی یافت نشد',
        404
      )
    }

    // Fetch all contracts for this doctor
    const contracts = await db.contract.findMany({
      where: { doctorId: doctor.id },
      include: {
        user: {
          select: {
            id: true,
            mobile: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        userPlan: {
          select: {
            id: true,
            status: true,
            startDate: true,
            endDate: true,
            plan: {
              select: {
                id: true,
                name: true,
                discountPercent: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Add computed patient name
    const enrichedContracts = contracts.map((contract) => ({
      ...contract,
      patientName:
        contract.user.profile
          ? `${contract.user.profile.firstName ?? ''} ${contract.user.profile.lastName ?? ''}`.trim() || contract.user.mobile
          : contract.user.mobile,
    }))

    return successResponse(enrichedContracts)
  } catch {
    return errorResponse('INTERNAL_ERROR', 'خطای داخلی سرور', 500)
  }
}
