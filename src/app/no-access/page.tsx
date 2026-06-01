'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LayoutDashboard, LogOut, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth-store'

export default function NoAccessPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading, initialize, getRedirectPath, logout } = useAuthStore()

  useEffect(() => {
    initialize()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleBackToDashboard = () => {
    router.replace(isAuthenticated ? getRedirectPath() : '/auth/login')
  }

  const handleLogout = async () => {
    await logout()
  }

  return (
    <main dir="rtl" className="flex min-h-screen items-center justify-center bg-background px-4">
      <section className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <ShieldAlert className="size-8" />
        </div>

        <h1 className="text-2xl font-bold text-foreground">دسترسی غیرمجاز</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          شما مجوز دسترسی به این بخش را ندارید.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button onClick={handleBackToDashboard} disabled={isLoading} className="gap-2">
            <LayoutDashboard className="size-4" />
            بازگشت به داشبورد
          </Button>
          <Button variant="outline" onClick={handleLogout} disabled={isLoading} className="gap-2">
            <LogOut className="size-4" />
            خروج از حساب
          </Button>
        </div>
      </section>
    </main>
  )
}
