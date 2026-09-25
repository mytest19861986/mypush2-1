'use client'

import { useAuthStore } from '@/stores/auth-store'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, isLoading, initialize } = useAuthStore()
  const isPublicRegistration = pathname === '/register/agent' || pathname === '/register/user'

  useEffect(() => {
    initialize()
  }, [initialize])

  useEffect(() => {
    if (!isPublicRegistration && !isLoading && !isAuthenticated) {
      router.replace('/auth/login')
    }
  }, [isPublicRegistration, isLoading, isAuthenticated, router])

  if (isLoading || (!isPublicRegistration && !isAuthenticated)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">در حال بارگذاری...</p>
        </div>
      </div>
    )
  }

  return (
    <div dir="rtl" className="min-h-screen flex flex-col bg-muted/30">
      {children}
    </div>
  )
}
