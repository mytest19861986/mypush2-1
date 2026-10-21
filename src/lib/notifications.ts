import { Prisma, PrismaClient } from '@prisma/client'
import { db } from './db'

export const NotificationTypes = {
  PLAN_ACTIVATED: 'PLAN_ACTIVATED',
  PLAN_EXPIRING: 'PLAN_EXPIRING',
  VISIT_RECORDED_PATIENT: 'VISIT_RECORDED_PATIENT',
  VISIT_RECORDED_DOCTOR: 'VISIT_RECORDED_DOCTOR',
  DOCTOR_STATUS_CHANGED: 'DOCTOR_STATUS_CHANGED',
  AGENT_STATUS_CHANGED: 'AGENT_STATUS_CHANGED',
  COMMISSION_EARNED: 'COMMISSION_EARNED',
  SETTLEMENT_STATUS: 'SETTLEMENT_STATUS',
  DOCUMENT_REQUIRED: 'DOCUMENT_REQUIRED',
  ADMIN_NEW_DOCTOR_PENDING: 'ADMIN_NEW_DOCTOR_PENDING',
  ADMIN_SETTLEMENT_REQUEST: 'ADMIN_SETTLEMENT_REQUEST',
  SYSTEM_ANNOUNCEMENT: 'SYSTEM_ANNOUNCEMENT',
} as const

export type NotificationType = keyof typeof NotificationTypes

export const NotificationPriorities = {
  LOW: 'LOW',
  NORMAL: 'NORMAL',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
} as const

export type NotificationPriority = keyof typeof NotificationPriorities

export interface CreateNotificationInput {
  userId: string
  type: string
  title: string
  message: string
  priority?: NotificationPriority
  referenceId?: string | null
  link?: string | null
}

export function validateNotificationInput(input: CreateNotificationInput) {
  if (!input.userId || typeof input.userId !== 'string') {
    throw new Error('شناسه کاربر (userId) الزامی و باید رشته معتبر باشد.')
  }

  if (!input.type || typeof input.type !== 'string') {
    throw new Error('نوع اعلان (type) الزامی است.')
  }

  if (!Object.values(NotificationTypes).includes(input.type as NotificationType)) {
    throw new Error(`نوع اعلان '${input.type}' در کاتالوگ اعلان‌های مصوب تعریف نشده است.`)
  }

  if (!input.title || typeof input.title !== 'string') {
    throw new Error('عنوان اعلان (title) الزامی است.')
  }

  const trimmedTitle = input.title.trim()
  if (trimmedTitle.length < 2 || trimmedTitle.length > 100) {
    throw new Error('طول عنوان اعلان باید بین ۲ تا ۱۰۰ کاراکتر باشد.')
  }

  if (!input.message || typeof input.message !== 'string') {
    throw new Error('متن اعلان (message) الزامی است.')
  }

  const trimmedMessage = input.message.trim()
  if (trimmedMessage.length < 2 || trimmedMessage.length > 500) {
    throw new Error('طول متن اعلان باید بین ۲ تا ۵۰۰ کاراکتر باشد.')
  }

  if (input.priority && !Object.values(NotificationPriorities).includes(input.priority)) {
    throw new Error(`اولویت اعلان '${input.priority}' نامعتبر است.`)
  }

  if (input.link) {
    if (typeof input.link !== 'string') {
      throw new Error('لینک اعلان باید رشته معتبر باشد.')
    }
    const trimmedLink = input.link.trim()
    // Enforce internal dashboard routes only - prevent open redirects
    if (!trimmedLink.startsWith('/')) {
      throw new Error('لینک اعلان باید یک مسیر داخلی درون سامانه باشد (مانند /dashboard). لینک‌های خارجی مجاز نیستند.')
    }
    if (trimmedLink.length > 255) {
      throw new Error('طول لینک اعلان نباید از ۲۵۵ کاراکتر بیشتر باشد.')
    }
  }

  return {
    ...input,
    title: trimmedTitle,
    message: trimmedMessage,
    priority: input.priority || NotificationPriorities.NORMAL,
    link: input.link ? input.link.trim() : null,
    referenceId: input.referenceId ? input.referenceId.trim() : null,
  }
}

/**
 * Core Service to create an in-app notification.
 * Accepts optional Prisma transaction client for atomic execution.
 */
export async function createNotification(
  input: CreateNotificationInput,
  tx?: Prisma.TransactionClient | PrismaClient
) {
  const client = tx || db
  const validated = validateNotificationInput(input)

  return (client as any).notification.create({
    data: {
      userId: validated.userId,
      type: validated.type,
      title: validated.title,
      message: validated.message,
      priority: validated.priority,
      referenceId: validated.referenceId,
      link: validated.link,
      read: false,
    },
  })
}
