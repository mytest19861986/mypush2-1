import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'

interface LinkPlanHolderToUserByNationalCodeParams {
  userId: string
  nationalCode: string
  actorId?: string
  request?: Request
}

interface LinkPlanHolderToUserByNationalCodeResult {
  linked: boolean
  conflict: boolean
  requiresIdentityProof: boolean
  planHolderId?: string
  linkedUserPlansCount: number
}

// A submitted national code is a lookup key, not evidence of identity or representation.
// No accepted independent proof exists in the current model. Preserve existing ownership,
// but never assign a new holder or plan through this compatibility helper.
export async function linkPlanHolderToUserByNationalCode(
  params: LinkPlanHolderToUserByNationalCodeParams,
  transaction?: Prisma.TransactionClient
): Promise<LinkPlanHolderToUserByNationalCodeResult> {
  const inspect = async (tx: Prisma.TransactionClient): Promise<LinkPlanHolderToUserByNationalCodeResult> => {
    const unchanged = { linked: false, conflict: false, requiresIdentityProof: false, linkedUserPlansCount: 0 }
    const nationalCode = params.nationalCode.trim()
    if (!nationalCode) return unchanged
    const holder = await tx.planHolder.findFirst({
      where: { nationalCode, status: 'ACTIVE' },
      select: { id: true, userId: true },
    })
    if (!holder) return unchanged
    if (holder.userId && holder.userId !== params.userId) {
      return { ...unchanged, conflict: true, planHolderId: holder.id }
    }
    if (!holder.userId) {
      return { ...unchanged, requiresIdentityProof: true, planHolderId: holder.id }
    }
    const unassignedActivePlans = await tx.userPlan.count({
      where: { planHolderId: holder.id, userId: null, status: 'ACTIVE' },
    })
    return { ...unchanged, planHolderId: holder.id, requiresIdentityProof: unassignedActivePlans > 0 }
  }
  return transaction ? inspect(transaction) : db.$transaction(inspect)
}
