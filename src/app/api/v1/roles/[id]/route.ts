import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authorized, payload, error } = await requirePermission(request, 'manage_roles')
  if (!authorized) {
    return errorResponse('FORBIDDEN', error!, payload ? 403 : 401)
  }

  const { id } = await params

  const role = await db.role.findUnique({
    where: { id },
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

  if (!role) {
    return errorResponse('NOT_FOUND', 'Role not found', 404)
  }

  const formattedRole = {
    id: role.id,
    name: role.name,
    title: role.title,
    description: role.description,
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
    permissions: role.rolePermissions.map((rp) => rp.permission),
    userCount: role._count.userRoles,
  }

  return successResponse(formattedRole)
}
