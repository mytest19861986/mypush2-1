import { db } from './db'

/**
 * Get all permission names for a user by resolving their roles.
 * Queries the database to find all roles assigned to the user,
 * then collects all permissions associated with those roles.
 */
export async function getUserPermissions(userId: string): Promise<string[]> {
  const rolePermissions = await db.rolePermission.findMany({
    where: {
      role: {
        userRoles: {
          some: {
            userId,
          },
        },
      },
    },
    select: {
      permission: {
        select: {
          name: true,
        },
      },
    },
  })

  // Deduplicate permission names in case multiple roles share the same permission
  const permissionSet = new Set<string>()
  for (const rp of rolePermissions) {
    permissionSet.add(rp.permission.name)
  }

  return Array.from(permissionSet)
}

/**
 * Check if a user has a specific permission.
 */
export async function hasPermission(
  userId: string,
  permission: string
): Promise<boolean> {
  const permissions = await getUserPermissions(userId)
  return permissions.includes(permission)
}

/**
 * Get all role names assigned to a user.
 */
export async function getUserRoles(userId: string): Promise<string[]> {
  const userRoles = await db.userRole.findMany({
    where: { userId },
    select: {
      role: {
        select: {
          name: true,
        },
      },
    },
  })

  return userRoles.map((ur) => ur.role.name)
}
