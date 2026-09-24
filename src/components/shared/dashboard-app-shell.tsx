'use client'

import React, { useState } from 'react'
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
  ShieldPlus,
  Menu,
  X
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface DashboardAppShellProps {
  children: React.ReactNode
  activeMenu?: string
}

export function DashboardAppShell({ children, activeMenu = 'dashboard' }: DashboardAppShellProps) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navItems = [
    { id: 'dashboard', label: 'داشبورد', icon: LayoutDashboard, href: '/dashboard' },
    { id: 'users', label: 'کاربران', icon: Users, href: '/users' },
    { id: 'doctors', label: 'مراکز درمانی', icon: Building2, href: '/doctors' },
    { id: 'requests', label: 'درخواست‌ها', icon: FileCheck2, badge: '۱۲', badgeColor: 'bg-[#EA580C] text-white', href: '/dashboard' },
    { id: 'contracts', label: 'قراردادها', icon: FileText, href: '/doctors' },
    { id: 'agents', label: 'نمایندگان و فروش', icon: CreditCard, href: '/agents' },
    { id: 'reports', label: 'گزارش‌ها و هوش سلامت', icon: BarChart3, href: '/reports' },
    { id: 'settings', label: 'تنظیمات سامانه', icon: Settings, href: '/settings' },
  ]

  const renderSidebarContent = (isMobile = false) => (
    <div className="flex flex-col justify-between h-full">
      <div className="p-5 space-y-6">
        {/* Logo & Brand */}
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
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
          {isMobile && (
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="size-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 hover:text-slate-900"
              aria-label="بستن منو"
            >
              <X className="size-5" />
            </button>
          )}
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
                onClick={() => isMobile && setMobileMenuOpen(false)}
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
        <Link href="/doctors" className="block" onClick={() => isMobile && setMobileMenuOpen(false)}>
          <Button size="sm" className="w-full bg-[#EA580C] hover:bg-[#D94E07] text-white text-xs font-bold rounded-xl shadow-xs py-2">
            افزودن مرکز درمانی
          </Button>
        </Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex overflow-x-hidden w-full max-w-full" dir="rtl">
      {/* ─── Mobile Drawer Overlay & Sidebar ─── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Drawer Sidebar Content */}
          <div className="relative w-72 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-250 border-l border-slate-200">
            {renderSidebarContent(true)}
          </div>
        </div>
      )}

      {/* ─── Desktop Sidebar (Hidden on mobile <768px) ─── */}
      <aside className="w-64 bg-white border-l border-slate-200/80 hidden md:flex flex-col justify-between shrink-0 shadow-xs z-20 sticky top-0 h-screen">
        {renderSidebarContent(false)}
      </aside>

      {/* ─── Main Content Area ─── */}
      <div className="flex-1 flex flex-col min-w-0 w-full overflow-x-hidden">
        {/* Top Navbar */}
        <header className="h-16 sm:h-20 bg-white/95 backdrop-blur-md border-b border-slate-200/70 px-4 sm:px-8 lg:px-10 flex items-center justify-between gap-3 sticky top-0 z-30 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          {/* Mobile Menu Button & Search Toggle */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden size-10 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              aria-label="باز کردن منو"
            >
              <Menu className="size-5" />
            </button>

            {/* Right: Search Capsule (Hidden on small mobile, visible on desktop) */}
            <div className="relative w-full max-w-xs lg:max-w-md hidden md:block">
              <Search className="size-4 text-slate-400 absolute end-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="جستجو در کاربران، مراکز، درخواست‌ها ..."
                className="w-full h-10 pe-10 ps-4 bg-slate-50 border border-slate-200/90 rounded-full text-xs text-slate-700 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D5C58]/20 focus:border-[#0D5C58] transition-all"
              />
            </div>

            {/* Mobile Brand Name on top header */}
            <div className="md:hidden flex items-center gap-1.5">
              <div className="size-8 rounded-xl bg-[#0D5C58] text-white flex items-center justify-center shadow-2xs">
                <ShieldPlus className="size-4.5" />
              </div>
              <span className="font-extrabold text-sm text-slate-900 tracking-tight">حامی‌کارت</span>
            </div>
          </div>

          {/* Left: Alerts, Date, and User Profile */}
          <div className="flex items-center gap-2.5 sm:gap-6 ms-auto">
            {/* Live Jalali Date & Time (Desktop only) */}
            <div className="hidden lg:flex flex-col text-left">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <Calendar className="size-3.5 text-[#0D5C58]" />
                <span>سه‌شنبه ۲۷ شهریور ۱۴۰۵</span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">آخرین بروزرسانی: امروز ۱۴:۳۰</span>
            </div>

            {/* Notification Bell */}
            <button className="size-9 sm:size-10 rounded-full bg-slate-50 border border-slate-200/70 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors relative shrink-0">
              <Bell className="size-4 sm:size-4.5" />
              <span className="size-2 rounded-full bg-[#EA580C] absolute top-2 end-2 sm:top-2.5 sm:end-2.5 ring-2 ring-white" />
            </button>

            {/* User Profile Capsule */}
            <Link
              href="/profile"
              className="flex items-center gap-2 sm:gap-3 ps-1.5 sm:ps-4 border-s border-slate-200/80 hover:opacity-85 transition-opacity cursor-pointer shrink-0"
            >
              <div className="size-9 sm:size-10 rounded-full bg-gradient-to-tr from-[#0D5C58] to-teal-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center shadow-xs shrink-0">
                م‌س
              </div>
              <div className="hidden sm:block text-right">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold text-slate-800">مدیر سیستم</span>
                  <ChevronDown className="size-3.5 text-slate-400" />
                </div>
                <span className="text-[11px] text-emerald-600 font-medium">سطح دسترسی کل</span>
              </div>
            </Link>
          </div>
        </header>

        {/* Page View Body */}
        <main className="p-4 sm:p-6 lg:p-10 flex-1 w-full max-w-full overflow-x-hidden">
          {children}
        </main>

        {/* Global Footer */}
        <footer className="px-4 sm:px-8 py-5 border-t border-slate-200/70 bg-white/70 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-right">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-600">حامی‌کارت</span>
            <span>•</span>
            <span>همراه سلامت، برای همه</span>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-3 sm:gap-5">
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
