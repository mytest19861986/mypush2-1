'use client'

import React from 'react'
import { DashboardAppShell } from '@/components/shared/dashboard-app-shell'

export default function AdminRolesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <DashboardAppShell activeMenu="roles">
      {children}
    </DashboardAppShell>
  )
}
