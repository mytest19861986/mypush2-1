import { SignJWT, jwtVerify } from 'jose'

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-in-production'

// Token expiry durations
const ACCESS_TOKEN_EXPIRY = '15m'
const REFRESH_TOKEN_EXPIRY = '30d'

function getSecret() {
  return new TextEncoder().encode(JWT_SECRET)
}

export interface TokenPayload {
  sub: string
  roles: string[]
  permissions: string[]
  iat?: number
  exp?: number
}

/**
 * Generate a signed JWT access token.
 * Access tokens are short-lived (15 minutes).
 */
export async function generateAccessToken(
  userId: string,
  roles: string[],
  permissions: string[]
): Promise<string> {
  const secret = getSecret()

  const token = await new SignJWT({
    sub: userId,
    roles,
    permissions,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(secret)

  return token
}

/**
 * Generate a signed JWT refresh token.
 * Refresh tokens are long-lived (30 days) and only contain a random identifier.
 */
export async function generateRefreshToken(): Promise<string> {
  const secret = getSecret()
  const jti = crypto.randomUUID()

  const token = await new SignJWT({
    sub: jti,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(secret)

  return token
}

/**
 * Verify and decode a JWT access token.
 * Returns the payload if valid, null if invalid or expired.
 */
export async function verifyAccessToken(
  token: string
): Promise<TokenPayload | null> {
  try {
    const secret = getSecret()
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ['HS256'],
    })

    return {
      sub: payload.sub as string,
      roles: (payload.roles as string[]) || [],
      permissions: (payload.permissions as string[]) || [],
      iat: payload.iat,
      exp: payload.exp,
    }
  } catch {
    return null
  }
}
