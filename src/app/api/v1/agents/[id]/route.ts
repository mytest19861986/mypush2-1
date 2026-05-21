import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission, authenticateRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'

// GET /api/v1/agents/[id] — Get agent details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authorized, payload, error } = await requirePermission(request, 'manage_agents')
  if (!authorized) return errorResponse('UNAUTHORIZED', error!, 401)

  const { id } = await params

  const agent = await db.agent.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
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
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!agent) {
    return errorResponse('NOT_FOUND', 'Agent not found', 404)
  }

  return successResponse(agent, 'Agent details retrieved')
}
