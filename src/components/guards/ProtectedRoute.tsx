'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { ErrorBoundary } from '@/components/shared'
import { HeartPulse } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode
}

const AUTH_CHECK_TIMEOUT_MS = 12000

function AuthLoadingFallback() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background to-teal-500/5 gap-4">
      <div className="relative">
        <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
          <HeartPulse className="h-7 w-7 text-emerald-600 animate-pulse" />
        </div>
        <div className="absolute -inset-2 rounded-2xl bg-emerald-500/5 animate-ping" />
      </div>
      <p className="text-sm text-muted-foreground animate-pulse">
        در حال بارگذاری اطلاعات کاربری...
      </p>
    </div>
  )
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter()
  const {
    user,
    accessToken,
    isAuthenticated,
    initialize,
    clearAuth,
  } = useAuthStore()
  const [mounted, setMounted] = useState(false)
  const [checking, setChecking] = useState(true)
  const componentMountedRef = useRef(false)
  const authCheckRunIdRef = useRef(0)
  const activeInitializeRef = useRef<{
    token: string
    promise: Promise<void>
  } | null>(null)

  const hasAuthenticatedUser = Boolean(isAuthenticated && user && accessToken)

  useEffect(() => {
    componentMountedRef.current = true
    setMounted(true)

    return () => {
      componentMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!mounted) {
      return
    }

    if (hasAuthenticatedUser) {
      authCheckRunIdRef.current += 1
      activeInitializeRef.current = null
      setChecking(false)
      return
    }

    let cancelled = false
    const runId = authCheckRunIdRef.current + 1
    authCheckRunIdRef.current = runId

    const redirectToLogin = () => {
      setChecking(false)
      clearAuth()
      router.replace('/auth/login')
    }

    const storedAccessToken =
      typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
    const effectiveAccessToken = accessToken || storedAccessToken

    if (!effectiveAccessToken) {
      redirectToLogin()
      return () => {
        cancelled = true
        if (authCheckRunIdRef.current === runId) {
          authCheckRunIdRef.current += 1
        }
      }
    }

    setChecking(true)

    let initializePromise = activeInitializeRef.current?.token === effectiveAccessToken
      ? activeInitializeRef.current.promise
      : null

    if (!initializePromise) {
      initializePromise = initialize()
      activeInitializeRef.current = {
        token: effectiveAccessToken,
        promise: initializePromise,
      }
    }

    const timeout = window.setTimeout(() => {
      if (cancelled || authCheckRunIdRef.current !== runId) return

      const state = useAuthStore.getState()
      if (activeInitializeRef.current?.promise === initializePromise) {
        activeInitializeRef.current = null
      }
      setChecking(false)

      if (!state.isAuthenticated || !state.user || !state.accessToken) {
        redirectToLogin()
      }
    }, AUTH_CHECK_TIMEOUT_MS)

    initializePromise
      .catch(() => {
        /* initialize handles auth cleanup; redirect decision happens below */
      })
      .finally(() => {
        if (cancelled || authCheckRunIdRef.current !== runId) return

        window.clearTimeout(timeout)
        if (activeInitializeRef.current?.promise === initializePromise) {
          activeInitializeRef.current = null
        }
        setChecking(false)

        const state = useAuthStore.getState()
        if (!state.isAuthenticated || !state.user || !state.accessToken) {
          redirectToLogin()
        }
      })

    return () => {
      cancelled = true
      window.clearTimeout(timeout)
      if (authCheckRunIdRef.current === runId) {
        authCheckRunIdRef.current += 1
        if (componentMountedRef.current) {
          setChecking(false)
        }
      }
    }
  }, [accessToken, clearAuth, hasAuthenticatedUser, initialize, mounted, router])

  if (hasAuthenticatedUser) {
    return <ErrorBoundary>{children}</ErrorBoundary>
  }

  if (!mounted || checking) {
    return <AuthLoadingFallback />
  }

  return <AuthLoadingFallback />
}
