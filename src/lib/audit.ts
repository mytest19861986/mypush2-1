import { db } from './db'

/**
 * All possible audit actions in the system.
 * Used as a consistent enum-like constant for logging.
 */
export const AuditActions = {
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGIN_FAILED: 'USER_LOGIN_FAILED',
  USER_LOGOUT: 'USER_LOGOUT',
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_STATUS_CHANGED: 'USER_STATUS_CHANGED',
  AGENT_CREATED: 'AGENT_CREATED',
  AGENT_STATUS_CHANGED: 'AGENT_STATUS_CHANGED',
  DOCUMENT_UPLOADED: 'DOCUMENT_UPLOADED',
  DOCUMENT_REVIEWED: 'DOCUMENT_REVIEWED',
  ROLE_UPDATED: 'ROLE_UPDATED',
  PERMISSION_UPDATED: 'PERMISSION_UPDATED',
  UPLOAD_CREATED: 'UPLOAD_CREATED',
} as const

export type AuditAction = (typeof AuditActions)[keyof typeof AuditActions]

interface CreateAuditLogParams {
  userId?: string
  action: string
  entity?: string
  entityId?: string
  details?: Record<string, unknown>
  ip?: string
  device?: string
}

/**
 * Create an audit log entry in the database.
 * This is a fire-and-forget operation — errors are logged but not thrown.
 */
export async function createAuditLog(
  params: CreateAuditLogParams
): Promise<void> {
  const { userId, action, entity, entityId, details, ip, device } = params

  try {
    await db.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId,
        details: details ? JSON.stringify(details) : null,
        ip,
        device,
      },
    })
  } catch (error) {
    console.error('[AuditLog] Failed to create audit log:', error)
  }
}
