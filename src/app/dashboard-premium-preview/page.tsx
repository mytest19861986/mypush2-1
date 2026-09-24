'use client'

import React from 'react'
import Link from 'next/link'
import { DashboardAppShell } from '@/components/shared/dashboard-app-shell'
import { PremiumMetricCard } from '@/components/shared/premium-metric-card'
import { AnalyticsChartsBlock } from '@/components/shared/analytics-charts-block'
import { TwinRecentTables } from '@/components/shared/twin-recent-tables'
import {
  Users,
  Building2,
  FileCheck2,
  Wallet,
  UserPlus,
  BarChart3,
  CalendarCheck,
  ChevronLeft,
  Clock,
  Sparkles,
  ArrowRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function DashboardPremiumPreviewPage() {
  const [greeting, setGreeting] = React.useState('وقت بخیر')

  React.useEffect(() => {
    const hour = new Date().getHours()
    if (hour >= 5 && hour < 11) {
      setGreeting('صبح بخیر')
    } else if (hour >= 11 && hour < 15) {
      setGreeting('ظهر بخیر')
    } else if (hour >= 15 && hour < 19) {
      setGreeting('عصر بخیر')
    } else {
      setGreeting('شب بخیر')
    }
  }, [])

  const activities = [
    { text: 'دکتر احمدی درخواست همکاری ثبت کرد', time: '۱۰ دقیقه پیش', icon: Users, color: 'text-teal-600 bg-teal-50' },
    { text: 'کلینیک سپید فعال شد', time: '۲۵ دقیقه پیش', icon: Building2, color: 'text-sky-600 bg-sky-50' },
    { text: 'پرداخت قرارداد جدید ثبت شد', time: '۱ ساعت پیش', icon: Wallet, color: 'text-emerald-600 bg-emerald-50' },
    { text: 'کاربر جدید در تهران ثبت‌نام کرد', time: '۲ ساعت پیش', icon: UserPlus, color: 'text-amber-600 bg-amber-50' },
    { text: 'درخواست ویرایش اطلاعات از مرکز نیکان', time: '۳ ساعت پیش', icon: FileCheck2, color: 'text-purple-600 bg-purple-50' },
  ]

  const quickActions = [
    { title: 'ثبت مرکز درمانی', icon: Building2, color: 'text-teal-600 bg-teal-50', href: '/admin/doctors' },
    { title: 'افزودن کاربر', icon: UserPlus, color: 'text-sky-600 bg-sky-50', href: '/admin/users' },
    { title: 'طرح‌های تخفیف', icon: FileCheck2, color: 'text-amber-600 bg-amber-50', href: '/admin/plans' },
    { title: 'مدیریت نظرات', icon: BarChart3, color: 'text-purple-600 bg-purple-50', href: '/admin/reviews' },
  ]

  return (
    <DashboardAppShell activeMenu="dashboard">
      <div className="space-y-8">
        {/* ─── Greeting Header ─── */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {greeting}، مدیر 👋
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            خلاصه وضعیت شبکه سلامت و پوشش درمانی حامی‌کارت در یک نگاه
          </p>
        </div>

        {/* ─── Row 1: KPI 4-Card Pastel Grid (Single col on mobile, 2 col on tablet, 4 col on desktop) ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 w-full">
          <PremiumMetricCard
            title="کاربر فعال"
            value="۱۲,۵۴۰"
            trend="↑ ۱۸٪ نسبت به ماه قبل"
            isUp={true}
            icon={Users}
            variant="green"
            badge="رشد فعال"
          />
          <PremiumMetricCard
            title="مرکز درمانی"
            value="۲۴۵"
            trend="+ ۱۲ مرکز جدید"
            isUp={true}
            icon={Building2}
            variant="blue"
            badge="شبکه همکار"
          />
          <PremiumMetricCard
            title="درخواست جدید"
            value="۳۸۶"
            description="امروز در صف بررسی"
            icon={FileCheck2}
            variant="amber"
            badge="اقدام فوری"
          />
          <PremiumMetricCard
            title="درآمد (تومان)"
            value="۸۷M"
            trend="↑ ۲۵٪ نسبت به ماه قبل"
            isUp={true}
            icon={Wallet}
            variant="purple"
            badge="تسویه شاپرک"
          />
        </div>

        {/* ─── Row 2: Analytics Charts (Area & Donut) ─── */}
        <AnalyticsChartsBlock />

        {/* ─── Row 3: Live Activities & Quick Actions (2 Cols) ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Latest Activities */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base text-slate-800">آخرین فعالیت‌ها</h3>
              <Link href="/admin/reviews" className="text-xs text-[#0D5C58] font-bold hover:underline">مشاهده همه</Link>
            </div>

            <div className="space-y-3.5">
              {activities.map((act, idx) => {
                const Icon = act.icon
                return (
                  <div key={idx} className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <div className={`size-8 rounded-xl ${act.color} flex items-center justify-center shrink-0`}>
                        <Icon className="size-4" />
                      </div>
                      <span className="font-medium text-slate-700">{act.text}</span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono shrink-0">{act.time}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Quick Actions 2x2 Grid */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="font-extrabold text-base text-slate-800">دسترسی سریع</h3>

            <div className="grid grid-cols-2 gap-3.5">
              {quickActions.map((action, idx) => {
                const Icon = action.icon
                return (
                  <a
                    key={idx}
                    href={action.href}
                    className="p-4 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-[#F0FDF4] hover:border-emerald-200 transition-all duration-200 flex flex-col items-center justify-center gap-2.5 text-center group"
                  >
                    <div className={`size-10 rounded-xl ${action.color} flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs`}>
                      <Icon className="size-5" />
                    </div>
                    <span className="text-xs font-bold text-slate-800 group-hover:text-[#0D5C58] transition-colors">
                      {action.title}
                    </span>
                  </a>
                )
              })}
            </div>
          </div>
        </div>

        {/* ─── Row 4: Twin Tables (Recent Centers & Users) ─── */}
        <TwinRecentTables />
      </div>
    </DashboardAppShell>
  )
}
