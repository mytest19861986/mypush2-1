import { create } from 'zustand'
import { authService } from '@/services/auth.service'
import type { AuthUser } from '@/types'

const AUTH_REQUEST_TIMEOUT_MS = 10000
let authGeneration = 0

function withTimeout<T>(promise: Promise<T>, timeoutMs = AUTH_REQUEST_TIMEOUT_MS): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Auth request timed out'))
    }, timeoutMs)

    promise
      .then(resolve)
      .catch(reject)
      .finally(() => clearTimeout(timer))
  })
}

function normalizeUser(user: AuthUser): AuthUser {
  return {
    ...user,
    roles: Array.isArray(user.roles) ? user.roles : [],
    permissions: Array.isArray(user.permissions) ? user.permissions : [],
  }
}

function clearStoredTokens() {
  if (typeof window === 'undefined') return
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
}

function getStoredTokens() {
  if (typeof window === 'undefined') {
    return { accessToken: null, refreshToken: null }
  }

  return {
    accessToken: localStorage.getItem('accessToken'),
    refreshToken: localStorage.getItem('refreshToken'),
  }
}

function storeTokens(accessToken: string, refreshToken: string | null) {
  if (typeof window === 'undefined') return

  localStorage.setItem('accessToken', accessToken)
  if (refreshToken) {
    localStorage.setItem('refreshToken', refreshToken)
  } else {
    localStorage.removeItem('refreshToken')
  }
}

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  setAuth: (user: AuthUser, accessToken: string, refreshToken: string) => void
  setUser: (user: AuthUser) => void
  setTokens: (accessToken: string, refreshToken: string | null) => void
  logout: (options?: { redirectTo?: string | null; callApi?: boolean }) => Promise<void>
  clearAuth: () => void
  setLoading: (loading: boolean) => void
  initialize: () => Promise<void>
  isAdmin: () => boolean
  isDoctor: () => boolean
  isAgent: () => boolean
  hasRole: (role: string) => boolean
  hasPermission: (permission: string) => boolean
  getRedirectPath: () => string
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,

  setAuth: (user, accessToken, refreshToken) => {
    authGeneration += 1
    storeTokens(accessToken, refreshToken)
    set({ user, accessToken, refreshToken, isAuthenticated: true, isLoading: false })
  },

  setUser: (user) => {
    set({ user, isAuthenticated: true, isLoading: false })
  },

  setTokens: (accessToken, refreshToken) => {
    storeTokens(accessToken, refreshToken)
    set({ accessToken, refreshToken })
  },

  clearAuth: () => {
    authGeneration += 1
    clearStoredTokens()
    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false, isLoading: false })
  },

  logout: async (options = {}) => {
    const { redirectTo = '/auth/login', callApi = true } = options
    authGeneration += 1
    const storedAccessToken = getStoredTokens().accessToken

    try {
      if (callApi && typeof window !== 'undefined' && (get().accessToken || storedAccessToken)) {
        await withTimeout(authService.logout())
      }
    } catch {
      /* keep logout silent for the user */
    } finally {
      get().clearAuth()

      if (typeof window !== 'undefined' && redirectTo) {
        window.location.replace(redirectTo)
      }
    }
  },

  setLoading: (loading) => {
    set({ isLoading: loading })
  },

  initialize: async () => {
    const startGeneration = authGeneration
    const isCurrentAuthRun = () => authGeneration === startGeneration
    const state = get()
    const storedTokens = getStoredTokens()
    const accessToken = state.accessToken || storedTokens.accessToken
    const refreshToken = state.refreshToken || storedTokens.refreshToken

    if (!accessToken) {
      get().clearAuth()
      return
    }

    set({
      accessToken,
      refreshToken,
      isLoading: true,
    })

    try {
      const res = await withTimeout(authService.getMe())
      if (!isCurrentAuthRun() || get().accessToken !== accessToken) return

      if (res.success && res.data) {
        get().setUser(normalizeUser(res.data))
        return
      }

      if (refreshToken) {
        try {
          const refreshData = await withTimeout(authService.refreshToken(refreshToken))
          if (!isCurrentAuthRun() || get().accessToken !== accessToken || get().refreshToken !== refreshToken) return

          const { accessToken: newAccess, refreshToken: newRefresh } = refreshData
          get().setTokens(newAccess, newRefresh || refreshToken)

          const meRes = await withTimeout(authService.getMe())
          if (!isCurrentAuthRun() || get().accessToken !== newAccess) return

          if (meRes.success && meRes.data) {
            get().setAuth(normalizeUser(meRes.data), newAccess, newRefresh || refreshToken)
            return
          }
        } catch { /* refresh failed */ }
      }

      await get().logout({ callApi: false, redirectTo: null })
    } catch {
      await get().logout({ callApi: false, redirectTo: null })
    } finally {
      if (isCurrentAuthRun()) {
        set({ isLoading: false })
      }
    }
  },

  isAdmin: () => {
    const { user } = get()
    if (!user) return false
    const roles = user.roles || []
    return roles.includes('SUPER_ADMIN') || roles.includes('ADMIN')
  },

  isDoctor: () => {
    const { user } = get()
    if (!user) return false
    return (user.roles || []).includes('DOCTOR')
  },

  isAgent: () => {
    const { user } = get()
    if (!user) return false
    return (user.roles || []).includes('AGENT')
  },

  hasRole: (role: string) => {
    const { user } = get()
    if (!user) return false
    return (user.roles || []).includes(role)
  },

  hasPermission: (permission: string) => {
    const { user } = get()
    if (!user) return false
    return (user.permissions || []).includes(permission)
  },

  getRedirectPath: () => {
    const { user } = get()
    if (!user) return '/auth/login'
    const roles = user.roles || []
    if (roles.includes('SUPER_ADMIN') || roles.includes('ADMIN')) return '/admin/dashboard'
    if (roles.includes('DOCTOR')) return '/doctor/dashboard'
    if (roles.includes('AGENT')) return '/agent/dashboard'
    // Empty roles or only USER role → go to user dashboard
    return '/user/dashboard'
  },
}))
