import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'

type WalletStore = typeof db | Prisma.TransactionClient

export class DuplicateWalletTransactionError extends Error {
  constructor() {
    super('DUPLICATE_WALLET_TRANSACTION')
  }
}

export class InsufficientWalletBalanceError extends Error {
  constructor() {
    super('INSUFFICIENT_WALLET_BALANCE')
  }
}

export function canViewWallets(payload: { roles: string[]; permissions: string[] }) {
  return (
    payload.roles.includes('SUPER_ADMIN') ||
    payload.roles.includes('ADMIN') ||
    payload.permissions.includes('view_wallets') ||
    payload.permissions.includes('manage_wallets')
  )
}

export function canManageSettlements(payload: { roles: string[]; permissions: string[] }) {
  return (
    payload.roles.includes('SUPER_ADMIN') ||
    payload.roles.includes('ADMIN') ||
    payload.permissions.includes('manage_settlements')
  )
}

export function canViewSettlements(payload: { roles: string[]; permissions: string[] }) {
  return canManageSettlements(payload) || payload.permissions.includes('view_settlements')
}

export function canManageCommissionPayments(payload: { roles: string[]; permissions: string[] }) {
  return (
    payload.roles.includes('SUPER_ADMIN') ||
    payload.roles.includes('ADMIN') ||
    payload.permissions.includes('manage_commissions') ||
    payload.permissions.includes('manage_commission_payments')
  )
}

export function isSafeId(value: string) {
  return value.length > 0 && value.length <= 100 && /^[a-zA-Z0-9_-]+$/.test(value)
}

export function parseBoundedInteger(value: string | null, defaultValue: number, maxValue: number) {
  if (value === null) return defaultValue

  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 0) return null

  return Math.min(parsed, maxValue)
}

export async function getOrCreateWallet(userId: string, store: WalletStore = db) {
  return store.wallet.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      balance: 0,
      pendingBalance: 0,
      currency: 'IRR',
      status: 'ACTIVE',
    },
  })
}

async function assertNoDuplicateWalletTransaction(
  tx: Prisma.TransactionClient,
  type: string,
  referenceType?: string,
  referenceId?: string
) {
  if (!referenceType || !referenceId) return

  const existingTransaction = await tx.walletTransaction.findFirst({
    where: { type, referenceType, referenceId },
    select: { id: true },
  })

  if (existingTransaction) {
    throw new DuplicateWalletTransactionError()
  }
}

export async function creditWallet(params: {
  tx: Prisma.TransactionClient
  userId: string
  amount: number
  type?: string
  referenceType?: string
  referenceId?: string
  description?: string
}) {
  const { tx, userId, amount, referenceType, referenceId, description, type = 'CREDIT' } = params

  if (amount <= 0) {
    throw new Error('WALLET_CREDIT_AMOUNT_INVALID')
  }

  await assertNoDuplicateWalletTransaction(tx, type, referenceType, referenceId)

  const wallet = await getOrCreateWallet(userId, tx)
  const updatedWallet = await tx.wallet.update({
    where: { id: wallet.id },
    data: { balance: { increment: amount } },
  })

  const transaction = await tx.walletTransaction.create({
    data: {
      walletId: wallet.id,
      userId,
      type,
      amount,
      balanceAfter: updatedWallet.balance,
      status: 'SUCCESS',
      description,
      referenceType,
      referenceId,
    },
  })

  return { wallet: updatedWallet, transaction }
}

export async function debitWallet(params: {
  tx: Prisma.TransactionClient
  userId: string
  amount: number
  type?: string
  referenceType?: string
  referenceId?: string
  description?: string
}) {
  const { tx, userId, amount, referenceType, referenceId, description, type = 'DEBIT' } = params

  if (amount <= 0) {
    throw new Error('WALLET_DEBIT_AMOUNT_INVALID')
  }

  await assertNoDuplicateWalletTransaction(tx, type, referenceType, referenceId)

  const wallet = await getOrCreateWallet(userId, tx)
  const updateResult = await tx.wallet.updateMany({
    where: {
      id: wallet.id,
      balance: { gte: amount },
    },
    data: {
      balance: { decrement: amount },
    },
  })

  if (updateResult.count !== 1) {
    throw new InsufficientWalletBalanceError()
  }

  const updatedWallet = await tx.wallet.findUniqueOrThrow({
    where: { id: wallet.id },
  })

  const transaction = await tx.walletTransaction.create({
    data: {
      walletId: wallet.id,
      userId,
      type,
      amount,
      balanceAfter: updatedWallet.balance,
      status: 'SUCCESS',
      description,
      referenceType,
      referenceId,
    },
  })

  return { wallet: updatedWallet, transaction }
}

export function toSafeWalletTransaction(transaction: {
  id: string
  walletId: string
  userId: string
  type: string
  amount: number
  balanceAfter: number | null
  status: string
  description: string | null
  referenceType: string | null
  referenceId: string | null
  createdAt: Date
}) {
  return {
    id: transaction.id,
    walletId: transaction.walletId,
    userId: transaction.userId,
    type: transaction.type,
    amount: transaction.amount,
    balanceAfter: transaction.balanceAfter,
    status: transaction.status,
    description: transaction.description,
    referenceType: transaction.referenceType,
    referenceId: transaction.referenceId,
    createdAt: transaction.createdAt.toISOString(),
  }
}

export function toSafeWalletResponse(wallet: {
  id: string
  userId: string
  balance: number
  pendingBalance: number
  currency: string
  status: string
  createdAt: Date
  updatedAt: Date
  transactions?: Parameters<typeof toSafeWalletTransaction>[0][]
}) {
  return {
    id: wallet.id,
    userId: wallet.userId,
    balance: wallet.balance,
    pendingBalance: wallet.pendingBalance,
    currency: wallet.currency,
    status: wallet.status,
    createdAt: wallet.createdAt.toISOString(),
    updatedAt: wallet.updatedAt.toISOString(),
    ...(wallet.transactions && {
      transactions: wallet.transactions.map(toSafeWalletTransaction),
    }),
  }
}

export function toSafeSettlementResponse(settlement: {
  id: string
  walletId: string
  userId: string
  amount: number
  status: string
  trackingCode: string | null
  receiptUrl: string | null
  requestedAt: Date
  settledAt: Date | null
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: settlement.id,
    walletId: settlement.walletId,
    userId: settlement.userId,
    amount: settlement.amount,
    status: settlement.status,
    trackingCode: settlement.trackingCode,
    receiptUrl: settlement.receiptUrl,
    requestedAt: settlement.requestedAt.toISOString(),
    settledAt: settlement.settledAt?.toISOString() ?? null,
    createdAt: settlement.createdAt.toISOString(),
    updatedAt: settlement.updatedAt.toISOString(),
  }
}
