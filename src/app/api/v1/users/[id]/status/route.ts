import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requirePermission } from '@/lib/auth'
import { createAuditLog, AuditActions } from '@/lib/audit'
import { successResponse, errorResponse } from '@/lib/api-response'

const statusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE', 'BLOCKED']),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authorized, payload, error } = await requirePermission(request, 'manage_users')
  if (!authorized) {
    return errorResponse('FORBIDDEN', error!, payload ? 403 : 401)
  }

  const { id } = await params

  // Validate request body
  const body = await request.json()
  const parsed = statusSchema.safeParse(body)

  if (!parsed.success) {
    return errorResponse('VALIDATION_ERROR', parsed.error.issues.map((i) => i.message).join(', '))
  }

  const newStatus = parsed.data.status

  // Check if user exists
  const user = await db.user.findUnique({
    where: { id, deletedAt: null },
    select: { id: true, status: true },
  })

  if (!user) {
    return errorResponse('NOT_FOUND', 'User not found', 404)
  }

  if (user.status === newStatus) {
    return errorResponse('BAD_REQUEST', `User status is already '${newStatus}'`)
  }

  const previousStatus = user.status

  // Update user status
  await db.user.update({
    where: { id },
    data: { status: newStatus },
  })

  // Create audit log
  createAuditLog({
    userId: payload!.sub,
    action: AuditActions.USER_STATUS_CHANGED,
    entity: 'User',
    entityId: id,
    details: { previousStatus, newStatus },
    ip: request.headers.get('x-forwarded-for') || undefined,
    device: request.headers.get('user-agent') || undefined,
  })

  return successResponse(
    { id, status: newStatus },
    `User status updated to '${newStatus}'`
  )
}
