'use client'

import React from 'react'
import { DashboardAppShell } from '@/components/shared/dashboard-app-shell'

export default function AdminAuditLogsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <DashboardAppShell activeMenu="audit-logs">
      {children}
    </DashboardAppShell>
  )
}
