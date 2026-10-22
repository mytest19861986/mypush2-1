import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requirePermission } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'
import { createAuditLog, AuditActions } from '@/lib/audit'
import { assertNoDoctorConflict } from '@/lib/role-integrity'

const statusSchema = z.object({

  status: z.enum(['APPROVED', 'REJECTED', 'SUSPENDED']),
  reason: z.string().trim().max(500).optional(),
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

  const { status, reason } = parsed.data

  // Check agent exists
  const agent = await db.agent.findUnique({ where: { id } })
  if (!agent) {
    return errorResponse('NOT_FOUND', 'Agent not found', 404)
  }

  // Idempotency: If status is identical, return success immediately without generating duplicate audit log
  if (agent.status === status) {
    return successResponse(agent, `Agent status is already ${status}`)
  }

  const previousStatus = agent.status
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
  const device = request.headers.get('user-agent') || undefined
  const correlationId = request.headers.get('x-request-id') || request.headers.get('x-correlation-id') || undefined

  if (status === 'APPROVED') {
    try {
      await assertNoDoctorConflict({ userId: agent.userId })
    } catch (conflictErr: any) {
      return errorResponse('CONFLICT', conflictErr.message, 409)
    }
  }

  // Execute agent status update, role assignment, and audit log atomically inside a single transaction
  const updatedAgent = await db.$transaction(async (tx) => {
    if (status === 'APPROVED') {
      await assertNoDoctorConflict({ userId: agent.userId }, tx)
    }

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

    // Atomic Audit Log creation inside transaction (prevents partial status or decoupled audit)
    const auditDetails = {
      agentId: id,
      previousStatus,
      newStatus: status,
      ...(reason ? { reason } : {}),
      ...(correlationId ? { correlationId } : {}),
    }

    await tx.auditLog.create({
      data: {
        userId: payload!.sub,
        action: AuditActions.AGENT_STATUS_CHANGED,
        entity: 'Agent',
        entityId: id,
        details: JSON.stringify(auditDetails),
        ip,
        device,
      },
    })

    return updated
  })

  return successResponse(updatedAgent, `Agent status updated to ${status}`)
}
