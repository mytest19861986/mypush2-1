'use client'

import React from 'react'
import { DashboardAppShell } from '@/components/shared/dashboard-app-shell'

export default function AdminSalesCustomersLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <DashboardAppShell activeMenu="sales-customers">
      {children}
    </DashboardAppShell>
  )
}
