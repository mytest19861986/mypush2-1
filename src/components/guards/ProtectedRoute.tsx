'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { ErrorBoundary } from '@/components/shared'
import { HeartPulse, AlertTriangle, RefreshCw } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode
}

const INIT_TIMEOUT = 15000 // 15 seconds

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter()
  const { isAuthenticated, isLoading, initialize } = useAuthStore()
  const [initialized, setInitialized] = useState(false)
  const [timedOut, setTimedOut] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(() => {
      if (!cancelled) {
        setTimedOut(true)
        setInitialized(true)
      }
    }, INIT_TIMEOUT)

    initialize()
      .then(() => {
        if (!cancelled) {
          clearTimeout(timer)
          setInitialized(true)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          clearTimeout(timer)
          setInitError(err?.message || 'خطا در بارگذاری')
          setInitialized(true)
        }
      })

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [initialize])

  useEffect(() => {
    if (initialized && !isLoading && !isAuthenticated) {
      router.replace('/auth/login')
    }
  }, [initialized, isLoading, isAuthenticated, router])

  // Loading state with visible text
  if (!initialized || isLoading) {
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

  // Timeout state
  if (timedOut && !isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background gap-4">
        <AlertTriangle className="h-12 w-12 text-amber-500" />
        <p className="text-sm font-medium">بارگذاری اطلاعات بیش از حد طول کشید</p>
        <p className="text-xs text-muted-foreground">لطفاً اتصال اینترنت خود را بررسی کنید</p>
        <button
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 transition-colors"
          onClick={() => {
            setTimedOut(false)
            setInitialized(false)
            setInitError(null)
          }}
        >
          <RefreshCw className="h-4 w-4" />
          تلاش مجدد
        </button>
      </div>
    )
  }

  // Error state
  if (initError && !isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background gap-4">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <p className="text-sm font-medium">خطا در بارگذاری اطلاعات</p>
        <p className="text-xs text-muted-foreground">لطفاً دوباره وارد شوید</p>
        <button
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 transition-colors"
          onClick={() => router.replace('/auth/login')}
        >
          <RefreshCw className="h-4 w-4" />
          ورود مجدد
        </button>
      </div>
    )
  }

  if (!isAuthenticated) return null

  return <ErrorBoundary>{children}</ErrorBoundary>
}
