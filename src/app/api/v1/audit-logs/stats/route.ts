import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission } from '@/lib/auth'
import { errorResponse, successResponse } from '@/lib/api-response'

interface AuditStats {
  totalLogs: number
  todayLogs: number
  topActions: { action: string; count: number }[]
  topUsers: { userId: string; userName: string; userMobile: string; count: number }[]
  recentActions: {
    id: string
    action: string
    entity: string | null
    entityId: string | null
    userId: string | null
    userName: string | null
    userMobile: string | null
    createdAt: string
  }[]
}

export async function GET(request: NextRequest) {
  // ── Authentication & Authorization ──
  const { authorized, error } = await requirePermission(
    request,
    'view_audit_logs'
  )
  if (!authorized) {
    return errorResponse('FORBIDDEN', error!, 403)
  }

  // ── Compute Date Boundaries ──
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  try {
    // ── Fetch Stats in Parallel ──
    const [totalLogs, todayLogs, topActionsRaw, topUsersRaw, recentActions] =
      await Promise.all([
        // Total count
        db.auditLog.count(),

        // Today's count
        db.auditLog.count({
          where: {
            createdAt: {
              gte: todayStart,
              lte: todayEnd,
            },
          },
        }),

        // Top actions — group by action, take top 5
        db.auditLog.groupBy({
          by: ['action'],
          _count: { action: true },
          orderBy: { _count: { action: 'desc' } },
          take: 5,
        }),

        // Top users — group by userId, take top 5
        db.auditLog.groupBy({
          by: ['userId'],
          where: { userId: { not: null } },
          _count: { userId: true },
          orderBy: { _count: { userId: 'desc' } },
          take: 5,
        }),

        // Recent actions — last 10 with user info
        db.auditLog.findMany({
          include: {
            user: {
              select: {
                id: true,
                mobile: true,
                profile: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
      ])

    // ── Enrich Top Users with Names ──
    const topUserIds = topUsersRaw.map((u) => u.userId).filter(Boolean) as string[]
    const topUsersFromDb =
      topUserIds.length > 0
        ? await db.user.findMany({
            where: { id: { in: topUserIds } },
            select: {
              id: true,
              mobile: true,
              profile: {
                select: { firstName: true, lastName: true },
              },
            },
          })
        : []

    const userMap = new Map(topUsersFromDb.map((u) => [u.id, u]))

    const topUsers = topUsersRaw.map((item) => {
      const user = userMap.get(item.userId as string)
      const userName = user
        ? `${user.profile?.firstName ?? ''} ${user.profile?.lastName ?? ''}`.trim() || user.mobile
        : 'Unknown'
      return {
        userId: item.userId as string,
        userName,
        userMobile: user?.mobile ?? '',
        count: item._count.userId,
      }
    })

    // ── Format Top Actions ──
    const topActions = topActionsRaw.map((item) => ({
      action: item.action,
      count: item._count.action,
    }))

    // ── Format Recent Actions ──
    const formattedRecent = recentActions.map((log) => ({
      id: log.id,
      action: log.action,
      entity: log.entity,
      entityId: log.entityId,
      userId: log.userId,
      userName: log.user
        ? `${log.user.profile?.firstName ?? ''} ${log.user.profile?.lastName ?? ''}`.trim() || log.user.mobile
        : null,
      userMobile: log.user?.mobile ?? null,
      createdAt: log.createdAt.toISOString(),
    }))

    // ── Build Stats Object ──
    const stats: AuditStats = {
      totalLogs,
      todayLogs,
      topActions,
      topUsers,
      recentActions: formattedRecent,
    }

    return successResponse(stats)
  } catch (err) {
    console.error('[AuditLogs] Failed to fetch audit stats:', err)
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch audit statistics', 500)
  }
}
