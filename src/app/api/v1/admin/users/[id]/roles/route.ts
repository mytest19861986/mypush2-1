import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requirePermission } from '@/lib/auth'
import { createAuditLog, AuditActions } from '@/lib/audit'
import { successResponse, errorResponse } from '@/lib/api-response'

const protectedRoleNames = new Set(['USER', 'AGENT', 'DOCTOR', 'ADMIN', 'SUPERADMIN', 'SUPER_ADMIN'])

const updateUserRolesSchema = z.object({
  roleNames: z.array(z.string().trim().min(1).max(50)).max(50),
})

function normalizeRoleName(roleName: string) {
  return roleName.trim()
}

function isProtectedRole(roleName: string) {
  return protectedRoleNames.has(roleName.toUpperCase())
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authorized, payload, error } = await requirePermission(request, 'manage_roles')
  if (!authorized) {
    return errorResponse('FORBIDDEN', error!, payload ? 403 : 401)
  }

  const { id } = await params
  if (!id || typeof id !== 'string') {
    return errorResponse('VALIDATION_ERROR', 'Invalid user id', 400)
  }

  const body = await request.json()
  const parsed = updateUserRolesSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse('VALIDATION_ERROR', parsed.error.issues.map((i) => i.message).join(', '), 400)
  }

  const requestedRoleNames = Array.from(new Set(parsed.data.roleNames.map(normalizeRoleName)))

  const targetUser = await db.user.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
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
  })

  if (!targetUser) {
    return errorResponse('NOT_FOUND', 'User not found', 404)
  }

  const requestedRoles = await db.role.findMany({
    where: { name: { in: requestedRoleNames } },
    select: { id: true, name: true, title: true },
  })

  const requestedRoleNameSet = new Set(requestedRoles.map((role) => role.name))
  const unknownRoleNames = requestedRoleNames.filter((roleName) => !requestedRoleNameSet.has(roleName))
  if (unknownRoleNames.length > 0) {
    return errorResponse('BAD_REQUEST', 'Unknown role name', 400)
  }

  const currentRoles = targetUser.roles.map((userRole) => userRole.role)
  const currentRoleNames = new Set(currentRoles.map((role) => role.name))
  const protectedRoleAdditions = requestedRoles.filter(
    (role) => isProtectedRole(role.name) && !currentRoleNames.has(role.name)
  )

  if (protectedRoleAdditions.length > 0) {
    return errorResponse('BAD_REQUEST', 'Protected roles cannot be assigned through this endpoint', 400)
  }

  const requestedEditableRoles = requestedRoles.filter((role) => !isProtectedRole(role.name))
  const finalRoleMap = new Map<string, { id: string; name: string; title: string }>()

  for (const role of currentRoles) {
    if (isProtectedRole(role.name)) {
      finalRoleMap.set(role.name, role)
    }
  }
  for (const role of requestedEditableRoles) {
    finalRoleMap.set(role.name, role)
  }

  const finalRoleIds = new Set(Array.from(finalRoleMap.values()).map((role) => role.id))
  const roleIdsToDelete = currentRoles
    .filter((role) => !isProtectedRole(role.name) && !finalRoleIds.has(role.id))
    .map((role) => role.id)
  const currentRoleIds = new Set(currentRoles.map((role) => role.id))
  const rolesToCreate = Array.from(finalRoleMap.values()).filter((role) => !currentRoleIds.has(role.id))

  await db.$transaction([
    db.userRole.deleteMany({
      where: {
        userId: targetUser.id,
        roleId: { in: roleIdsToDelete },
      },
    }),
    ...rolesToCreate.map((role) =>
      db.userRole.create({
        data: {
          userId: targetUser.id,
          roleId: role.id,
        },
      })
    ),
  ])

  const updatedUserRoles = await db.userRole.findMany({
    where: { userId: targetUser.id },
    orderBy: { assignedAt: 'asc' },
    select: {
      role: {
        select: {
          name: true,
          title: true,
        },
      },
    },
  })

  const safeRoles = updatedUserRoles.map((userRole) => ({
    name: userRole.role.name,
    title: userRole.role.title,
  }))

  await createAuditLog({
    userId: payload!.sub,
    action: AuditActions.ROLE_UPDATED,
    entity: 'User',
    entityId: targetUser.id,
    details: {
      action: 'user_roles_updated',
      previousRoles: currentRoles.map((role) => role.name),
      newRoles: safeRoles.map((role) => role.name),
    },
    ip: request.headers.get('x-forwarded-for') || undefined,
    device: request.headers.get('user-agent') || undefined,
  })

  return successResponse({ roles: safeRoles }, 'User roles updated successfully')
}
