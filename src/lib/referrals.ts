import { createHmac } from 'crypto'
import type { PrismaClient } from '@prisma/client'

const REFERRAL_CODE_PREFIX = 'HC'
const REFERRAL_CODE_HASH_LENGTH = 10
const REFERRAL_CODE_PATTERN = /^HC[A-F0-9]{10}$/
const TOKEN_PEPPER_MIN_LENGTH = 32
const REFERRAL_CODE_HMAC_PURPOSE = 'referral-code:v1'

export type ReferralReferrerType = 'SALES_PARTNER' | 'USER_REFERRAL'

export type ReferralReferrer = {
  id: string
  type: ReferralReferrerType
}

type ReferralLookupClient = Pick<PrismaClient, 'user'>

export function generateReferralCode(userId?: string | null) {
  if (!userId) return null

  const tokenPepper = process.env.TOKEN_PEPPER
  if (!tokenPepper || tokenPepper.length < TOKEN_PEPPER_MIN_LENGTH) {
    throw new Error('TOKEN_PEPPER must be set and at least 32 characters long')
  }

  // Referral codes are deterministic HMACs derived from userId; they do not expose
  // mobile, nationalCode, or raw userId, and are not reversible without the server secret.
  const digest = createHmac('sha256', `${tokenPepper}:${REFERRAL_CODE_HMAC_PURPOSE}`)
    .update(userId)
    .digest('hex')
    .toUpperCase()
  return `${REFERRAL_CODE_PREFIX}${digest.slice(0, REFERRAL_CODE_HASH_LENGTH)}`
}

export function normalizeReferralCode(value?: string | null) {
  if (!value) return null

  const normalized = value.trim().toUpperCase()
  return REFERRAL_CODE_PATTERN.test(normalized) ? normalized : null
}

export async function findApprovedAgentByReferralCode(
  client: ReferralLookupClient,
  referralCode?: string | null,
  excludedUserId?: string | null
) {
  const referrer = await findReferrerByReferralCode(client, referralCode, excludedUserId)
  return referrer?.type === 'SALES_PARTNER' ? { id: referrer.id } : null
}

export async function findReferrerByReferralCode(
  client: ReferralLookupClient,
  referralCode?: string | null,
  excludedUserId?: string | null
): Promise<ReferralReferrer | null> {
  const normalized = normalizeReferralCode(referralCode)
  if (!normalized) return null

  const now = new Date()
  const candidateUsers = await client.user.findMany({
    where: {
      status: 'ACTIVE',
      OR: [
        { agent: { is: { status: 'APPROVED' } } },
        {
          userPlans: {
            some: {
              status: 'ACTIVE',
              endDate: { gte: now },
            },
          },
        },
      ],
    },
    select: {
      id: true,
      status: true,
      agent: { select: { status: true } },
      userPlans: {
        where: {
          status: 'ACTIVE',
          endDate: { gte: now },
        },
        select: { id: true },
        take: 1,
      },
    },
  })

  const referrer = candidateUsers.find(
    (candidate) =>
      candidate.id !== excludedUserId && generateReferralCode(candidate.id) === normalized
  )

  if (!referrer) return null

  if (referrer.agent?.status === 'APPROVED') {
    return { id: referrer.id, type: 'SALES_PARTNER' }
  }

  if (referrer.userPlans.length > 0) {
    return { id: referrer.id, type: 'USER_REFERRAL' }
  }

  return null
}
