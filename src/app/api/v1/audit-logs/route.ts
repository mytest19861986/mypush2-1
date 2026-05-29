import { NextRequest } from 'next/server'
import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { requirePermission } from '@/lib/auth'
import { errorResponse, paginatedResponse } from '@/lib/api-response'

export async function GET(request: NextRequest) {
  // ── Authentication & Authorization ──
  const { authorized, error } = await requirePermission(
    request,
    'view_audit_logs'
  )
  if (!authorized) {
    return errorResponse('FORBIDDEN', error!, 403)
  }

  // ── Parse Query Parameters ──
  const { searchParams } = request.nextUrl

  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 20))
  const action = searchParams.get('action') || undefined
  const entity = searchParams.get('entity') || undefined
  const userId = searchParams.get('userId') || undefined
  const startDate = searchParams.get('startDate') || undefined
  const endDate = searchParams.get('endDate') || undefined

  // ── Build Where Clause ──
  const where: Prisma.AuditLogWhereInput = {}

  if (action) {
    where.action = action
  }

  if (entity) {
    where.entity = entity
  }

  if (userId) {
    where.userId = userId
  }

  if (startDate || endDate) {
    where.createdAt = {
      ...(startDate ? { gte: new Date(startDate) } : {}),
      ...(endDate ? { lte: new Date(endDate) } : {}),
    }
  }

  // ── Fetch Data ──
  try {
    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
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
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.auditLog.count({ where }),
    ])

    // ── Format Response ──
    const formattedLogs = logs.map((log) => ({
      id: log.id,
      userId: log.userId,
      userName: log.user
        ? `${log.user.profile?.firstName ?? ''} ${log.user.profile?.lastName ?? ''}`.trim() || log.user.mobile
        : null,
      userMobile: log.user?.mobile ?? null,
      action: log.action,
      entity: log.entity,
      entityId: log.entityId,
      details: log.details ? JSON.parse(log.details) : null,
      ip: log.ip,
      device: log.device,
      createdAt: log.createdAt.toISOString(),
    }))

    return paginatedResponse(formattedLogs, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    })
  } catch (err) {
    console.error('[AuditLogs] Failed to fetch audit logs:', err)
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch audit logs', 500)
  }
}
