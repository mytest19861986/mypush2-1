import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'

interface StatusBreakdownItem {
  status: string
  count: number
}

// GET /api/v1/doctors/[id]/performance — Individual Physician Performance Report
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, error } = await requirePermission(request, 'manage_doctors')
    if (!authorized) return errorResponse('UNAUTHORIZED', error!, 401)

    const { id } = await params
    if (!id || typeof id !== 'string') {
      return errorResponse('VALIDATION_ERROR', 'شناسه پزشک نامعتبر است.', 400)
    }

    const doctor = await db.doctor.findUnique({
      where: { id },
      select: {
        id: true,
        specialty: true,
        clinicName: true,
        user: {
          select: {
            mobile: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    })

    if (!doctor) {
      return errorResponse('NOT_FOUND', 'پزشک مورد نظر یافت نشد.', 404)
    }

    const { searchParams } = new URL(request.url)
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')

    let startDateTime: Date | undefined
    let endDateTime: Date | undefined

    if (startDateParam) {
      const parsed = new Date(startDateParam)
      if (isNaN(parsed.getTime())) {
        return errorResponse('VALIDATION_ERROR', 'تاریخ شروع نامعتبر است.', 400)
      }
      startDateTime = parsed
    }

    if (endDateParam) {
      const parsed = new Date(endDateParam)
      if (isNaN(parsed.getTime())) {
        return errorResponse('VALIDATION_ERROR', 'تاریخ پایان نامعتبر است.', 400)
      }
      endDateTime = parsed
    }

    if (startDateTime && endDateTime && startDateTime > endDateTime) {
      return errorResponse('VALIDATION_ERROR', 'تاریخ شروع نمی‌تواند پس از تاریخ پایان باشد.', 400)
    }

    const createdAtFilter: { gte?: Date; lte?: Date } = {}
    if (startDateTime) createdAtFilter.gte = startDateTime
    if (endDateTime) createdAtFilter.lte = endDateTime

    const visitWhere = {
      doctorId: id,
      ...(Object.keys(createdAtFilter).length > 0 && { createdAt: createdAtFilter }),
    }

    const [visits, statusGroups] = await Promise.all([
      db.visit.findMany({
        where: visitWhere,
        select: {
          id: true,
          status: true,
          planHolderId: true,
          userId: true,
          discountAmount: true,
          totalAmount: true,
          createdAt: true,
          completedAt: true,
        },
      }),
      db.visit.groupBy({
        by: ['status'],
        where: visitWhere,
        _count: {
          status: true,
        },
      }),
    ])

    const completedVisits = visits.filter((v) => v.status === 'COMPLETED')
    const totalCompletedVisits = completedVisits.length

    // Unique patients count in date range
    const uniquePatientIds = new Set<string>()
    for (const v of visits) {
      const identifier = v.planHolderId || v.userId
      if (identifier) {
        uniquePatientIds.add(identifier)
      }
    }
    const uniquePatientsCount = uniquePatientIds.size

    const statusBreakdown: Record<string, number> = {
      COMPLETED: 0,
      CANCELLED: 0,
      PENDING: 0,
      CONFIRMED: 0,
    }

    for (const group of statusGroups) {
      statusBreakdown[group.status] = group._count.status
    }

    const totalDiscountAmount = completedVisits.reduce((sum, v) => sum + (v.discountAmount || 0), 0)
    const totalAmount = completedVisits.reduce((sum, v) => sum + (v.totalAmount || 0), 0)

    const doctorName = [
      doctor.user?.profile?.firstName,
      doctor.user?.profile?.lastName,
    ]
      .filter(Boolean)
      .join(' ')
      .trim() || doctor.clinicName || 'پزشک'

    return successResponse({
      doctor: {
        id: doctor.id,
        name: doctorName,
        specialty: doctor.specialty,
        clinicName: doctor.clinicName,
      },
      period: {
        startDate: startDateTime ? startDateTime.toISOString() : null,
        endDate: endDateTime ? endDateTime.toISOString() : null,
      },
      metrics: {
        totalCompletedVisits,
        uniquePatientsCount,
        totalVisits: visits.length,
        statusBreakdown,
        financial: {
          totalCompletedDiscountAmount: totalDiscountAmount,
          totalCompletedAmount: totalAmount,
        },
      },
    })
  } catch (err) {
    console.error('[GET /api/v1/doctors/[id]/performance]', err)
    return errorResponse('INTERNAL_ERROR', 'خطای داخلی هنگام دریافت گزارش عملکرد پزشک.', 500)
  }
}
