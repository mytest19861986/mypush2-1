'use client'

import React from 'react'
import { Building2, FileCheck2, UserPlus, BarChart3 } from 'lucide-react'
import { DashboardAppShell } from '@/components/shared/dashboard-app-shell'
import { AdminActivityOverview } from '@/components/shared/admin-activity-overview'
import { AdminDashboardData } from '@/components/shared/admin-dashboard-data'

export default function DashboardPremiumPreviewPage() {
  const quickActions = [
    { title: 'ثبت مرکز درمانی', icon: Building2, color: 'text-teal-600 bg-teal-50', href: '/admin/doctors' },
    { title: 'افزودن کاربر', icon: UserPlus, color: 'text-sky-600 bg-sky-50', href: '/admin/users' },
    { title: 'طرح‌های تخفیف', icon: FileCheck2, color: 'text-amber-600 bg-amber-50', href: '/admin/plans' },
    { title: 'مدیریت نظرات', icon: BarChart3, color: 'text-purple-600 bg-purple-50', href: '/admin/reviews' },
  ]

  return (
    <DashboardAppShell activeMenu="dashboard" requireAdmin={false}>
      <div className="space-y-8">
        {/* ─── Greeting Header ─── */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              وقت بخیر، مدیر 👋
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            خلاصه وضعیت شبکه سلامت و پوشش درمانی حامی‌کارت در یک نگاه
          </p>
        </div>

        <AdminDashboardData>
        {/* ─── Row 3: Live Activities & Quick Actions (2 Cols) ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AdminActivityOverview />

          {/* Action Required Center (سازماندهی دسترسی‌ها و اقدامات نیازمند رسیدگی مدیر) */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h3 className="font-extrabold text-base text-slate-800">مرکز اقدامات و وظایف نیازمند رسیدگی</h3>
                <p className="text-2xs text-muted-foreground">بخش‌های عملیاتی دارای اولویت جهت بررسی و نظارت مستمر</p>
              </div>
              <span className="text-2xs font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200/60">
                اقدامات اولویت‌دار
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              {quickActions.map((action, idx) => {
                const Icon = action.icon
                return (
                  <a
                    key={idx}
                    href={action.href}
                    className="p-4 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-[#F0FDF4] hover:border-emerald-200 transition-all duration-200 flex flex-col items-center justify-center gap-2 text-center group"
                  >
                    <div className={`size-10 rounded-xl ${action.color} flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs`}>
                      <Icon className="size-5" />
                    </div>
                    <span className="text-xs font-bold text-slate-800 group-hover:text-[#0D5C58] transition-colors">
                      {action.title}
                    </span>
                    <span className="text-3xs text-muted-foreground group-hover:text-slate-600 transition-colors">
                      ورود به صف رسیدگی
                    </span>
                  </a>
                )
              })}
            </div>
          </div>
        </div>

        </AdminDashboardData>
      </div>
    </DashboardAppShell>
  )
}
