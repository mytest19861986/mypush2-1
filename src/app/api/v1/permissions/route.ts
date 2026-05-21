import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requirePermission } from '@/lib/auth'
import { createAuditLog, AuditActions } from '@/lib/audit'
import { successResponse, errorResponse } from '@/lib/api-response'

const querySchema = z.object({
  module: z.string().optional(),
})

const createPermissionSchema = z.object({
  name: z.string().min(1).max(100),
  module: z.string().min(1).max(50),
  title: z.string().max(200).optional(),
})

export async function GET(request: NextRequest) {
  const { authorized, payload, error } = await requirePermission(request, 'manage_permissions')
  if (!authorized) {
    return errorResponse('FORBIDDEN', error!, payload ? 403 : 401)
  }

  const { searchParams } = request.nextUrl
  const parsed = querySchema.safeParse(Object.fromEntries(searchParams))

  if (!parsed.success) {
    return errorResponse('VALIDATION_ERROR', parsed.error.issues.map((i) => i.message).join(', '))
  }

  const where = parsed.data.module ? { module: parsed.data.module } : {}

  const permissions = await db.permission.findMany({
    where,
    orderBy: [{ module: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      module: true,
      title: true,
      createdAt: true,
    },
  })

  // Group by module
  const grouped = permissions.reduce<Record<string, typeof permissions>>((acc, p) => {
    if (!acc[p.module]) {
      acc[p.module] = []
    }
    acc[p.module].push(p)
    return acc
  }, {})

  return successResponse({
    all: permissions,
    grouped,
  })
}

export async function POST(request: NextRequest) {
  const { authorized, payload, error } = await requirePermission(request, 'manage_permissions')
  if (!authorized) {
    return errorResponse('FORBIDDEN', error!, payload ? 403 : 401)
  }

  const body = await request.json()
  const parsed = createPermissionSchema.safeParse(body)

  if (!parsed.success) {
    return errorResponse('VALIDATION_ERROR', parsed.error.issues.map((i) => i.message).join(', '))
  }

  const { name, module, title } = parsed.data

  // Check if permission name already exists
  const existingPermission = await db.permission.findUnique({
    where: { name },
  })

  if (existingPermission) {
    return errorResponse('CONFLICT', `Permission with name '${name}' already exists`, 409)
  }

  const permission = await db.permission.create({
    data: {
      name,
      module,
      title: title || '',
    },
  })

  // Create audit log
  createAuditLog({
    userId: payload!.sub,
    action: AuditActions.PERMISSION_UPDATED,
    entity: 'Permission',
    entityId: permission.id,
    details: { name, module, title, action: 'created' },
    ip: request.headers.get('x-forwarded-for') || undefined,
    device: request.headers.get('user-agent') || undefined,
  })

  return successResponse(permission, 'Permission created successfully', 201)
}
