'use client'

import React from 'react'
import { DashboardAppShell } from '@/components/shared/dashboard-app-shell'

export default function AdminCommissionsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <DashboardAppShell activeMenu="commissions">
      {children}
    </DashboardAppShell>
  )
}
