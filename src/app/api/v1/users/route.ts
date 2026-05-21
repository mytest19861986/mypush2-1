import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requirePermission } from '@/lib/auth'
import { successResponse, errorResponse, paginatedResponse } from '@/lib/api-response'

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'BLOCKED']).optional(),
  role: z.string().optional(),
})

export async function GET(request: NextRequest) {
  const { authorized, payload, error } = await requirePermission(request, 'manage_users')
  if (!authorized) {
    return errorResponse('FORBIDDEN', error!, payload ? 403 : 401)
  }

  const { searchParams } = request.nextUrl
  const parsed = querySchema.safeParse(Object.fromEntries(searchParams))

  if (!parsed.success) {
    return errorResponse('VALIDATION_ERROR', parsed.error.issues.map((i) => i.message).join(', '))
  }

  const { page, limit, search, status, role } = parsed.data
  const skip = (page - 1) * limit

  // Build where clause
  const where: Record<string, unknown> = { deletedAt: null }

  if (search) {
    where.OR = [
      { mobile: { contains: search } },
      { email: { contains: search } },
      { profile: { firstName: { contains: search } } },
      { profile: { lastName: { contains: search } } },
    ]
  }

  if (status) {
    where.status = status
  }

  if (role) {
    where.roles = {
      some: {
        role: { name: role },
      },
    }
  }

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        mobile: true,
        email: true,
        status: true,
        isMobileVerified: true,
        createdAt: true,
        updatedAt: true,
        profile: {
          select: {
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        roles: {
          select: {
            role: {
              select: {
                id: true,
                name: true,
                title: true,
              },
            },
          },
        },
      },
    }),
    db.user.count({ where }),
  ])

  const formattedUsers = users.map((user) => ({
    id: user.id,
    mobile: user.mobile,
    email: user.email,
    status: user.status,
    isMobileVerified: user.isMobileVerified,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    profile: user.profile,
    roles: user.roles.map((ur) => ur.role),
  }))

  return paginatedResponse(formattedUsers, {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  })
}
