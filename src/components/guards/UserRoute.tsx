'use client'

import { useAuthStore } from '@/stores/auth-store'
import { ProtectedRoute } from './ProtectedRoute'
import { ErrorBoundary } from '@/components/shared'
import { ROLE_LABELS } from '@/constants'
import { Users, AlertCircle } from 'lucide-react'

export function UserRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()
  // A normal user is someone who is NOT an admin, doctor, or agent.
  // They may have the 'USER' role explicitly, or no roles at all.
  const specialRoles = ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'AGENT']
  const hasSpecialRole = user?.roles?.some((r: string) => specialRoles.includes(r))
  const isNormalUser = user && !hasSpecialRole

  if (!isNormalUser) {
    return (
      <ProtectedRoute>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 bg-background">
          <div className="flex flex-col items-center gap-4 text-center max-w-md">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
              <Users className="h-8 w-8 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold">پنل {ROLE_LABELS.USER}ها</h1>
            <p className="text-muted-foreground">این صفحه برای {ROLE_LABELS.USER}های عادی قابل دسترسی است.</p>
            {user && user.roles && user.roles.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                <span>نقش فعلی: {user.roles.map((r: string) => ROLE_LABELS[r] || r).join('، ')}</span>
              </div>
            )}
            {user && (!user.roles || user.roles.length === 0) && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                <span>شما نقشی ندارید. لطفاً با پشتیبانی تماس بگیرید.</span>
              </div>
            )}
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <ErrorBoundary>{children}</ErrorBoundary>
    </ProtectedRoute>
  )
}
