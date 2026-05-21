import { BaseService } from './base.service'
import type { AuthUser } from '@/types'

interface SendOtpResponse {
  canResend: boolean
  expiresIn: number
  otp?: string
}

interface AuthTokens {
  accessToken: string
  refreshToken: string
  user: AuthUser
}

interface RefreshResponse {
  accessToken: string
  refreshToken: string
}

export class AuthService extends BaseService {
  async sendOtp(mobile: string) {
    return this.post<SendOtpResponse>('/auth/send-otp', { mobile })
  }

  async verifyOtp(mobile: string, code: string) {
    return this.post<AuthTokens>('/auth/verify-otp', { mobile, code })
  }

  async login(mobile: string, password: string) {
    return this.post<AuthTokens>('/auth/login', { mobile, password })
  }

  async refreshToken(refreshToken: string) {
    return this.post<RefreshResponse>('/auth/refresh', { refreshToken })
  }

  async logout() {
    return this.post('/auth/logout')
  }

  async getMe() {
    return this.get<AuthUser>('/auth/me')
  }
}

export const authService = new AuthService()
