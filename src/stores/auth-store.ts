import { create } from 'zustand'
import { authService } from '@/services/auth.service'
import type { AuthUser } from '@/types'

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  setAuth: (user: AuthUser, accessToken: string, refreshToken: string) => void
  setUser: (user: AuthUser) => void
  setTokens: (accessToken: string, refreshToken: string) => void
  logout: () => void
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
  accessToken: typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null,
  refreshToken: typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null,
  isAuthenticated: false,
  isLoading: true,

  setAuth: (user, accessToken, refreshToken) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('refreshToken', refreshToken)
    }
    set({ user, accessToken, refreshToken, isAuthenticated: true, isLoading: false })
  },

  setUser: (user) => {
    set({ user, isAuthenticated: true, isLoading: false })
  },

  setTokens: (accessToken, refreshToken) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('refreshToken', refreshToken)
    }
    set({ accessToken, refreshToken })
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
    }
    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false, isLoading: false })
  },

  setLoading: (loading) => {
    set({ isLoading: loading })
  },

  initialize: async () => {
    const { accessToken, refreshToken, setAuth, setUser, logout, setTokens } = get()

    if (!accessToken) {
      set({ isLoading: false })
      return
    }

    try {
      const res = await authService.getMe()
      if (res.success && res.data) {
        const userData = res.data
        userData.roles = Array.isArray(userData.roles) ? userData.roles : []
        userData.permissions = Array.isArray(userData.permissions) ? userData.permissions : []
        setUser(userData)
        return
      }

      if (refreshToken) {
        try {
          const refreshData = await authService.refreshToken(refreshToken)
          const { accessToken: newAccess, refreshToken: newRefresh } = refreshData
          setTokens(newAccess, newRefresh || refreshToken)

          const meRes = await authService.getMe()
          if (meRes.success && meRes.data) {
            const userData = meRes.data
            userData.roles = Array.isArray(userData.roles) ? userData.roles : []
            userData.permissions = Array.isArray(userData.permissions) ? userData.permissions : []
            setAuth(userData, newAccess, newRefresh || refreshToken)
            return
          }
        } catch { /* refresh failed */ }
      }

      logout()
    } catch {
      logout()
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
