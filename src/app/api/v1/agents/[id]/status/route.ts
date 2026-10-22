import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requirePermission } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'
import { createAuditLog, AuditActions } from '@/lib/audit'

const statusSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'SUSPENDED']),
})

// PATCH /api/v1/agents/[id]/status — Update agent status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authorized, payload, error } = await requirePermission(request, 'approve_agents')
  if (!authorized) {
    if (!payload) return errorResponse('UNAUTHORIZED', error!, 401)
    return errorResponse('FORBIDDEN', error!, 403)
  }

  const { id } = await params

  const body = await request.json()
  const parsed = statusSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse('VALIDATION_ERROR', 'Invalid status. Must be APPROVED, REJECTED, or SUSPENDED', 400)
  }

  const { status } = parsed.data

  // Check agent exists
  const agent = await db.agent.findUnique({ where: { id } })
  if (!agent) {
    return errorResponse('NOT_FOUND', 'Agent not found', 404)
  }

  // Execute agent status update and role assignment atomically inside a transaction
  const updatedAgent = await db.$transaction(async (tx) => {
    const updateData: Record<string, unknown> = { status }
    if (status === 'APPROVED') {
      updateData.verifiedAt = new Date()
    }

    const updated = await tx.agent.update({
      where: { id },
      data: updateData,
    })

    // Assign/remove AGENT role based on status
    const agentRole = await tx.role.findUnique({ where: { name: 'AGENT' } })
    if (agentRole) {
      if (status === 'APPROVED') {
        // Assign AGENT role idempotently
        await tx.userRole.upsert({
          where: {
            userId_roleId: {
              userId: agent.userId,
              roleId: agentRole.id,
            },
          },
          create: {
            userId: agent.userId,
            roleId: agentRole.id,
          },
          update: {},
        })
      } else if (status === 'REJECTED' || status === 'SUSPENDED') {
        // Remove AGENT role so user safely returns to base USER panel
        await tx.userRole.deleteMany({
          where: {
            userId: agent.userId,
            roleId: agentRole.id,
          },
        })
      }
    }

    return updated
  })

  // Create audit log
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
  const device = request.headers.get('user-agent') || undefined
  createAuditLog({
    userId: payload!.sub,
    action: AuditActions.AGENT_STATUS_CHANGED,
    entity: 'Agent',
    entityId: id,
    details: { agentId: id, previousStatus: agent.status, newStatus: status },
    ip,
    device,
  })

  return successResponse(updatedAgent, `Agent status updated to ${status}`)
}
