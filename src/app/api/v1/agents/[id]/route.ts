import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'
import { maskNationalCode } from '@/lib/sales-customers'

// GET /api/v1/agents/[id] — Get agent details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authorized, payload, error } = await requirePermission(request, 'manage_agents')
  if (!authorized) {
    if (!payload) return errorResponse('UNAUTHORIZED', error!, 401)
    return errorResponse('FORBIDDEN', error!, 403)
  }

  const { id } = await params

  const agent = await db.agent.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      businessName: true,
      status: true,
      score: true,
      description: true,
      verifiedAt: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: {
          mobile: true,
          email: true,
          status: true,
          isMobileVerified: true,
          createdAt: true,
          profile: {
            select: {
              firstName: true,
              lastName: true,
              nationalCode: true,
              avatar: true,
              birthDate: true,
              gender: true,
              address: true,
              payoutCardNumber: true,
              payoutSheba: true,
              payoutAccountOwnerName: true,
            },
          },
          roles: {
            select: {
              role: { select: { name: true, title: true } },
            },
          },
        },
      },
      documents: {
        select: {
          id: true,
          type: true,
          status: true,
          reviewedAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!agent) {
    return errorResponse('NOT_FOUND', 'Agent not found', 404)
  }

  const { user } = agent
  const profile = user.profile
  const safeProfile = profile
    ? {
        firstName: profile.firstName,
        lastName: profile.lastName,
        nationalCode: profile.nationalCode, // Full unmasked national code for authorized managers in detail view
        avatar: profile.avatar,
        birthDate: profile.birthDate,
        gender: profile.gender,
        address: profile.address,
      }
    : null

  // Fetch lifecycle audit logs for this agent
  const auditLogs = await db.auditLog.findMany({
    where: {
      entity: 'Agent',
      entityId: id,
    },
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
    take: 50,
  })

  const safeAuditLogs = auditLogs.map((log) => {
    let parsedDetails: Record<string, unknown> | null = null
    try {
      if (log.details) parsedDetails = JSON.parse(log.details)
    } catch {
      parsedDetails = null
    }

    const operatorName = log.user
      ? `${log.user.profile?.firstName ?? ''} ${log.user.profile?.lastName ?? ''}`.trim() || log.user.mobile
      : 'سیستم / نامشخص'

    return {
      id: log.id,
      action: log.action,
      createdAt: log.createdAt.toISOString(),
      operatorName,
      previousStatus: parsedDetails?.previousStatus ?? null,
      newStatus: parsedDetails?.newStatus ?? null,
      reason: parsedDetails?.reason ?? null,
      correlationId: parsedDetails?.correlationId ?? null,
    }
  })

  return successResponse(
    {
      id: agent.id,
      userId: agent.userId,
      businessName: agent.businessName,
      status: agent.status,
      score: agent.score,
      description: agent.description,
      verifiedAt: agent.verifiedAt,
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt,
      documents: agent.documents,
      financialInfo: {
        payoutInfoComplete: Boolean(
          profile?.payoutCardNumber && profile?.payoutSheba && profile?.payoutAccountOwnerName
        ),
      },
      auditLogs: safeAuditLogs,
      user: {
        mobile: user.mobile,
        email: user.email,
        status: user.status,
        isMobileVerified: user.isMobileVerified,
        createdAt: user.createdAt,
        profile: safeProfile,
        roles: user.roles.map((userRole) => ({
          name: userRole.role.name,
          title: userRole.role.title,
        })),
      },
    },
    'Agent details retrieved'
  )
}
