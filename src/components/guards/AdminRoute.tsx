'use client'

import { useAuthStore } from '@/stores/auth-store'
import { ProtectedRoute } from './ProtectedRoute'
import { ErrorBoundary } from '@/components/shared'
import { ROLE_LABELS } from '@/constants'
import { getDisplayName } from '@/utils/formatters'
import { ShieldX, AlertCircle } from 'lucide-react'

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin, user } = useAuthStore()

  if (!isAdmin()) {
    return (
      <ProtectedRoute>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 bg-background">
          <div className="flex flex-col items-center gap-4 text-center max-w-md">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <ShieldX className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold">دسترسی محدود</h1>
            <p className="text-muted-foreground">شما دسترسی مدیریت ندارید.</p>
            {user && (
              <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  <span>کاربر: {getDisplayName(user)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>نقش فعلی: {user.roles.map(r => ROLE_LABELS[r] || r).join('، ')}</span>
                </div>
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
