'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'

/**
 * Resolves the canonical profile route for any user based on their active role(s).
 * Evaluation hierarchy:
 * 1. SUPER_ADMIN / ADMIN -> /admin-profile-premium-preview (Dedicated Admin Profile & Security Timeline)
 * 2. DOCTOR -> /doctor/profile (Doctor Clinical & Specialty Profile)
 * 3. SALES_PARTNER / AGENT -> /agent/profile (Sales Representative & Payout Profile)
 * 4. USER / Guest / Default -> /user/profile (Individual User Profile, guarded by SessionGuard)
 */
export function resolveProfileRouteForUser(user: { role?: string; roles?: string[] } | null | undefined): string {
  if (!user) {
    return '/user/profile'
  }

  const roles = user.roles || (user.role ? [user.role] : [])

  if (roles.includes('SUPER_ADMIN') || roles.includes('ADMIN')) {
    return '/admin-profile-premium-preview'
  }

  if (roles.includes('DOCTOR')) {
    return '/doctor/profile'
  }

  if (roles.includes('SALES_PARTNER') || roles.includes('AGENT')) {
    return '/agent/profile'
  }

  return '/user/profile'
}

/**
 * Smart Profile Dispatcher Route (/profile):
 * Dispatches visitors to their role-specific profile destination seamlessly.
 */
export default function ProfileRoutePage() {
  const router = useRouter()
  const { user } = useAuthStore()

  useEffect(() => {
    const destination = resolveProfileRouteForUser(user)
    router.replace(destination)
  }, [user, router])

  return (
    <div className="flex items-center justify-center min-h-[60vh]" dir="rtl">
      <div className="flex flex-col items-center gap-3 text-slate-500">
        <div className="size-8 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
        <span className="text-xs font-medium">در حال انتقال به صفحه پروفایل...</span>
      </div>
    </div>
  )
}
