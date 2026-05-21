import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requirePermission } from '@/lib/auth'
import { createAuditLog, AuditActions } from '@/lib/audit'
import { successResponse, errorResponse } from '@/lib/api-response'

const updatePermissionsSchema = z.object({
  permissionIds: z.array(z.string().min(1)),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authorized, payload, error } = await requirePermission(request, 'manage_permissions')
  if (!authorized) {
    return errorResponse('FORBIDDEN', error!, payload ? 403 : 401)
  }

  const { id } = await params

  // Validate request body
  const body = await request.json()
  const parsed = updatePermissionsSchema.safeParse(body)

  if (!parsed.success) {
    return errorResponse('VALIDATION_ERROR', parsed.error.issues.map((i) => i.message).join(', '))
  }

  const { permissionIds } = parsed.data

  // Check if role exists
  const role = await db.role.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      rolePermissions: {
        select: {
          permissionId: true,
        },
      },
    },
  })

  if (!role) {
    return errorResponse('NOT_FOUND', 'Role not found', 404)
  }

  // Verify all permission IDs exist
  const existingPermissions = await db.permission.findMany({
    where: { id: { in: permissionIds } },
    select: { id: true },
  })

  const validIds = new Set(existingPermissions.map((p) => p.id))
  const invalidIds = permissionIds.filter((pid) => !validIds.has(pid))

  if (invalidIds.length > 0) {
    return errorResponse('BAD_REQUEST', `Permission IDs not found: ${invalidIds.join(', ')}`)
  }

  // Get previous permission IDs for audit
  const previousPermissionIds = role.rolePermissions.map((rp) => rp.permissionId)

  // Delete existing role-permission mappings and create new ones in a transaction
  await db.$transaction([
    db.rolePermission.deleteMany({ where: { roleId: id } }),
    ...permissionIds.map((permissionId) =>
      db.rolePermission.create({
        data: { roleId: id, permissionId },
      })
    ),
  ])

  // Create audit log
  createAuditLog({
    userId: payload!.sub,
    action: AuditActions.PERMISSION_UPDATED,
    entity: 'Role',
    entityId: id,
    details: {
      roleName: role.name,
      previousPermissions: previousPermissionIds,
      newPermissions: permissionIds,
    },
    ip: request.headers.get('x-forwarded-for') || undefined,
    device: request.headers.get('user-agent') || undefined,
  })

  return successResponse(
    { roleId: id, permissionIds },
    'Role permissions updated successfully'
  )
}
