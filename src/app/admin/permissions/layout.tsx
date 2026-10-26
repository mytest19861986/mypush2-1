'use client'

import React from 'react'
import { DashboardAppShell } from '@/components/shared/dashboard-app-shell'

export default function AdminPermissionsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <DashboardAppShell activeMenu="permissions">
      {children}
    </DashboardAppShell>
  )
}
