import { createHmac } from 'node:crypto'

const TOKEN_PEPPER = getRequiredTokenPepper()

function getRequiredTokenPepper(): string {
  const pepper = process.env.TOKEN_PEPPER

  if (!pepper) {
    throw new Error('TOKEN_PEPPER environment variable is required')
  }

  if (pepper.length < 32) {
    throw new Error('TOKEN_PEPPER must be at least 32 characters long')
  }

  return pepper
}

export function hashRefreshToken(refreshToken: string): string {
  return createHmac('sha256', TOKEN_PEPPER).update(refreshToken).digest('hex')
}
