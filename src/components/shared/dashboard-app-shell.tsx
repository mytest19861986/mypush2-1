'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Building2,
  FileCheck2,
  FileText,
  CreditCard,
  BarChart3,
  Settings,
  Search,
  Bell,
  ChevronDown,
  Sparkles,
  Calendar,
  Clock,
  ArrowRight,
  ShieldPlus
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface DashboardAppShellProps {
  children: React.ReactNode
  activeMenu?: string
}

export function DashboardAppShell({ children, activeMenu = 'dashboard' }: DashboardAppShellProps) {
  const pathname = usePathname()

  const navItems = [
    { id: 'dashboard', label: 'داشبورد', icon: LayoutDashboard, href: '/dashboard-premium-preview' },
    { id: 'users', label: 'کاربران', icon: Users, href: '/users-premium-preview' },
    { id: 'doctors', label: 'مراکز درمانی', icon: Building2, href: '/doctors-clinics-premium-preview' },
    { id: 'requests', label: 'درخواست‌ها', icon: FileCheck2, badge: '۱۲', badgeColor: 'bg-[#EA580C] text-white', href: '/dashboard-premium-preview' },
    { id: 'contracts', label: 'قراردادها', icon: FileText, href: '/doctors-clinics-premium-preview' },
    { id: 'agents', label: 'نمایندگان و فروش', icon: CreditCard, href: '/agents-premium-preview' },
    { id: 'reports', label: 'گزارش‌ها و هوش سلامت', icon: BarChart3, href: '/reports-bi-premium-preview' },
    { id: 'settings', label: 'تنظیمات', icon: Settings, href: '/dashboard-premium-preview' },
  ]

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex" dir="rtl">
      {/* ─── Sidebar ─── */}
      <aside className="w-64 bg-white border-l border-slate-200/80 flex flex-col justify-between shrink-0 shadow-xs z-20">
        <div className="p-5 space-y-6">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 px-2">
            <div className="size-10 rounded-2xl bg-gradient-to-br from-[#0D5C58] to-[#12827B] text-white flex items-center justify-center shadow-sm">
              <ShieldPlus className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg text-slate-900 tracking-tight">حامی‌کارت</span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium leading-none">همراه سلامت، برای همه</p>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = activeMenu === item.id || pathname === item.href
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-[#0D5C58] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`size-4.5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${item.badgeColor || 'bg-slate-200 text-slate-700'}`}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Sidebar Bottom Promo Card */}
        <div className="p-4 m-3 rounded-2xl bg-gradient-to-b from-[#E6F4F2] to-[#D1EDE9] border border-[#BCE1DB]/60 text-center space-y-3 relative overflow-hidden">
          <div className="size-14 mx-auto rounded-full bg-white/90 shadow-xs flex items-center justify-center text-[#0D5C58]">
            <Building2 className="size-7" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-800">سلامت بهتر با همکاری شما ممکن است</p>
            <p className="text-[11px] text-slate-500">پیوستن به شبکه گسترده پزشکان حامی</p>
          </div>
          <Link href="/doctors-clinics-premium-preview" className="block">
            <Button size="sm" className="w-full bg-[#EA580C] hover:bg-[#D94E07] text-white text-xs font-bold rounded-xl shadow-xs py-2">
              افزودن مرکز درمانی
            </Button>
          </Link>
        </div>
      </aside>

      {/* ─── Main Content Area ─── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-20 bg-white/90 backdrop-blur-md border-b border-slate-200/70 px-6 sm:px-10 flex items-center justify-between gap-4 sticky top-0 z-10 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          {/* Right: Search Capsule */}
          <div className="relative w-full max-w-md hidden md:block">
            <Search className="size-4 text-slate-400 absolute end-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="جستجو در کاربران، مراکز، درخواست‌ها ..."
              className="w-full h-10 pe-10 ps-4 bg-slate-50 border border-slate-200/90 rounded-full text-xs text-slate-700 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D5C58]/20 focus:border-[#0D5C58] transition-all"
            />
          </div>

          {/* Left: Alerts, Date, and User Profile */}
          <div className="flex items-center gap-4 sm:gap-6 ms-auto">
            {/* Live Jalali Date & Time */}
            <div className="hidden lg:flex flex-col text-left">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <Calendar className="size-3.5 text-[#0D5C58]" />
                <span>سه‌شنبه ۲۷ شهریور ۱۴۰۵</span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">آخرین بروزرسانی: امروز ۱۴:۳۰</span>
            </div>

            {/* Notification Bell */}
            <button className="size-10 rounded-full bg-slate-50 border border-slate-200/70 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors relative">
              <Bell className="size-4.5" />
              <span className="size-2 rounded-full bg-[#EA580C] absolute top-2.5 end-2.5 ring-2 ring-white" />
            </button>

            {/* User Profile Capsule */}
            <div className="flex items-center gap-3 ps-2 sm:ps-4 border-s border-slate-200/80">
              <div className="size-10 rounded-full bg-gradient-to-tr from-[#0D5C58] to-teal-500 text-white font-bold flex items-center justify-center shadow-xs">
                م‌س
              </div>
              <div className="hidden sm:block text-right">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold text-slate-800">مدیر سیستم</span>
                  <ChevronDown className="size-3.5 text-slate-400" />
                </div>
                <span className="text-[11px] text-emerald-600 font-medium">سطح دسترسی کل</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page View Body */}
        <main className="p-6 sm:p-8 lg:p-10 flex-1">
          {children}
        </main>

        {/* Global Footer */}
        <footer className="px-8 py-5 border-t border-slate-200/70 bg-white/70 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-600">حامی‌کارت</span>
            <span>•</span>
            <span>همراه سلامت، برای همه</span>
          </div>
          <div className="flex items-center gap-5">
            <a href="#" className="hover:text-slate-600 transition-colors">قوانین و مقررات</a>
            <a href="#" className="hover:text-slate-600 transition-colors">حریم خصوصی</a>
            <a href="#" className="hover:text-slate-600 transition-colors">تماس با ما</a>
            <span>© ۱۴۰۵ تمامی حقوق محفوظ است.</span>
          </div>
        </footer>
      </div>
    </div>
  )
}
