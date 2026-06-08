import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'

type AppSettingsStore = typeof db | Prisma.TransactionClient

export const MINIMUM_SETTLEMENT_AMOUNT_KEY = 'minimumSettlementAmount'
export const DEFAULT_MINIMUM_SETTLEMENT_AMOUNT = 0

export function canManageSettings(payload: { roles: string[]; permissions: string[] }) {
  return (
    payload.roles.includes('SUPER_ADMIN') ||
    payload.roles.includes('ADMIN') ||
    payload.permissions.includes('manage_settings')
  )
}

export function parseIntegerSetting(value: string | null | undefined, fallback = 0) {
  if (!value) return fallback

  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback
}

export function formatTomanAmount(amount: number) {
  return `${new Intl.NumberFormat('fa-IR').format(amount)} تومان`
}

export async function getMinimumSettlementAmount(store: AppSettingsStore = db) {
  const setting = await store.appSetting.findUnique({
    where: { key: MINIMUM_SETTLEMENT_AMOUNT_KEY },
    select: { value: true },
  })

  return parseIntegerSetting(setting?.value, DEFAULT_MINIMUM_SETTLEMENT_AMOUNT)
}

export async function setMinimumSettlementAmount(
  amount: number,
  store: AppSettingsStore = db
) {
  if (!Number.isInteger(amount) || amount < 0) {
    throw new Error('MINIMUM_SETTLEMENT_AMOUNT_INVALID')
  }

  const setting = await store.appSetting.upsert({
    where: { key: MINIMUM_SETTLEMENT_AMOUNT_KEY },
    update: { value: String(amount) },
    create: {
      key: MINIMUM_SETTLEMENT_AMOUNT_KEY,
      value: String(amount),
    },
  })

  return parseIntegerSetting(setting.value, DEFAULT_MINIMUM_SETTLEMENT_AMOUNT)
}
