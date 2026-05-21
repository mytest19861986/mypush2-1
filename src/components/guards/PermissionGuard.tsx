'use client'

import { useAuthStore } from '@/stores/auth-store'
import { ErrorBoundary } from '@/components/shared'

interface PermissionGuardProps {
  permission: string
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function PermissionGuard({
  permission,
  children,
  fallback = null,
}: PermissionGuardProps) {
  const { hasPermission } = useAuthStore()

  if (!hasPermission(permission)) {
    return <>{fallback}</>
  }

  return <ErrorBoundary>{children}</ErrorBoundary>
}
