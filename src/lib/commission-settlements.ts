import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { getMinimumSettlementAmount } from '@/lib/app-settings'

type CommissionSettlementStore = typeof db | Prisma.TransactionClient

export const COMMISSION_STATUSES = ['PENDING', 'APPROVED', 'PAID', 'CANCELLED'] as const
export const SETTLEMENT_STATUSES = ['PENDING', 'APPROVED', 'PAID', 'REJECTED', 'CANCELLED'] as const
export const DEDUCTIBLE_SETTLEMENT_STATUSES = ['PENDING', 'APPROVED', 'PAID'] as const
export const OPEN_SETTLEMENT_STATUSES = ['PENDING', 'APPROVED'] as const

export type CommissionStatus = (typeof COMMISSION_STATUSES)[number]
export type SettlementStatus = (typeof SETTLEMENT_STATUSES)[number]

export interface CommissionAvailability {
  approvedCommissionAmount: number
  deductedSettlementAmount: number
  pendingSettlementAmount: number
  paidSettlementAmount: number
  openSettlementAmount: number
  availableBalance: number
}

export interface WalletCommissionSummary {
  totalCommissionAmount: number
  pendingCommissionAmount: number
  approvedCommissionAmount: number
  availableBalance: number
  pendingSettlementAmount: number
  paidSettlementAmount: number
  minimumSettlementAmount: number
}

export function clampAvailableBalance(approvedAmount: number, deductedSettlementAmount: number) {
  return Math.max(0, approvedAmount - deductedSettlementAmount)
}

export async function getCommissionAvailability(
  userId: string,
  store: CommissionSettlementStore = db
): Promise<CommissionAvailability> {
  const [approvedCommissions, deductedSettlements, openSettlements, paidSettlements] =
    await Promise.all([
      store.commission.aggregate({
        where: { agentId: userId, status: 'APPROVED' },
        _sum: { amount: true },
      }),
      store.settlement.aggregate({
        where: { userId, status: { in: [...DEDUCTIBLE_SETTLEMENT_STATUSES] } },
        _sum: { amount: true },
      }),
      store.settlement.aggregate({
        where: { userId, status: { in: [...OPEN_SETTLEMENT_STATUSES] } },
        _sum: { amount: true },
      }),
      store.settlement.aggregate({
        where: { userId, status: 'PAID' },
        _sum: { amount: true },
      }),
    ])

  const approvedCommissionAmount = approvedCommissions._sum.amount ?? 0
  const deductedSettlementAmount = deductedSettlements._sum.amount ?? 0
  const pendingSettlementAmount = openSettlements._sum.amount ?? 0

  return {
    approvedCommissionAmount,
    deductedSettlementAmount,
    pendingSettlementAmount,
    paidSettlementAmount: paidSettlements._sum.amount ?? 0,
    openSettlementAmount: pendingSettlementAmount,
    availableBalance: clampAvailableBalance(approvedCommissionAmount, deductedSettlementAmount),
  }
}

export async function getWalletCommissionSummary(
  userId: string,
  store: CommissionSettlementStore = db
): Promise<WalletCommissionSummary> {
  const [commissionsByStatus, availability, minimumSettlementAmount] = await Promise.all([
    store.commission.groupBy({
      by: ['status'],
      where: {
        agentId: userId,
        status: { in: ['PENDING', 'APPROVED', 'PAID'] },
      },
      _sum: { amount: true },
    }),
    getCommissionAvailability(userId, store),
    getMinimumSettlementAmount(store),
  ])

  const amountByStatus = new Map(
    commissionsByStatus.map((commission) => [
      commission.status,
      commission._sum.amount ?? 0,
    ])
  )

  const pendingCommissionAmount = amountByStatus.get('PENDING') ?? 0
  const approvedCommissionAmount = amountByStatus.get('APPROVED') ?? 0
  const paidCommissionAmount = amountByStatus.get('PAID') ?? 0

  return {
    totalCommissionAmount:
      pendingCommissionAmount + approvedCommissionAmount + paidCommissionAmount,
    pendingCommissionAmount,
    approvedCommissionAmount,
    availableBalance: availability.availableBalance,
    pendingSettlementAmount: availability.pendingSettlementAmount,
    paidSettlementAmount: availability.paidSettlementAmount,
    minimumSettlementAmount,
  }
}

export async function getCommissionAvailabilityByUserIds(
  userIds: string[],
  store: CommissionSettlementStore = db
) {
  const uniqueUserIds = Array.from(new Set(userIds)).filter(Boolean)
  const empty = new Map<string, CommissionAvailability>()
  if (uniqueUserIds.length === 0) return empty

  const [approvedCommissions, settlementsByStatus] = await Promise.all([
    store.commission.groupBy({
      by: ['agentId'],
      where: { agentId: { in: uniqueUserIds }, status: 'APPROVED' },
      _sum: { amount: true },
    }),
    store.settlement.groupBy({
      by: ['userId', 'status'],
      where: {
        userId: { in: uniqueUserIds },
        status: { in: [...DEDUCTIBLE_SETTLEMENT_STATUSES] },
      },
      _sum: { amount: true },
    }),
  ])

  const summaries = new Map<string, CommissionAvailability>()
  for (const userId of uniqueUserIds) {
    summaries.set(userId, {
      approvedCommissionAmount: 0,
      deductedSettlementAmount: 0,
      pendingSettlementAmount: 0,
      paidSettlementAmount: 0,
      openSettlementAmount: 0,
      availableBalance: 0,
    })
  }

  for (const commission of approvedCommissions) {
    const summary = summaries.get(commission.agentId)
    if (!summary) continue
    summary.approvedCommissionAmount = commission._sum.amount ?? 0
  }

  for (const settlement of settlementsByStatus) {
    const summary = summaries.get(settlement.userId)
    if (!summary) continue

    const amount = settlement._sum.amount ?? 0
    summary.deductedSettlementAmount += amount
    if (settlement.status === 'PENDING' || settlement.status === 'APPROVED') {
      summary.pendingSettlementAmount += amount
      summary.openSettlementAmount += amount
    }
    if (settlement.status === 'PAID') summary.paidSettlementAmount += amount
  }

  for (const summary of summaries.values()) {
    summary.availableBalance = clampAvailableBalance(
      summary.approvedCommissionAmount,
      summary.deductedSettlementAmount
    )
  }

  return summaries
}
