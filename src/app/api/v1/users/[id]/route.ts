import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission } from '@/lib/auth'
import { createAuditLog, AuditActions } from '@/lib/audit'
import { successResponse, errorResponse } from '@/lib/api-response'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authorized, payload, error } = await requirePermission(request, 'manage_users')
  if (!authorized) {
    return errorResponse('FORBIDDEN', error!, payload ? 403 : 401)
  }

  const { id } = await params

  const user = await db.user.findUnique({
    where: { id, deletedAt: null },
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
          nationalCode: true,
          avatar: true,
          birthDate: true,
          gender: true,
          address: true,
        },
      },
      roles: {
        select: {
          assignedAt: true,
          role: {
            select: {
              id: true,
              name: true,
              title: true,
              description: true,
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
            },
          },
        },
      },
      devices: {
        select: {
          deviceName: true,
          ip: true,
          lastLoginAt: true,
        },
        orderBy: { lastLoginAt: 'desc' },
        take: 5,
      },
    },
  })

  if (!user) {
    return errorResponse('NOT_FOUND', 'User not found', 404)
  }

  const formattedUser = {
    ...user,
    roles: user.roles.map((ur) => ({
      assignedAt: ur.assignedAt,
      ...ur.role,
      permissions: ur.role.rolePermissions.map((rp) => rp.permission),
    })),
  }

  return successResponse(formattedUser)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authorized, payload, error } = await requirePermission(request, 'manage_users')
  if (!authorized) {
    return errorResponse('FORBIDDEN', error!, payload ? 403 : 401)
  }

  const { id } = await params
  const currentUserId = payload!.sub

  // Cannot delete self
  if (id === currentUserId) {
    return errorResponse('BAD_REQUEST', 'Cannot delete your own account')
  }

  // Check if user exists and is not already deleted
  const user = await db.user.findUnique({
    where: { id, deletedAt: null },
    select: {
      id: true,
      mobile: true,
      email: true,
      roles: {
        select: {
          role: {
            select: { name: true },
          },
        },
      },
    },
  })

  if (!user) {
    return errorResponse('NOT_FOUND', 'User not found', 404)
  }

  // Check if user has SUPER_ADMIN role
  const roleNames = user.roles.map((ur) => ur.role.name)
  if (roleNames.includes('SUPER_ADMIN')) {
    return errorResponse('BAD_REQUEST', 'Cannot delete a user with SUPER_ADMIN role')
  }

  // Soft delete
  await db.user.update({
    where: { id },
    data: { deletedAt: new Date() },
  })

  // Create audit log
  createAuditLog({
    userId: currentUserId,
    action: AuditActions.USER_UPDATED,
    entity: 'User',
    entityId: id,
    details: { action: 'soft_delete', userMobile: user.mobile, userEmail: user.email },
    ip: request.headers.get('x-forwarded-for') || undefined,
    device: request.headers.get('user-agent') || undefined,
  })

  return successResponse(null, 'User deleted successfully')
}
