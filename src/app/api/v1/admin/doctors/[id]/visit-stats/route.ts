import { NextRequest } from 'next/server'
import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'

const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/
const utcIsoDateTimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/

const statusLabels: Record<string, string> = {
  PENDING: 'در انتظار',
  CONFIRMED: 'تأیید شده',
  COMPLETED: 'تکمیل شده',
  CANCELLED: 'لغو شده',
  REJECTED: 'رد شده',
}

function isAdmin(payload: { roles: string[] }) {
  return payload.roles.includes('SUPER_ADMIN') || payload.roles.includes('ADMIN')
}

function isValidDoctorId(id: string) {
  return id.length > 0 && id.length <= 100 && /^[a-zA-Z0-9_-]+$/.test(id)
}

function parseDateParam(value: string | null, boundary: 'from' | 'to') {
  if (!value) return null
  if (!dateOnlyPattern.test(value) && !utcIsoDateTimePattern.test(value)) return null

  const normalized =
    dateOnlyPattern.test(value) && boundary === 'from'
      ? `${value}T00:00:00.000Z`
      : dateOnlyPattern.test(value) && boundary === 'to'
        ? `${value}T23:59:59.999Z`
        : value

  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? null : date
}

function getDateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

// GET /api/v1/admin/doctors/[id]/visit-stats?from=ISO&to=ISO
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authenticated, payload, error } = await authenticateRequest(request)
    if (!authenticated || !payload) return errorResponse('UNAUTHORIZED', error!, 401)
    if (!isAdmin(payload)) return errorResponse('FORBIDDEN', 'Admin role required', 403)

    const { id } = await params
    if (!isValidDoctorId(id)) {
      return errorResponse('VALIDATION_ERROR', 'Invalid doctor id', 400)
    }

    const fromParam = request.nextUrl.searchParams.get('from')
    const toParam = request.nextUrl.searchParams.get('to')
    const fromDate = parseDateParam(fromParam, 'from')
    const toDate = parseDateParam(toParam, 'to')

    if (!fromParam || !toParam || !fromDate || !toDate) {
      return errorResponse('VALIDATION_ERROR', 'Valid from and to date params are required', 400)
    }

    if (fromDate.getTime() > toDate.getTime()) {
      return errorResponse('VALIDATION_ERROR', 'from must be before or equal to to', 400)
    }

    const doctor = await db.doctor.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!doctor) {
      return errorResponse('NOT_FOUND', 'Doctor not found', 404)
    }

    const where: Prisma.VisitWhereInput = {
      doctorId: id,
      visitedAt: {
        gte: fromDate,
        lte: toDate,
      },
    }

    const [totalVisits, uniquePatients, discountTotal, visits] = await Promise.all([
      db.visit.count({ where }),
      db.visit.findMany({
        where,
        distinct: ['planHolderId'],
        select: { planHolderId: true },
      }),
      db.visit.aggregate({
        where,
        _sum: { discountAmount: true },
      }),
      db.visit.findMany({
        where,
        select: {
          status: true,
          visitedAt: true,
        },
        orderBy: { visitedAt: 'asc' },
      }),
    ])

    const dailyCounts = new Map<string, number>()
    const statusCounts = new Map<string, number>()

    for (const visit of visits) {
      if (visit.visitedAt) {
        const dateKey = getDateKey(visit.visitedAt)
        dailyCounts.set(dateKey, (dailyCounts.get(dateKey) ?? 0) + 1)
      }

      const normalizedStatus = visit.status === 'REJECTED' ? 'CANCELLED' : visit.status
      statusCounts.set(normalizedStatus, (statusCounts.get(normalizedStatus) ?? 0) + 1)
    }

    return successResponse({
      range: {
        from: fromParam,
        to: toParam,
      },
      totalVisits,
      uniquePatientsCount: uniquePatients.length,
      completedVisitsCount: statusCounts.get('COMPLETED') ?? 0,
      pendingVisitsCount: statusCounts.get('PENDING') ?? 0,
      cancelledVisitsCount: statusCounts.get('CANCELLED') ?? 0,
      totalDiscountAmount: discountTotal._sum.discountAmount ?? 0,
      dailyBreakdown: Array.from(dailyCounts, ([date, count]) => ({ date, count })).sort((a, b) =>
        a.date.localeCompare(b.date)
      ),
      statusBreakdown: Array.from(statusCounts, ([status, count]) => ({
        status,
        label: statusLabels[status] ?? status,
        count,
      })),
    })
  } catch (err) {
    console.error('[GET /api/v1/admin/doctors/[id]/visit-stats]', err)
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500)
  }
}
