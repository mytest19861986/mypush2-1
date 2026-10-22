import { Prisma, PrismaClient } from '@prisma/client'
import { db } from '@/lib/db'
import { normalizeMobile } from '@/lib/phone'

type PrismaTx = Prisma.TransactionClient | PrismaClient

/**
 * Asserts that a user identity does NOT possess the conflicting DOCTOR role or record
 * before allowing AGENT creation, update, or approval.
 */
export async function assertNoDoctorConflict(
  identity: { userId?: string; mobile?: string },
  tx: PrismaTx = db
): Promise<void> {
  const normalized = identity.mobile ? normalizeMobile(identity.mobile) : undefined

  let userId = identity.userId
  if (!userId && normalized) {
    const user = await tx.user.findUnique({
      where: { mobile: normalized },
      select: { id: true },
    })
    if (user) {
      userId = user.id
    }
  }

  if (userId) {
    const [existingDoctor, doctorUserRole] = await Promise.all([
      tx.doctor.findUnique({
        where: { userId },
        select: { id: true, status: true },
      }),
      tx.userRole.findFirst({
        where: {
          userId,
          role: { name: 'DOCTOR' },
        },
        select: { id: true },
      }),
    ])

    if (existingDoctor || doctorUserRole) {
      throw new Error('تعارض نقش: این هویت دارای پرونده یا نقش حرفه‌ای پزشک (DOCTOR) است و نمی‌تواند همزمان به عنوان همکار فروش (AGENT) ثبت یا تأیید شود.')
    }
  }
}

/**
 * Asserts that a user identity does NOT possess the conflicting AGENT role or record
 * before allowing DOCTOR creation, update, or approval.
 */
export async function assertNoAgentConflict(
  identity: { userId?: string; mobile?: string },
  tx: PrismaTx = db
): Promise<void> {
  const normalized = identity.mobile ? normalizeMobile(identity.mobile) : undefined

  let userId = identity.userId
  if (!userId && normalized) {
    const user = await tx.user.findUnique({
      where: { mobile: normalized },
      select: { id: true },
    })
    if (user) {
      userId = user.id
    }
  }

  if (userId) {
    const [existingAgent, agentUserRole] = await Promise.all([
      tx.agent.findUnique({
        where: { userId },
        select: { id: true, status: true },
      }),
      tx.userRole.findFirst({
        where: {
          userId,
          role: { name: 'AGENT' },
        },
        select: { id: true },
      }),
    ])

    if (existingAgent || agentUserRole) {
      throw new Error('تعارض نقش: این هویت دارای پرونده یا نقش حرفه‌ای همکار فروش (AGENT) است و نمی‌تواند همزمان به عنوان پزشک (DOCTOR) ثبت یا تأیید شود.')
    }
  }
}
