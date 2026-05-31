import { db } from '@/lib/db'
import { AuditActions } from '@/lib/audit'
import { getClientIp } from '@/app/api/v1/auth/_helpers'

interface LinkPlanHolderToUserByNationalCodeParams {
  userId: string
  nationalCode: string
  actorId?: string
  request?: Request
}

interface LinkPlanHolderToUserByNationalCodeResult {
  linked: boolean
  conflict: boolean
  planHolderId?: string
  linkedUserPlansCount: number
}

function maskNationalCode(nationalCode: string) {
  const trimmed = nationalCode.trim()
  if (trimmed.length <= 4) return '*'.repeat(trimmed.length)
  return `${'*'.repeat(trimmed.length - 4)}${trimmed.slice(-4)}`
}

function getRequestAuditInfo(request?: Request) {
  return {
    ip: request ? getClientIp(request) : undefined,
    device: request?.headers.get('user-agent') || undefined,
  }
}

export async function linkPlanHolderToUserByNationalCode(
  params: LinkPlanHolderToUserByNationalCodeParams
): Promise<LinkPlanHolderToUserByNationalCodeResult> {
  const nationalCode = params.nationalCode.trim()

  if (!nationalCode) {
    return {
      linked: false,
      conflict: false,
      linkedUserPlansCount: 0,
    }
  }

  return db.$transaction(async (tx) => {
    const planHolder = await tx.planHolder.findFirst({
      where: {
        nationalCode,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        userId: true,
      },
    })

    if (!planHolder) {
      return {
        linked: false,
        conflict: false,
        linkedUserPlansCount: 0,
      }
    }

    if (planHolder.userId && planHolder.userId !== params.userId) {
      return {
        linked: false,
        conflict: true,
        planHolderId: planHolder.id,
        linkedUserPlansCount: 0,
      }
    }

    let planHolderLinked = false

    if (!planHolder.userId) {
      // Intentional optimistic locking: only link if another request has not already assigned this PlanHolder.
      const updatedPlanHolder = await tx.planHolder.updateMany({
        where: {
          id: planHolder.id,
          userId: null,
        },
        data: {
          userId: params.userId,
        },
      })

      planHolderLinked = updatedPlanHolder.count > 0

      if (!planHolderLinked) {
        const currentPlanHolder = await tx.planHolder.findUnique({
          where: { id: planHolder.id },
          select: { userId: true },
        })

        if (currentPlanHolder?.userId && currentPlanHolder.userId !== params.userId) {
          return {
            linked: false,
            conflict: true,
            planHolderId: planHolder.id,
            linkedUserPlansCount: 0,
          }
        }
      }
    }

    const linkedUserPlans = await tx.userPlan.updateMany({
      where: {
        planHolderId: planHolder.id,
        userId: null,
        status: 'ACTIVE',
      },
      data: {
        userId: params.userId,
      },
    })

    const linkedUserPlansCount = linkedUserPlans.count
    const linked = planHolderLinked || linkedUserPlansCount > 0

    if (linked) {
      const { ip, device } = getRequestAuditInfo(params.request)
      const auditDetails = {
        planHolderId: planHolder.id,
        userId: params.userId,
        nationalCode: maskNationalCode(nationalCode),
        linkedUserPlansCount,
      }

      if (planHolderLinked) {
        await tx.auditLog.create({
          data: {
            userId: params.actorId ?? params.userId,
            action: AuditActions.PLAN_HOLDER_LINKED_TO_USER,
            entity: 'PlanHolder',
            entityId: planHolder.id,
            details: JSON.stringify(auditDetails),
            ip,
            device,
          },
        })
      }

      if (linkedUserPlansCount > 0) {
        await tx.auditLog.create({
          data: {
            userId: params.actorId ?? params.userId,
            action: AuditActions.USER_PLAN_LINKED_TO_USER,
            entity: 'PlanHolder',
            entityId: planHolder.id,
            details: JSON.stringify(auditDetails),
            ip,
            device,
          },
        })
      }
    }

    return {
      linked,
      conflict: false,
      planHolderId: planHolder.id,
      linkedUserPlansCount,
    }
  })
}
