import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requirePermission } from '@/lib/auth'
import { createAuditLog, AuditActions } from '@/lib/audit'
import { successResponse, errorResponse } from '@/lib/api-response'

const createRoleSchema = z.object({
  name: z.string().min(1).max(50),
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
})

export async function GET(request: NextRequest) {
  const { authorized, payload, error } = await requirePermission(request, 'manage_roles')
  if (!authorized) {
    return errorResponse('FORBIDDEN', error!, payload ? 403 : 401)
  }

  const roles = await db.role.findMany({
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      name: true,
      title: true,
      description: true,
      createdAt: true,
      updatedAt: true,
      rolePermissions: {
        select: {
          permission: {
            select: {
              id: true,
              name: true,
              module: true,
              title: true,
            },
          },
        },
      },
      _count: {
        select: {
          userRoles: true,
        },
      },
    },
  })

  const formattedRoles = roles.map((role) => ({
    id: role.id,
    name: role.name,
    title: role.title,
    description: role.description,
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
    permissions: role.rolePermissions.map((rp) => rp.permission),
    userCount: role._count.userRoles,
  }))

  return successResponse(formattedRoles)
}

export async function POST(request: NextRequest) {
  const { authorized, payload, error } = await requirePermission(request, 'manage_roles')
  if (!authorized) {
    return errorResponse('FORBIDDEN', error!, payload ? 403 : 401)
  }

  const body = await request.json()
  const parsed = createRoleSchema.safeParse(body)

  if (!parsed.success) {
    return errorResponse('VALIDATION_ERROR', parsed.error.issues.map((i) => i.message).join(', '))
  }

  const { name, title, description } = parsed.data

  // Check if role name already exists
  const existingRole = await db.role.findUnique({
    where: { name },
  })

  if (existingRole) {
    return errorResponse('CONFLICT', `Role with name '${name}' already exists`, 409)
  }

  const role = await db.role.create({
    data: {
      name,
      title,
      description: description || '',
    },
  })

  // Create audit log
  createAuditLog({
    userId: payload!.sub,
    action: AuditActions.ROLE_UPDATED,
    entity: 'Role',
    entityId: role.id,
    details: { name, title, action: 'created' },
    ip: request.headers.get('x-forwarded-for') || undefined,
    device: request.headers.get('user-agent') || undefined,
  })

  return successResponse(role, 'Role created successfully', 201)
}
