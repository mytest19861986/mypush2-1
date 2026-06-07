import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'
import { createAuditLog } from '@/lib/audit'
import { generateReferralCode } from '@/lib/referrals'
import { normalizePayoutUpdate } from '@/lib/payout'

// GET /api/v1/agents/my — Get current user's agent info
export async function GET(request: NextRequest) {
  const { authenticated, payload, error } = await authenticateRequest(request)
  if (!authenticated) return errorResponse('UNAUTHORIZED', error!, 401)

  // Check user has AGENT role
  if (!payload!.roles.includes('AGENT')) {
    return errorResponse('FORBIDDEN', 'AGENT role required', 403)
  }

  const agent = await db.agent.findUnique({
    where: { userId: payload!.sub },
    include: {
      documents: {
        orderBy: { createdAt: 'desc' },
      },
      user: {
        select: {
          id: true,
          mobile: true,
          email: true,
          status: true,
          isMobileVerified: true,
          profile: {
            select: {
              firstName: true,
              lastName: true,
              avatar: true,
              payoutCardNumber: true,
              payoutSheba: true,
              payoutAccountOwnerName: true,
            },
          },
        },
      },
    },
  })

  if (!agent) {
    return errorResponse('NOT_FOUND', 'Agent record not found', 404)
  }

  return successResponse(
    {
      ...agent,
      referralCode: agent.status === 'APPROVED' ? generateReferralCode(payload!.sub) : null,
    },
    'Agent info retrieved'
  )
}

// PUT /api/v1/agents/my — Update current user's agent info
export async function PUT(request: NextRequest) {
  const { authenticated, payload, error } = await authenticateRequest(request)
  if (!authenticated) return errorResponse('UNAUTHORIZED', error!, 401)

  // Check user has AGENT role
  if (!payload!.roles.includes('AGENT')) {
    return errorResponse('FORBIDDEN', 'AGENT role required', 403)
  }

  const body = await request.json()
  const { businessName, description } = body as {
    businessName?: string
    description?: string
  }
  const payout = normalizePayoutUpdate(body as {
    cardNumber?: string | null
    sheba?: string | null
    accountOwnerName?: string | null
  })

  if (payout.errors.length > 0) {
    return errorResponse('VALIDATION_ERROR', payout.errors.join(', '), 400)
  }

  if (
    businessName === undefined &&
    description === undefined &&
    Object.keys(payout.values).length === 0
  ) {
    return errorResponse('VALIDATION_ERROR', 'At least one profile field is required', 400)
  }

  // Verify agent record exists
  const existingAgent = await db.agent.findUnique({
    where: { userId: payload!.sub },
  })
  if (!existingAgent) {
    return errorResponse('NOT_FOUND', 'Agent record not found', 404)
  }

  const updateData: Record<string, unknown> = {}
  if (businessName !== undefined) updateData.businessName = businessName
  if (description !== undefined) updateData.description = description

  const updatedAgent = await db.$transaction(async (tx) => {
    if (Object.keys(payout.values).length > 0) {
      await tx.userProfile.upsert({
        where: { userId: payload!.sub },
        create: {
          userId: payload!.sub,
          ...payout.values,
        },
        update: payout.values,
      })
    }

    return tx.agent.update({
      where: { userId: payload!.sub },
      data: updateData,
    })
  })

  // Create audit log
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
  const device = request.headers.get('user-agent') || undefined
  createAuditLog({
    userId: payload!.sub,
    action: 'AGENT_UPDATED',
    entity: 'Agent',
    entityId: updatedAgent.id,
    details: {
      businessName,
      description,
      payoutUpdated: Object.keys(payout.values).length > 0,
    },
    ip,
    device,
  })

  return successResponse(updatedAgent, 'Agent info updated')
}
