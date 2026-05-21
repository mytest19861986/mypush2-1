import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requirePermission } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'
import { createAuditLog, AuditActions } from '@/lib/audit'

const reviewSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
})

// PATCH /api/v1/agents/documents/[id]/review — Review agent document
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authorized, payload, error } = await requirePermission(request, 'approve_agents')
  if (!authorized) return errorResponse('UNAUTHORIZED', error!, 401)

  const { id } = await params

  const body = await request.json()
  const parsed = reviewSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse('VALIDATION_ERROR', 'Status must be APPROVED or REJECTED', 400)
  }

  const { status } = parsed.data

  // Check document exists
  const document = await db.agentDocument.findUnique({
    where: { id },
    include: { agent: true },
  })
  if (!document) {
    return errorResponse('NOT_FOUND', 'Document not found', 404)
  }

  if (document.status !== 'PENDING') {
    return errorResponse('CONFLICT', 'Document has already been reviewed', 409)
  }

  const updatedDocument = await db.agentDocument.update({
    where: { id },
    data: {
      status,
      reviewedBy: payload!.sub,
      reviewedAt: new Date(),
    },
    include: {
      reviewer: {
        select: {
          id: true,
          profile: { select: { firstName: true, lastName: true } },
        },
      },
    },
  })

  // Create audit log
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
  const device = request.headers.get('user-agent') || undefined
  createAuditLog({
    userId: payload!.sub,
    action: AuditActions.DOCUMENT_REVIEWED,
    entity: 'AgentDocument',
    entityId: id,
    details: {
      documentId: id,
      agentId: document.agentId,
      previousStatus: document.status,
      newStatus: status,
    },
    ip,
    device,
  })

  return successResponse(updatedDocument, `Document review status updated to ${status}`)
}
