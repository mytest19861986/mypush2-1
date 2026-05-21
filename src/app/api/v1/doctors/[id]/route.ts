import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'

// GET /api/v1/doctors/[id] — Get doctor details (requires manage_doctors)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, error } = await requirePermission(request, 'manage_doctors')
    if (!authorized) return errorResponse('UNAUTHORIZED', error!, 401)

    const { id } = await params

    const doctor = await db.doctor.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            mobile: true,
            email: true,
            status: true,
            isMobileVerified: true,
            createdAt: true,
            profile: {
              select: { firstName: true, lastName: true, avatar: true, nationalCode: true },
            },
          },
        },
        contracts: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                profile: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
        _count: {
          select: { contracts: true },
        },
      },
    })

    if (!doctor) {
      return errorResponse('NOT_FOUND', 'پزشک مورد نظر یافت نشد', 404)
    }

    return successResponse(doctor)
  } catch (err) {
    console.error('[GET /api/v1/doctors/[id]]', err)
    return errorResponse('INTERNAL_ERROR', 'خطای داخلی سرور', 500)
  }
}

// PATCH /api/v1/doctors/[id] — Update doctor (discount, etc.) — requires manage_doctors
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, error } = await requirePermission(request, 'manage_doctors')
    if (!authorized) return errorResponse('UNAUTHORIZED', error!, 401)

    const { id } = await params
    const body = (await request.json()) as { discountPercent?: number }

    if (
      body.discountPercent !== undefined &&
      (typeof body.discountPercent !== 'number' ||
        body.discountPercent < 0 ||
        body.discountPercent > 100)
    ) {
      return errorResponse('VALIDATION_ERROR', 'درصد تخفیف باید بین ۰ تا ۱۰۰ باشد', 400)
    }

    const existingDoctor = await db.doctor.findUnique({ where: { id } })
    if (!existingDoctor) {
      return errorResponse('NOT_FOUND', 'پزشک مورد نظر یافت نشد', 404)
    }

    const updatedDoctor = await db.doctor.update({
      where: { id },
      data: {
        ...(body.discountPercent !== undefined && {
          discountPercent: Math.round(body.discountPercent),
        }),
      },
      include: {
        user: {
          select: {
            id: true,
            mobile: true,
            email: true,
            status: true,
            profile: {
              select: { firstName: true, lastName: true, avatar: true, nationalCode: true },
            },
          },
        },
        _count: { select: { contracts: true } },
      },
    })

    return successResponse(updatedDoctor, 'اطلاعات پزشک بروزرسانی شد')
  } catch (err) {
    console.error('[PATCH /api/v1/doctors/[id]]', err)
    return errorResponse('INTERNAL_ERROR', 'خطای داخلی سرور', 500)
  }
}
