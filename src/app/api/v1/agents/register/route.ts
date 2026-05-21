import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'
import { createAuditLog, AuditActions } from '@/lib/audit'

const registerSchema = z.object({
  businessName: z.string().max(255).optional(),
  description: z.string().max(2000).optional(),
})

// POST /api/v1/agents/register — Register as agent
export async function POST(request: NextRequest) {
  const { authenticated, payload, error } = await authenticateRequest(request)
  if (!authenticated) return errorResponse('UNAUTHORIZED', error!, 401)

  // Check user has USER role (any authenticated user)
  if (!payload!.roles.includes('USER')) {
    return errorResponse('FORBIDDEN', 'USER role required', 403)
  }

  const body = await request.json()
  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse('VALIDATION_ERROR', parsed.error.issues.map((e) => e.message).join(', '), 400)
  }

  const { businessName, description } = parsed.data

  // Check if agent record already exists for this user
  const existingAgent = await db.agent.findUnique({
    where: { userId: payload!.sub },
  })
  if (existingAgent) {
    return errorResponse('CONFLICT', 'Agent registration already exists for this user', 409)
  }

  // Create agent record
  const agent = await db.agent.create({
    data: {
      userId: payload!.sub,
      businessName: businessName || null,
      description: description || null,
      status: 'PENDING',
    },
  })

  // Create audit log
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
  const device = request.headers.get('user-agent') || undefined
  createAuditLog({
    userId: payload!.sub,
    action: AuditActions.AGENT_CREATED,
    entity: 'Agent',
    entityId: agent.id,
    details: { businessName, description },
    ip,
    device,
  })

  return successResponse(agent, 'Agent registration submitted successfully', 201)
}
