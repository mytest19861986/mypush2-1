import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requirePermission } from '@/lib/auth'
import { successResponse, errorResponse, paginatedResponse } from '@/lib/api-response'

const validStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'] as const

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  status: z.enum(validStatuses).optional(),
  specialty: z.string().optional(),
})

// GET /api/v1/doctors — List doctors (requires manage_doctors permission)
export async function GET(request: NextRequest) {
  try {
    const { authorized, error } = await requirePermission(request, 'manage_doctors')
    if (!authorized) return errorResponse('UNAUTHORIZED', error!, 401)

    const { searchParams } = request.nextUrl
    const parsed = querySchema.safeParse(Object.fromEntries(searchParams))
    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', parsed.error.issues.map((e) => e.message).join('. '), 400)
    }

    const { page, limit, search, status, specialty } = parsed.data
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (status) {
      where.status = status
    }
    if (specialty) {
      where.specialty = specialty
    }
    if (search) {
      where.OR = [
        { specialty: { contains: search } },
        { clinicName: { contains: search } },
        { city: { contains: search } },
        { medicalCode: { contains: search } },
        { user: {
          OR: [
            { mobile: { contains: search } },
            { profile: { OR: [
              { firstName: { contains: search } },
              { lastName: { contains: search } },
            ]}},
          ],
        }},
      ]
    }

    const [doctors, total] = await Promise.all([
      db.doctor.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              mobile: true,
              email: true,
              status: true,
              profile: { select: { firstName: true, lastName: true, avatar: true } },
            },
          },
          _count: {
            select: { contracts: true },
          },
        },
      }),
      db.doctor.count({ where }),
    ])

    return paginatedResponse(doctors, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    })
  } catch (err) {
    console.error('[GET /api/v1/doctors]', err)
    return errorResponse('INTERNAL_ERROR', 'خطای داخلی سرور', 500)
  }
}
