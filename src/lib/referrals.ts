import { createHmac } from 'crypto'

const REFERRAL_CODE_PREFIX = 'HC'
const REFERRAL_CODE_HASH_LENGTH = 10
const REFERRAL_CODE_PATTERN = /^HC[A-F0-9]{10}$/
const TOKEN_PEPPER_MIN_LENGTH = 32
const REFERRAL_CODE_HMAC_PURPOSE = 'referral-code:v1'

type ReferralLookupClient = {
  user: {
    findMany: (args: {
      where: { agent: { is: { status: string } } }
      select: { id: true }
    }) => Promise<Array<{ id: string }>>
  }
}

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
  const normalized = normalizeReferralCode(referralCode)
  if (!normalized) return null

  const approvedAgents = await client.user.findMany({
    where: { agent: { is: { status: 'APPROVED' } } },
    select: { id: true },
  })

  return (
    approvedAgents.find(
      (agent) => agent.id !== excludedUserId && generateReferralCode(agent.id) === normalized
    ) ?? null
  )
}
